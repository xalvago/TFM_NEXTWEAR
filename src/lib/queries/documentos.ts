import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Consultas de las páginas de Pedido y Albarán: reconstruyen la cadena
 * documental Pedido ↔ Albarán ↔ Factura desde cualquiera de sus extremos.
 *
 * Vínculos reales en BD:
 *  - albaranes.pedido_id            → pedido del albarán
 *  - facturas.pedido_id_ref         → pedido que cita la factura
 *  - facturas_albaranes             → albaranes que cubre cada factura (N:M)
 *  - casos_excepcion.{pedido,albaran,factura}_id → casos polimórficos
 */

export interface PedidoCab {
  pedido_id: string;
  estado: string | null;
  fecha_pedido: string | null;
  fecha_entrega_prevista: string | null;
  moneda: string | null;
  proveedor_id: string | null;
  razon_social: string | null;
  centro_coste_id: string | null;
  centro_nombre: string | null;
}

export interface AlbaranCab {
  albaran_id: string;
  estado: string | null;
  fecha_entrega: string | null;
  pedido_id: string | null;
  proveedor_id: string | null;
  razon_social: string | null;
  centro_coste_id: string | null;
  centro_nombre: string | null;
}

export interface FacturaRef {
  factura_id: string;
  numero_factura: string | null;
  estado: string | null;
  total_factura_eur: number | null;
  fecha_expedicion: string | null;
  es_nota_credito: boolean | null;
}

export interface AlbaranRefLite {
  albaran_id: string;
  estado: string | null;
  fecha_entrega: string | null;
}

export interface CasoRef {
  caso_id: string;
  tipo_excepcion: string | null;
  descripcion: string | null;
  estado_resolucion: string | null;
  requiere_intervencion_humana: boolean;
  factura_id: string | null;
  albaran_id: string | null;
  pedido_id: string | null;
}

export interface LineaPedidoCruce {
  sku: string;
  descripcion: string;
  cantidad_pedida: number;
  precio_unitario_acordado: number | null;
  cantidad_entregada: number;
}

export interface LineaAlbaran {
  sku: string;
  descripcion: string;
  cantidad_entregada: number;
}

type Proveedor = { razon_social: string | null } | null;
type Centro = { nombre: string | null } | null;

const FACTURA_REF_COLS =
  "factura_id, numero_factura, estado, total_factura_eur, fecha_expedicion, es_nota_credito";

const CASO_COLS =
  "caso_id, tipo_excepcion, descripcion, estado_resolucion, requiere_intervencion_humana, factura_id, albaran_id, pedido_id";

function dedupe<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Map<string, T>();
  for (const it of items) seen.set(key(it), it);
  return [...seen.values()];
}

// --- Pedido -------------------------------------------------------------------

export interface PedidoDetalle {
  pedido: PedidoCab;
  lineas: LineaPedidoCruce[];
  albaranes: AlbaranRefLite[];
  facturas: FacturaRef[];
  casos: CasoRef[];
}

export async function getPedidoDetalle(
  pedidoId: string
): Promise<PedidoDetalle | null> {
  const supabase = getSupabaseAdmin();

  const { data: p, error } = await supabase
    .from("pedidos")
    .select(
      "pedido_id, estado, fecha_pedido, fecha_entrega_prevista, moneda, proveedor_id, centro_coste_id, maestro_proveedores(razon_social), centros_coste(nombre)"
    )
    .eq("pedido_id", pedidoId)
    .maybeSingle();
  if (error) throw error;
  if (!p) return null;

  const [lineasRes, albaranesRes, facturasDirectasRes, casosRes, productosRes] =
    await Promise.all([
      supabase
        .from("pedidos_lineas")
        .select("sku, cantidad_pedida, precio_unitario_acordado")
        .eq("pedido_id", pedidoId)
        .order("sku"),
      supabase
        .from("albaranes")
        .select("albaran_id, estado, fecha_entrega")
        .eq("pedido_id", pedidoId)
        .order("fecha_entrega"),
      supabase
        .from("facturas")
        .select(FACTURA_REF_COLS)
        .eq("pedido_id_ref", pedidoId),
      supabase.from("casos_excepcion").select(CASO_COLS).eq("pedido_id", pedidoId),
      supabase.from("productos").select("sku, descripcion"),
    ]);
  for (const r of [lineasRes, albaranesRes, facturasDirectasRes, casosRes, productosRes]) {
    if (r.error) throw r.error;
  }

  const albaranes = (albaranesRes.data ?? []) as AlbaranRefLite[];
  const albIds = albaranes.map((a) => a.albaran_id);

  // Facturas que cubren estos albaranes aunque no citen el pedido; entregado por SKU.
  const [viaAlbRes, entregasRes] = albIds.length
    ? await Promise.all([
        supabase
          .from("facturas_albaranes")
          .select(`albaran_id, facturas(${FACTURA_REF_COLS})`)
          .in("albaran_id", albIds),
        supabase
          .from("albaranes_lineas")
          .select("albaran_id, sku, cantidad_entregada")
          .in("albaran_id", albIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (viaAlbRes.error) throw viaAlbRes.error;
  if (entregasRes.error) throw entregasRes.error;

  const viaAlb = (viaAlbRes.data ?? [])
    .map((r) => (r as unknown as { facturas: FacturaRef | null }).facturas)
    .filter((f): f is FacturaRef => f !== null);
  const facturas = dedupe(
    [...((facturasDirectasRes.data ?? []) as FacturaRef[]), ...viaAlb],
    (f) => f.factura_id
  ).sort((a, b) => (a.fecha_expedicion ?? "").localeCompare(b.fecha_expedicion ?? ""));

  const entregado = new Map<string, number>();
  for (const e of entregasRes.data ?? []) {
    entregado.set(e.sku, (entregado.get(e.sku) ?? 0) + (e.cantidad_entregada ?? 0));
  }
  const descBySku = new Map((productosRes.data ?? []).map((x) => [x.sku, x.descripcion]));

  return {
    pedido: {
      pedido_id: p.pedido_id,
      estado: p.estado,
      fecha_pedido: p.fecha_pedido,
      fecha_entrega_prevista: p.fecha_entrega_prevista,
      moneda: p.moneda,
      proveedor_id: p.proveedor_id,
      razon_social:
        (p.maestro_proveedores as unknown as Proveedor)?.razon_social ?? null,
      centro_coste_id: p.centro_coste_id,
      centro_nombre: (p.centros_coste as unknown as Centro)?.nombre ?? null,
    },
    lineas: (lineasRes.data ?? []).map((l) => ({
      sku: l.sku,
      descripcion: descBySku.get(l.sku) ?? l.sku,
      cantidad_pedida: l.cantidad_pedida,
      precio_unitario_acordado: l.precio_unitario_acordado,
      cantidad_entregada: entregado.get(l.sku) ?? 0,
    })),
    albaranes,
    facturas,
    casos: (casosRes.data ?? []) as CasoRef[],
  };
}

// --- Albarán ------------------------------------------------------------------

export interface AlbaranDetalle {
  albaran: AlbaranCab;
  lineas: LineaAlbaran[];
  pedido: {
    pedido_id: string;
    estado: string | null;
    fecha_pedido: string | null;
  } | null;
  facturas: FacturaRef[];
  casos: CasoRef[];
}

export async function getAlbaranDetalle(
  albaranId: string
): Promise<AlbaranDetalle | null> {
  const supabase = getSupabaseAdmin();

  const { data: a, error } = await supabase
    .from("albaranes")
    .select(
      "albaran_id, estado, fecha_entrega, pedido_id, proveedor_id, centro_coste_id, maestro_proveedores(razon_social), centros_coste(nombre)"
    )
    .eq("albaran_id", albaranId)
    .maybeSingle();
  if (error) throw error;
  if (!a) return null;

  const [lineasRes, pedidoRes, viaRes, casosRes, productosRes] = await Promise.all([
    supabase
      .from("albaranes_lineas")
      .select("sku, cantidad_entregada")
      .eq("albaran_id", albaranId)
      .order("sku"),
    a.pedido_id
      ? supabase
          .from("pedidos")
          .select("pedido_id, estado, fecha_pedido")
          .eq("pedido_id", a.pedido_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("facturas_albaranes")
      .select(`facturas(${FACTURA_REF_COLS})`)
      .eq("albaran_id", albaranId),
    supabase.from("casos_excepcion").select(CASO_COLS).eq("albaran_id", albaranId),
    supabase.from("productos").select("sku, descripcion"),
  ]);
  for (const r of [lineasRes, pedidoRes, viaRes, casosRes, productosRes]) {
    if (r.error) throw r.error;
  }

  const descBySku = new Map((productosRes.data ?? []).map((x) => [x.sku, x.descripcion]));
  const facturas = dedupe(
    (viaRes.data ?? [])
      .map((r) => (r as unknown as { facturas: FacturaRef | null }).facturas)
      .filter((f): f is FacturaRef => f !== null),
    (f) => f.factura_id
  );

  return {
    albaran: {
      albaran_id: a.albaran_id,
      estado: a.estado,
      fecha_entrega: a.fecha_entrega,
      pedido_id: a.pedido_id,
      proveedor_id: a.proveedor_id,
      razon_social:
        (a.maestro_proveedores as unknown as Proveedor)?.razon_social ?? null,
      centro_coste_id: a.centro_coste_id,
      centro_nombre: (a.centros_coste as unknown as Centro)?.nombre ?? null,
    },
    lineas: (lineasRes.data ?? []).map((l) => ({
      sku: l.sku,
      descripcion: descBySku.get(l.sku) ?? l.sku,
      cantidad_entregada: l.cantidad_entregada,
    })),
    pedido: (pedidoRes.data as AlbaranDetalle["pedido"]) ?? null,
    facturas,
    casos: (casosRes.data ?? []) as CasoRef[],
  };
}
