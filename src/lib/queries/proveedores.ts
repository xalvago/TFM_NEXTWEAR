import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Consultas de la pestaña "Proveedores" (ficha maestra).
 *
 * Dataset pequeño (10 proveedores): agregamos el gasto/saldo por proveedor en
 * JS a partir de `facturas`, igual que la vista ejecutiva (regla: excluir
 * `anulada`, sumar siempre en `_eur`).
 */

export interface ProveedorRow {
  proveedor_id: string;
  razon_social: string;
  nif: string | null;
  pais: string | null;
  moneda_facturacion: string;
  canal_recepcion: string | null;
  portal_url: string | null;
  email_recepcion_facturas: string | null;
  categorias_habituales: string | null;
  forma_pago: string | null;
  iban: string | null;
  iban_fecha_actualizacion: string | null;
  activo: boolean;
  numFacturas: number;
  gastoTotalEur: number;
  saldoPendienteEur: number;
}

export async function getProveedores(): Promise<ProveedorRow[]> {
  const supabase = getSupabaseAdmin();

  const [proveedoresRes, facturasRes] = await Promise.all([
    supabase
      .from("maestro_proveedores")
      .select(
        "proveedor_id, razon_social, nif, pais, moneda_facturacion, canal_recepcion, portal_url, email_recepcion_facturas, categorias_habituales, forma_pago, iban, iban_fecha_actualizacion, activo"
      )
      .order("razon_social"),
    supabase
      .from("facturas")
      .select("proveedor_id, total_factura_eur, saldo_pendiente_eur, estado"),
  ]);

  if (proveedoresRes.error) throw proveedoresRes.error;
  if (facturasRes.error) throw facturasRes.error;

  const agregados = new Map<
    string,
    { numFacturas: number; gastoTotalEur: number; saldoPendienteEur: number }
  >();
  for (const f of facturasRes.data ?? []) {
    if (!f.proveedor_id || f.estado === "anulada") continue;
    const acc = agregados.get(f.proveedor_id) ?? {
      numFacturas: 0,
      gastoTotalEur: 0,
      saldoPendienteEur: 0,
    };
    acc.numFacturas += 1;
    acc.gastoTotalEur += f.total_factura_eur ?? 0;
    acc.saldoPendienteEur += f.saldo_pendiente_eur ?? 0;
    agregados.set(f.proveedor_id, acc);
  }

  return (proveedoresRes.data ?? []).map((p) => {
    const acc = agregados.get(p.proveedor_id);
    return {
      proveedor_id: p.proveedor_id,
      razon_social: p.razon_social,
      nif: p.nif,
      pais: p.pais,
      moneda_facturacion: p.moneda_facturacion,
      canal_recepcion: p.canal_recepcion,
      portal_url: p.portal_url,
      email_recepcion_facturas: p.email_recepcion_facturas,
      categorias_habituales: p.categorias_habituales,
      forma_pago: p.forma_pago,
      iban: p.iban,
      iban_fecha_actualizacion: p.iban_fecha_actualizacion,
      activo: p.activo ?? true,
      numFacturas: acc?.numFacturas ?? 0,
      gastoTotalEur: acc?.gastoTotalEur ?? 0,
      saldoPendienteEur: acc?.saldoPendienteEur ?? 0,
    };
  });
}
