import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Consultas de la sección "Pagos" (tesorería) dentro de Facturas y conciliación.
 * facturas.numero_factura / razon_social_proveedor ya están denormalizados en
 * facturas, así que no hace falta un segundo JOIN a maestro_proveedores.
 */

export interface PagosFiltros {
  estadoPago?: string;
}

export interface PagoListItem {
  pago_id: string;
  factura_id: string;
  numero_factura: string | null;
  razon_social: string | null;
  fecha_pago: string | null;
  fecha_vencimiento: string | null;
  importe_eur: number | null;
  estado_pago: string | null;
  es_pago_parcial: boolean | null;
  medio_pago: string | null;
}

type EmbeddedFactura = {
  numero_factura: string | null;
  razon_social_proveedor: string | null;
} | null;

export async function getPagos(
  filtros: PagosFiltros = {}
): Promise<PagoListItem[]> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("pagos")
    .select(
      "pago_id, factura_id, fecha_pago, fecha_vencimiento, importe_eur, estado_pago, es_pago_parcial, medio_pago, facturas(numero_factura, razon_social_proveedor)"
    )
    .order("fecha_pago", { ascending: false, nullsFirst: false });

  if (filtros.estadoPago) query = query.eq("estado_pago", filtros.estadoPago);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((p) => {
    const fac = p.facturas as unknown as EmbeddedFactura;
    return {
      pago_id: p.pago_id,
      factura_id: p.factura_id,
      numero_factura: fac?.numero_factura ?? null,
      razon_social: fac?.razon_social_proveedor ?? null,
      fecha_pago: p.fecha_pago,
      fecha_vencimiento: p.fecha_vencimiento,
      importe_eur: p.importe_eur,
      estado_pago: p.estado_pago,
      es_pago_parcial: p.es_pago_parcial,
      medio_pago: p.medio_pago,
    };
  });
}
