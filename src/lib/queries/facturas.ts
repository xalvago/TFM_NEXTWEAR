import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Consultas de la pestaña "Facturas y conciliación" (FASE 2).
 *
 * A diferencia de la vista ejecutiva (que agrega en JS), aquí filtramos en la
 * base con el query builder de Supabase: es lo natural para un listado paginable
 * y demuestra filtrado real en servidor. Todo es solo lectura.
 */

export interface FacturasFiltros {
  estado?: string;
  proveedorId?: string;
  moneda?: string;
  desde?: string; // ISO date
  hasta?: string; // ISO date
  q?: string; // búsqueda por nº factura
}

export interface FacturaListItem {
  factura_id: string;
  numero_factura: string | null;
  fecha_expedicion: string | null;
  moneda_original: string | null;
  total_factura_eur: number | null;
  saldo_pendiente_eur: number | null;
  estado: string | null;
  es_nota_credito: boolean | null;
  proveedor_id: string | null;
  razon_social: string | null;
}

type EmbeddedProveedor = { razon_social: string | null } | null;

export async function getFacturas(
  filtros: FacturasFiltros = {}
): Promise<FacturaListItem[]> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("facturas")
    .select(
      "factura_id, numero_factura, fecha_expedicion, moneda_original, total_factura_eur, saldo_pendiente_eur, estado, es_nota_credito, proveedor_id, maestro_proveedores(razon_social)"
    )
    .order("fecha_expedicion", { ascending: false });

  if (filtros.estado) query = query.eq("estado", filtros.estado);
  if (filtros.proveedorId) query = query.eq("proveedor_id", filtros.proveedorId);
  if (filtros.moneda) query = query.eq("moneda_original", filtros.moneda);
  if (filtros.desde) query = query.gte("fecha_expedicion", filtros.desde);
  if (filtros.hasta) query = query.lte("fecha_expedicion", filtros.hasta);
  if (filtros.q) query = query.ilike("numero_factura", `%${filtros.q}%`);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((f) => {
    // El embed FK lo resuelve PostgREST en runtime; los tipos locales no llevan
    // la metadata de relaciones, de ahí el cast por unknown.
    const prov = f.maestro_proveedores as unknown as EmbeddedProveedor;
    return {
      factura_id: f.factura_id,
      numero_factura: f.numero_factura,
      fecha_expedicion: f.fecha_expedicion,
      moneda_original: f.moneda_original,
      total_factura_eur: f.total_factura_eur,
      saldo_pendiente_eur: f.saldo_pendiente_eur,
      estado: f.estado,
      es_nota_credito: f.es_nota_credito,
      proveedor_id: f.proveedor_id,
      razon_social: prov?.razon_social ?? null,
    };
  });
}

export interface ProveedorOption {
  proveedor_id: string;
  razon_social: string;
}

export async function getProveedoresOptions(): Promise<ProveedorOption[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("maestro_proveedores")
    .select("proveedor_id, razon_social")
    .order("razon_social");
  if (error) throw error;
  return (data ?? []) as ProveedorOption[];
}

// --- Panel de excepciones -----------------------------------------------------

export interface CasoExcepcionItem {
  caso_id: string;
  tipo_excepcion: string | null;
  descripcion: string | null;
  factura_id: string | null;
  albaran_id: string | null;
  pedido_id: string | null;
  estado_resolucion: string | null;
  // Contexto del documento afectado (para el enlace/etiqueta):
  numero_factura: string | null;
  estado_factura: string | null;
  target: "factura" | "albaran" | "pedido" | "desconocido";
}

export async function getCasosExcepcion(
  tipo?: string
): Promise<CasoExcepcionItem[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("casos_excepcion")
    .select(
      "caso_id, tipo_excepcion, descripcion, factura_id, albaran_id, pedido_id, estado_resolucion, facturas(numero_factura, estado)"
    )
    .order("caso_id");
  if (tipo) query = query.eq("tipo_excepcion", tipo);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((c) => {
    const fac = c.facturas as unknown as {
      numero_factura: string | null;
      estado: string | null;
    } | null;
    const target: CasoExcepcionItem["target"] = c.factura_id
      ? "factura"
      : c.albaran_id
        ? "albaran"
        : c.pedido_id
          ? "pedido"
          : "desconocido";
    return {
      caso_id: c.caso_id,
      tipo_excepcion: c.tipo_excepcion,
      descripcion: c.descripcion,
      factura_id: c.factura_id,
      albaran_id: c.albaran_id,
      pedido_id: c.pedido_id,
      estado_resolucion: c.estado_resolucion,
      numero_factura: fac?.numero_factura ?? null,
      estado_factura: fac?.estado ?? null,
      target,
    };
  });
}

/** Conteo de casos por tipo (para chips del panel de excepciones). */
export async function getCasosPorTipo(): Promise<Record<string, number>> {
  const casos = await getCasosExcepcion();
  const counts: Record<string, number> = {};
  for (const c of casos) {
    const t = c.tipo_excepcion ?? "desconocido";
    counts[t] = (counts[t] ?? 0) + 1;
  }
  return counts;
}

// --- Detalle de factura -------------------------------------------------------

export interface FacturaLineaDetalle {
  linea_id: string;
  sku: string | null;
  descripcion: string | null;
  centro_coste_id: string | null;
  cantidad: number | null;
  precio_unitario_original: number | null;
  precio_unitario_eur: number | null;
  descuento_pct: number | null;
  total_linea_original: number | null;
  total_linea_eur: number | null;
  tipo_iva_linea: number | null;
  codigo_hs: string | null;
  flag_revision: boolean | null;
  motivo_flag: string | null;
}

export interface AlbaranRef {
  albaran_id: string;
  estado: string | null;
  fecha_entrega: string | null;
}

export interface PedidoRef {
  pedido_id: string;
  estado: string | null;
  fecha_pedido: string | null;
  fecha_entrega_prevista: string | null;
  moneda: string | null;
}

export interface AsientoLineaDetalle {
  linea_num: number;
  cuenta: string;
  cuenta_descripcion: string | null;
  centro_coste_id: string | null;
  debe_eur: number | null;
  haber_eur: number | null;
  concepto: string | null;
}

export interface AsientoDetalle {
  asiento_id: string;
  tipo_asiento: string | null;
  fecha_asiento: string | null;
  estado_registro: string | null;
  id_erp_externo: string | null;
  fecha_registro: string | null;
  lineas: AsientoLineaDetalle[];
}

export interface FacturaDetalle {
  factura: {
    factura_id: string;
    numero_factura: string | null;
    serie: string | null;
    fecha_expedicion: string | null;
    fecha_vencimiento: string | null;
    estado: string | null;
    moneda_original: string | null;
    base_imponible_original: number | null;
    cuota_iva_original: number | null;
    total_factura_original: number | null;
    base_imponible_eur: number | null;
    cuota_iva_eur: number | null;
    total_factura_eur: number | null;
    saldo_pendiente_eur: number | null;
    tipo_cambio_aplicado: number | null;
    fecha_tipo_cambio: string | null;
    es_nota_credito: boolean | null;
    factura_original_id: string | null;
    motivo_excepcion: string | null;
    proveedor_id: string | null;
    razon_social_proveedor: string | null;
    nif_proveedor: string | null;
    nif_cliente: string | null;
    direccion_cliente: string | null;
    razon_social_cliente: string | null;
    forma_pago: string | null;
    iban_proveedor: string | null;
    pedido_id_ref: string | null;
    albaran_ids_ref: string | null;
    // Factura de exportación (proveedores asiáticos): nullable, vacío en nacional.
    id_fiscal_extranjero: string | null;
    tipo_id_fiscal: string | null;
    swift_bic: string | null;
    banco_corresponsal: string | null;
    incoterm: string | null;
    pais_origen_mercancia: string | null;
    regimen_iva: string | null;
  };
  lineas: FacturaLineaDetalle[];
  pedido: PedidoRef | null;
  albaranes: AlbaranRef[];
  casos: CasoExcepcionItem[];
  asientos: AsientoDetalle[];
}

export async function getFacturaDetalle(
  facturaId: string
): Promise<FacturaDetalle | null> {
  const supabase = getSupabaseAdmin();

  const { data: factura, error: facturaError } = await supabase
    .from("facturas")
    .select("*")
    .eq("factura_id", facturaId)
    .maybeSingle();
  if (facturaError) throw facturaError;
  if (!factura) return null;

  const [lineasRes, pedidoRes, albaranesRes, casosRes, asientosRes] = await Promise.all([
    supabase
      .from("facturas_lineas")
      .select(
        "linea_id, sku, descripcion, centro_coste_id, cantidad, precio_unitario_original, precio_unitario_eur, descuento_pct, total_linea_original, total_linea_eur, tipo_iva_linea, codigo_hs, flag_revision, motivo_flag"
      )
      .eq("factura_id", facturaId)
      .order("linea_id"),
    factura.pedido_id_ref
      ? supabase
          .from("pedidos")
          .select(
            "pedido_id, estado, fecha_pedido, fecha_entrega_prevista, moneda"
          )
          .eq("pedido_id", factura.pedido_id_ref)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("facturas_albaranes")
      .select("albaranes(albaran_id, estado, fecha_entrega)")
      .eq("factura_id", facturaId),
    supabase
      .from("casos_excepcion")
      .select(
        "caso_id, tipo_excepcion, descripcion, factura_id, albaran_id, pedido_id, estado_resolucion"
      )
      .eq("factura_id", facturaId),
    supabase
      .from("asientos_contables")
      .select(
        "asiento_id, tipo_asiento, fecha_asiento, estado_registro, id_erp_externo, fecha_registro, asientos_lineas(linea_num, cuenta, centro_coste_id, debe_eur, haber_eur, concepto, cuentas_contables(descripcion))"
      )
      .eq("factura_id", facturaId)
      .order("asiento_id"),
  ]);

  for (const res of [lineasRes, pedidoRes, albaranesRes, casosRes, asientosRes]) {
    if (res.error) throw res.error;
  }

  type AsientoLineaRow = {
    linea_num: number;
    cuenta: string;
    centro_coste_id: string | null;
    debe_eur: number | null;
    haber_eur: number | null;
    concepto: string | null;
    cuentas_contables: { descripcion: string | null } | null;
  };

  const asientos: AsientoDetalle[] = (asientosRes.data ?? []).map((a) => {
    const asientoLineas = (a.asientos_lineas ?? []) as unknown as AsientoLineaRow[];
    return {
      asiento_id: a.asiento_id,
      tipo_asiento: a.tipo_asiento,
      fecha_asiento: a.fecha_asiento,
      estado_registro: a.estado_registro,
      id_erp_externo: a.id_erp_externo,
      fecha_registro: a.fecha_registro,
      lineas: asientoLineas
        .sort((x, y) => x.linea_num - y.linea_num)
        .map((l) => ({
          linea_num: l.linea_num,
          cuenta: l.cuenta,
          cuenta_descripcion: l.cuentas_contables?.descripcion ?? null,
          centro_coste_id: l.centro_coste_id,
          debe_eur: l.debe_eur,
          haber_eur: l.haber_eur,
          concepto: l.concepto,
        })),
    };
  });

  const casos: CasoExcepcionItem[] = (casosRes.data ?? []).map((c) => ({
    caso_id: c.caso_id,
    tipo_excepcion: c.tipo_excepcion,
    descripcion: c.descripcion,
    factura_id: c.factura_id,
    albaran_id: c.albaran_id,
    pedido_id: c.pedido_id,
    estado_resolucion: c.estado_resolucion,
    numero_factura: factura.numero_factura,
    estado_factura: factura.estado,
    target: "factura",
  }));

  return {
    factura: {
      factura_id: factura.factura_id,
      numero_factura: factura.numero_factura,
      serie: factura.serie,
      fecha_expedicion: factura.fecha_expedicion,
      fecha_vencimiento: factura.fecha_vencimiento,
      estado: factura.estado,
      moneda_original: factura.moneda_original,
      base_imponible_original: factura.base_imponible_original,
      cuota_iva_original: factura.cuota_iva_original,
      total_factura_original: factura.total_factura_original,
      base_imponible_eur: factura.base_imponible_eur,
      cuota_iva_eur: factura.cuota_iva_eur,
      total_factura_eur: factura.total_factura_eur,
      saldo_pendiente_eur: factura.saldo_pendiente_eur,
      tipo_cambio_aplicado: factura.tipo_cambio_aplicado,
      fecha_tipo_cambio: factura.fecha_tipo_cambio,
      es_nota_credito: factura.es_nota_credito,
      factura_original_id: factura.factura_original_id,
      motivo_excepcion: factura.motivo_excepcion,
      proveedor_id: factura.proveedor_id,
      razon_social_proveedor: factura.razon_social_proveedor,
      nif_proveedor: factura.nif_proveedor,
      nif_cliente: factura.nif_cliente,
      direccion_cliente: factura.direccion_cliente,
      razon_social_cliente: factura.razon_social_cliente,
      forma_pago: factura.forma_pago,
      iban_proveedor: factura.iban_proveedor,
      pedido_id_ref: factura.pedido_id_ref,
      albaran_ids_ref: factura.albaran_ids_ref,
      id_fiscal_extranjero: factura.id_fiscal_extranjero,
      tipo_id_fiscal: factura.tipo_id_fiscal,
      swift_bic: factura.swift_bic,
      banco_corresponsal: factura.banco_corresponsal,
      incoterm: factura.incoterm,
      pais_origen_mercancia: factura.pais_origen_mercancia,
      regimen_iva: factura.regimen_iva,
    },
    lineas: (lineasRes.data ?? []) as FacturaLineaDetalle[],
    pedido: (pedidoRes.data as PedidoRef | null) ?? null,
    albaranes: (albaranesRes.data ?? [])
      .map((r) => r.albaranes as unknown as AlbaranRef | null)
      .filter((a): a is AlbaranRef => a !== null),
    casos,
    asientos,
  };
}
