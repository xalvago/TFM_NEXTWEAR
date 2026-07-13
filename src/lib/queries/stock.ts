import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Consultas de "Stock e inventario" (FASE 3).
 *
 * `stock_actual` es una vista de solo lectura (sku, centro_coste_id,
 * cantidad_disponible, fecha_ultima_actualizacion) — NO trae valor monetario.
 * Para valorar el inventario cruzamos con `productos.coste_unitario` (EUR),
 * tal como documenta CLAUDE.md. No se escribe nunca en `stock_actual`.
 */

export interface StockFiltros {
  categoria?: string;
  centroId?: string;
}

export interface StockRow {
  sku: string;
  descripcion: string;
  categoria: string | null;
  centroId: string;
  centroNombre: string;
  centroTipo: string;
  cantidadDisponible: number;
  costeUnitarioEur: number;
  valorEur: number;
  fechaActualizacion: string | null;
}

export interface CategoriaOption {
  categoria: string;
}

export async function getCategoriasOptions(): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("productos")
    .select("categoria")
    .not("categoria", "is", null);
  if (error) throw error;
  const set = new Set((data ?? []).map((d) => d.categoria as string));
  return [...set].sort();
}

export interface CentroOption {
  centro_coste_id: string;
  nombre: string;
}

export async function getCentrosOptions(): Promise<CentroOption[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("centros_coste")
    .select("centro_coste_id, nombre")
    .order("nombre");
  if (error) throw error;
  return (data ?? []) as CentroOption[];
}

export async function getStockRows(
  filtros: StockFiltros = {}
): Promise<StockRow[]> {
  const supabase = getSupabaseAdmin();

  const [stockRes, productosRes, centrosRes] = await Promise.all([
    supabase
      .from("stock_actual")
      .select("sku, centro_coste_id, cantidad_disponible, fecha_ultima_actualizacion"),
    supabase
      .from("productos")
      .select("sku, descripcion, categoria, coste_unitario"),
    supabase.from("centros_coste").select("centro_coste_id, nombre, tipo"),
  ]);
  for (const r of [stockRes, productosRes, centrosRes]) {
    if (r.error) throw r.error;
  }

  const productoBySku = new Map(
    (productosRes.data ?? []).map((p) => [p.sku, p])
  );
  const centroById = new Map(
    (centrosRes.data ?? []).map((c) => [c.centro_coste_id, c])
  );

  let rows: StockRow[] = (stockRes.data ?? [])
    .filter((s) => s.sku && s.centro_coste_id)
    .map((s) => {
      const producto = productoBySku.get(s.sku!);
      const centro = centroById.get(s.centro_coste_id!);
      const cantidad = s.cantidad_disponible ?? 0;
      const coste = producto?.coste_unitario ?? 0;
      return {
        sku: s.sku!,
        descripcion: producto?.descripcion ?? s.sku!,
        categoria: producto?.categoria ?? null,
        centroId: s.centro_coste_id!,
        centroNombre: centro?.nombre ?? s.centro_coste_id!,
        centroTipo: centro?.tipo ?? "desconocido",
        cantidadDisponible: cantidad,
        costeUnitarioEur: coste,
        valorEur: round2(cantidad * coste),
        fechaActualizacion: s.fecha_ultima_actualizacion,
      };
    });

  if (filtros.categoria) {
    rows = rows.filter((r) => r.categoria === filtros.categoria);
  }
  if (filtros.centroId) {
    rows = rows.filter((r) => r.centroId === filtros.centroId);
  }

  rows.sort((a, b) => a.descripcion.localeCompare(b.descripcion) || a.centroNombre.localeCompare(b.centroNombre));
  return rows;
}

// --- Previsión de reposición ---------------------------------------------------

export interface ReposicionRow {
  sku: string;
  descripcion: string;
  pedidoId: string;
  centroNombre: string;
  estado: string;
  fechaEntregaPrevista: string | null;
  cantidadPedida: number;
  cantidadPendiente: number; // pedida - ya entregada (vía albaranes_lineas)
}

/**
 * Cruce con pedidos abiertos/parciales: cuánto entrará y de qué SKU.
 * cantidad_pendiente = cantidad_pedida - suma de cantidad_entregada en
 * albaranes ligados a ese pedido (para el mismo SKU).
 */
export async function getReposicionPrevista(): Promise<ReposicionRow[]> {
  const supabase = getSupabaseAdmin();

  const [pedidosRes, lineasRes, productosRes, centrosRes, albaranesRes] =
    await Promise.all([
      supabase
        .from("pedidos")
        .select("pedido_id, estado, fecha_entrega_prevista, centro_coste_id")
        .in("estado", ["abierto", "parcialmente_recibido"]),
      supabase
        .from("pedidos_lineas")
        .select("pedido_id, sku, cantidad_pedida"),
      supabase.from("productos").select("sku, descripcion"),
      supabase.from("centros_coste").select("centro_coste_id, nombre"),
      supabase.from("albaranes").select("albaran_id, pedido_id"),
    ]);
  for (const r of [pedidosRes, lineasRes, productosRes, centrosRes, albaranesRes]) {
    if (r.error) throw r.error;
  }

  const pedidoIds = (pedidosRes.data ?? []).map((p) => p.pedido_id);
  const albaranesDePedido = new Map<string, string[]>();
  for (const a of albaranesRes.data ?? []) {
    if (!a.pedido_id || !pedidoIds.includes(a.pedido_id)) continue;
    const arr = albaranesDePedido.get(a.pedido_id) ?? [];
    arr.push(a.albaran_id);
    albaranesDePedido.set(a.pedido_id, arr);
  }
  const albaranIds = [...albaranesDePedido.values()].flat();

  const { data: albLineasData, error: albLineasErr } = albaranIds.length
    ? await supabase
        .from("albaranes_lineas")
        .select("albaran_id, sku, cantidad_entregada")
        .in("albaran_id", albaranIds)
    : { data: [], error: null };
  if (albLineasErr) throw albLineasErr;

  // Entregado por (pedido_id, sku)
  const entregadoPorPedidoSku = new Map<string, number>();
  const albaranToPedido = new Map<string, string>();
  for (const [pedidoId, albs] of albaranesDePedido) {
    for (const albId of albs) albaranToPedido.set(albId, pedidoId);
  }
  for (const l of albLineasData ?? []) {
    const pedidoId = albaranToPedido.get(l.albaran_id);
    if (!pedidoId || !l.sku) continue;
    const key = `${pedidoId}::${l.sku}`;
    entregadoPorPedidoSku.set(
      key,
      (entregadoPorPedidoSku.get(key) ?? 0) + (l.cantidad_entregada ?? 0)
    );
  }

  const pedidoById = new Map((pedidosRes.data ?? []).map((p) => [p.pedido_id, p]));
  const productoBySku = new Map((productosRes.data ?? []).map((p) => [p.sku, p]));
  const centroById = new Map(
    (centrosRes.data ?? []).map((c) => [c.centro_coste_id, c])
  );

  const rows: ReposicionRow[] = (lineasRes.data ?? [])
    .filter((l) => pedidoById.has(l.pedido_id))
    .map((l) => {
      const pedido = pedidoById.get(l.pedido_id)!;
      const producto = productoBySku.get(l.sku);
      const centro = pedido.centro_coste_id
        ? centroById.get(pedido.centro_coste_id)
        : undefined;
      const entregado =
        entregadoPorPedidoSku.get(`${l.pedido_id}::${l.sku}`) ?? 0;
      const pendiente = Math.max(0, (l.cantidad_pedida ?? 0) - entregado);
      return {
        sku: l.sku,
        descripcion: producto?.descripcion ?? l.sku,
        pedidoId: l.pedido_id,
        centroNombre: centro?.nombre ?? pedido.centro_coste_id ?? "—",
        estado: pedido.estado ?? "—",
        fechaEntregaPrevista: pedido.fecha_entrega_prevista,
        cantidadPedida: l.cantidad_pedida ?? 0,
        cantidadPendiente: pendiente,
      };
    })
    .filter((r) => r.cantidadPendiente > 0)
    .sort((a, b) => {
      const da = a.fechaEntregaPrevista ?? "9999";
      const db = b.fechaEntregaPrevista ?? "9999";
      return da.localeCompare(db);
    });

  return rows;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
