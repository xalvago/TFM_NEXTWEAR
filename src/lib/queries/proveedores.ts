import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { ESTADOS_EXCLUIDOS_GASTO } from "@/lib/finance";

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
  direccion_sede: string | null;
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
  numEnExcepcion: number;
  importeExcepcionEur: number;
  numPedidos: number;
  pedidosVivos: number; // abiertos + parcialmente recibidos
}

export async function getProveedores(): Promise<ProveedorRow[]> {
  const supabase = getSupabaseAdmin();

  const [proveedoresRes, facturasRes, pedidosRes] = await Promise.all([
    supabase
      .from("maestro_proveedores")
      .select(
        "proveedor_id, razon_social, nif, pais, direccion_sede, moneda_facturacion, canal_recepcion, portal_url, email_recepcion_facturas, categorias_habituales, forma_pago, iban, iban_fecha_actualizacion, activo"
      )
      .order("razon_social"),
    supabase
      .from("facturas")
      .select("proveedor_id, total_factura_eur, saldo_pendiente_eur, estado"),
    supabase.from("pedidos").select("proveedor_id, estado"),
  ]);

  if (proveedoresRes.error) throw proveedoresRes.error;
  if (facturasRes.error) throw facturasRes.error;
  if (pedidosRes.error) throw pedidosRes.error;

  const agregados = new Map<
    string,
    {
      numFacturas: number;
      gastoTotalEur: number;
      saldoPendienteEur: number;
      numEnExcepcion: number;
      importeExcepcionEur: number;
    }
  >();
  for (const f of facturasRes.data ?? []) {
    // Sin anuladas ni cargas en curso del robot (mismo criterio que la vista ejecutiva).
    if (!f.proveedor_id || ESTADOS_EXCLUIDOS_GASTO.includes(f.estado ?? "")) continue;
    const acc = agregados.get(f.proveedor_id) ?? {
      numFacturas: 0,
      gastoTotalEur: 0,
      saldoPendienteEur: 0,
      numEnExcepcion: 0,
      importeExcepcionEur: 0,
    };
    acc.numFacturas += 1;
    if (f.estado === "en_excepcion") {
      acc.numEnExcepcion += 1;
      acc.importeExcepcionEur += f.total_factura_eur ?? 0;
    }
    acc.gastoTotalEur += f.total_factura_eur ?? 0;
    acc.saldoPendienteEur += f.saldo_pendiente_eur ?? 0;
    agregados.set(f.proveedor_id, acc);
  }

  const pedidosPorProv = new Map<string, { n: number; vivos: number }>();
  for (const pd of pedidosRes.data ?? []) {
    if (!pd.proveedor_id) continue;
    const acc = pedidosPorProv.get(pd.proveedor_id) ?? { n: 0, vivos: 0 };
    acc.n += 1;
    if (pd.estado === "abierto" || pd.estado === "parcialmente_recibido") acc.vivos += 1;
    pedidosPorProv.set(pd.proveedor_id, acc);
  }

  return (proveedoresRes.data ?? []).map((p) => {
    const acc = agregados.get(p.proveedor_id);
    return {
      proveedor_id: p.proveedor_id,
      razon_social: p.razon_social,
      nif: p.nif,
      pais: p.pais,
      direccion_sede: p.direccion_sede,
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
      numEnExcepcion: acc?.numEnExcepcion ?? 0,
      importeExcepcionEur: acc?.importeExcepcionEur ?? 0,
      numPedidos: pedidosPorProv.get(p.proveedor_id)?.n ?? 0,
      pedidosVivos: pedidosPorProv.get(p.proveedor_id)?.vivos ?? 0,
    };
  });
}
