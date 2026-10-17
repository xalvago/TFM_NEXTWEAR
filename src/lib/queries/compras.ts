import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { ESTADOS_EXCLUIDOS_GASTO, anioDe } from "@/lib/finance";
import type { ExecFiltros } from "@/lib/queries/executive";

/**
 * Cadena Pedido → Albarán → Factura en UNIDADES (fase 3 de la vista ejecutiva).
 *
 * Cohorte: los pedidos que pasan los filtros (año de `fecha_pedido`, proveedor,
 * país y canal del proveedor, moneda del pedido). Para esos pedidos se suman:
 *   - pedidas   = pedidos_lineas.cantidad_pedida
 *   - recibidas = albaranes_lineas.cantidad_entregada (albaranes con ese pedido_id)
 *   - facturadas = facturas_lineas.cantidad de facturas no-NC y no excluidas cuyo
 *     pedido_id_ref apunta a esos pedidos.
 * Así las tres cifras hablan de los MISMOS pedidos. Facturas sin pedido_id_ref
 * (excepción «sin_pedido») no entran en la cadena.
 *
 * Importes de pedido: no se calculan (precio_unitario_acordado está en la moneda
 * del pedido); el dinero se muestra solo desde facturas, en EUR.
 */

export interface CadenaTotales {
  numPedidos: number;
  numSkus: number;
  pedidas: number;
  recibidas: number;
  facturadas: number;
  pendienteRecibir: number; // suma de max(0, pedida − recibida) por pedido/SKU en pedidos vivos
  tasaRecepcion: number; // recibidas / pedidas (0..1)
  tasaFacturacion: number; // facturadas / recibidas (0..1)
  porEstado: Record<string, number>;
}

export interface CadenaProveedor {
  proveedorId: string;
  razonSocial: string;
  pedidas: number;
  recibidas: number;
  facturadas: number;
  tasaRecepcion: number;
  pedidosVivos: number; // abiertos + parcialmente recibidos
}

export interface Plazo {
  numAlbaranes: number;
  aTiempo: number;
  conRetraso: number;
  diasRetrasoMedio: number; // solo sobre los que llegan tarde
}

export interface CompraCategoria {
  categoria: string;
  unidadesPedidas: number;
  gastoFacturadoEur: number; // total_linea_eur (sin IVA) de facturas de la cohorte
}

export interface CompraSku {
  sku: string; // "Sin SKU" para líneas sin catálogo
  descripcion: string;
  categoria: string;
  unidadesPedidas: number;
  unidadesFacturadas: number;
  gastoFacturadoEur: number;
}

export interface ComprasData {
  totales: CadenaTotales;
  porProveedor: CadenaProveedor[];
  plazo: Plazo;
  porCategoria: CompraCategoria[];
  topSkus: CompraSku[];
  facturasSinPedido: number; // facturas del periodo sin pedido_id_ref
}

const SIN_SKU = "Sin SKU";

export async function getComprasData(filtros: ExecFiltros): Promise<ComprasData> {
  const supabase = getSupabaseAdmin();

  const [pedidosRes, pedLinRes, albRes, albLinRes, facRes, facLinRes, provRes, prodRes] =
    await Promise.all([
      supabase
        .from("pedidos")
        .select("pedido_id, proveedor_id, estado, fecha_pedido, fecha_entrega_prevista, moneda"),
      supabase.from("pedidos_lineas").select("pedido_id, sku, cantidad_pedida"),
      supabase.from("albaranes").select("albaran_id, pedido_id, fecha_entrega"),
      supabase.from("albaranes_lineas").select("albaran_id, sku, cantidad_entregada"),
      supabase
        .from("facturas")
        .select("factura_id, pedido_id_ref, estado, es_nota_credito, fecha_expedicion, moneda_original, proveedor_id"),
      supabase
        .from("facturas_lineas")
        .select("factura_id, sku, cantidad, total_linea_eur"),
      supabase
        .from("maestro_proveedores")
        .select("proveedor_id, razon_social, pais, canal_recepcion"),
      supabase.from("productos").select("sku, descripcion, categoria"),
    ]);
  for (const r of [pedidosRes, pedLinRes, albRes, albLinRes, facRes, facLinRes, provRes, prodRes]) {
    if (r.error) throw r.error;
  }

  const proveedorById = new Map((provRes.data ?? []).map((p) => [p.proveedor_id, p]));
  const productoBySku = new Map((prodRes.data ?? []).map((p) => [p.sku, p]));

  // --- Cohorte de pedidos -------------------------------------------------------
  const pedidos = (pedidosRes.data ?? []).filter((p) => {
    const prov = p.proveedor_id ? proveedorById.get(p.proveedor_id) : undefined;
    if (filtros.anio !== "todos" && anioDe(p.fecha_pedido) !== filtros.anio) return false;
    if (filtros.proveedorId && p.proveedor_id !== filtros.proveedorId) return false;
    if (filtros.moneda && p.moneda !== filtros.moneda) return false;
    if (filtros.pais && prov?.pais !== filtros.pais) return false;
    if (filtros.canal && prov?.canal_recepcion !== filtros.canal) return false;
    return true;
  });
  const pedidoById = new Map(pedidos.map((p) => [p.pedido_id, p]));
  const pedidoSet = new Set(pedidoById.keys());

  // Pedidas por (pedido, sku) y por pedido.
  const pedidasPS = new Map<string, number>();
  const pedidasPorPedido = new Map<string, number>();
  const pedidasPorSku = new Map<string, number>();
  const skusPedidos = new Set<string>();
  for (const l of pedLinRes.data ?? []) {
    if (!pedidoSet.has(l.pedido_id)) continue;
    const q = l.cantidad_pedida ?? 0;
    pedidasPS.set(`${l.pedido_id}::${l.sku}`, (pedidasPS.get(`${l.pedido_id}::${l.sku}`) ?? 0) + q);
    pedidasPorPedido.set(l.pedido_id, (pedidasPorPedido.get(l.pedido_id) ?? 0) + q);
    pedidasPorSku.set(l.sku, (pedidasPorSku.get(l.sku) ?? 0) + q);
    skusPedidos.add(l.sku);
  }

  // Recibidas: albarán → pedido.
  const albaranes = (albRes.data ?? []).filter((a) => a.pedido_id && pedidoSet.has(a.pedido_id));
  const albaranPedido = new Map(albaranes.map((a) => [a.albaran_id, a.pedido_id as string]));
  const recibidasPS = new Map<string, number>();
  const recibidasPorPedido = new Map<string, number>();
  for (const l of albLinRes.data ?? []) {
    const pid = albaranPedido.get(l.albaran_id);
    if (!pid) continue;
    const q = l.cantidad_entregada ?? 0;
    const key = `${pid}::${l.sku}`;
    recibidasPS.set(key, (recibidasPS.get(key) ?? 0) + q);
    recibidasPorPedido.set(pid, (recibidasPorPedido.get(pid) ?? 0) + q);
  }

  // Facturadas: facturas reales (no NC, no excluidas) con pedido en la cohorte.
  const facturasReales = (facRes.data ?? []).filter(
    (f) => !ESTADOS_EXCLUIDOS_GASTO.includes(f.estado ?? "") && !f.es_nota_credito
  );
  const facturaPedido = new Map<string, string>();
  for (const f of facturasReales) {
    if (f.pedido_id_ref && pedidoSet.has(f.pedido_id_ref)) {
      facturaPedido.set(f.factura_id, f.pedido_id_ref);
    }
  }
  const facturadasPorPedido = new Map<string, number>();
  const facturadasPorSku = new Map<string, number>();
  const gastoPorSku = new Map<string, number>();
  for (const l of facLinRes.data ?? []) {
    const pid = facturaPedido.get(l.factura_id);
    if (!pid) continue;
    const q = l.cantidad ?? 0;
    const sku = l.sku ?? SIN_SKU;
    facturadasPorPedido.set(pid, (facturadasPorPedido.get(pid) ?? 0) + q);
    facturadasPorSku.set(sku, (facturadasPorSku.get(sku) ?? 0) + q);
    gastoPorSku.set(sku, (gastoPorSku.get(sku) ?? 0) + (l.total_linea_eur ?? 0));
  }

  // Facturas del periodo (mismos filtros) que no tienen pedido: informativo.
  const facturasSinPedido = facturasReales.filter((f) => {
    const prov = f.proveedor_id ? proveedorById.get(f.proveedor_id) : undefined;
    if (filtros.anio !== "todos" && anioDe(f.fecha_expedicion) !== filtros.anio) return false;
    if (filtros.proveedorId && f.proveedor_id !== filtros.proveedorId) return false;
    if (filtros.moneda && f.moneda_original !== filtros.moneda) return false;
    if (filtros.pais && prov?.pais !== filtros.pais) return false;
    if (filtros.canal && prov?.canal_recepcion !== filtros.canal) return false;
    return !f.pedido_id_ref;
  }).length;

  // --- Totales -------------------------------------------------------------------
  const pedidas = sumMap(pedidasPorPedido);
  const recibidas = sumMap(recibidasPorPedido);
  const facturadas = sumMap(facturadasPorPedido);

  const porEstado: Record<string, number> = {};
  for (const p of pedidos) porEstado[p.estado ?? "—"] = (porEstado[p.estado ?? "—"] ?? 0) + 1;

  // Pendiente de recibir: solo pedidos vivos (abiertos / parciales), por (pedido, sku).
  let pendienteRecibir = 0;
  for (const [key, q] of pedidasPS) {
    const pid = key.split("::")[0];
    const estado = pedidoById.get(pid)?.estado;
    if (estado !== "abierto" && estado !== "parcialmente_recibido") continue;
    pendienteRecibir += Math.max(0, q - (recibidasPS.get(key) ?? 0));
  }

  const totales: CadenaTotales = {
    numPedidos: pedidos.length,
    numSkus: skusPedidos.size,
    pedidas,
    recibidas,
    facturadas,
    pendienteRecibir,
    tasaRecepcion: pedidas > 0 ? recibidas / pedidas : 0,
    tasaFacturacion: recibidas > 0 ? facturadas / recibidas : 0,
    porEstado,
  };

  // --- Por proveedor -------------------------------------------------------------
  const provAgg = new Map<string, CadenaProveedor>();
  for (const p of pedidos) {
    if (!p.proveedor_id) continue;
    const acc =
      provAgg.get(p.proveedor_id) ??
      {
        proveedorId: p.proveedor_id,
        razonSocial: proveedorById.get(p.proveedor_id)?.razon_social ?? p.proveedor_id,
        pedidas: 0,
        recibidas: 0,
        facturadas: 0,
        tasaRecepcion: 0,
        pedidosVivos: 0,
      };
    acc.pedidas += pedidasPorPedido.get(p.pedido_id) ?? 0;
    acc.recibidas += recibidasPorPedido.get(p.pedido_id) ?? 0;
    acc.facturadas += facturadasPorPedido.get(p.pedido_id) ?? 0;
    if (p.estado === "abierto" || p.estado === "parcialmente_recibido") acc.pedidosVivos += 1;
    provAgg.set(p.proveedor_id, acc);
  }
  const porProveedor = [...provAgg.values()]
    .map((a) => ({ ...a, tasaRecepcion: a.pedidas > 0 ? a.recibidas / a.pedidas : 0 }))
    .sort((a, b) => b.pedidas - a.pedidas);

  // --- Cumplimiento de plazo (albarán frente a entrega prevista) ------------------
  let aTiempo = 0;
  let conRetraso = 0;
  let diasTotal = 0;
  for (const a of albaranes) {
    const prevista = pedidoById.get(a.pedido_id as string)?.fecha_entrega_prevista;
    if (!a.fecha_entrega || !prevista) continue;
    if (a.fecha_entrega > prevista) {
      conRetraso += 1;
      diasTotal += Math.round(
        (new Date(a.fecha_entrega).getTime() - new Date(prevista).getTime()) / 86_400_000
      );
    } else {
      aTiempo += 1;
    }
  }
  const plazo: Plazo = {
    numAlbaranes: aTiempo + conRetraso,
    aTiempo,
    conRetraso,
    diasRetrasoMedio: conRetraso > 0 ? diasTotal / conRetraso : 0,
  };

  // --- Qué compramos: categoría y SKU ---------------------------------------------
  const catAgg = new Map<string, CompraCategoria>();
  const skuKeys = new Set<string>([...pedidasPorSku.keys(), ...facturadasPorSku.keys()]);
  const skus: CompraSku[] = [];
  for (const sku of skuKeys) {
    const prod = sku === SIN_SKU ? undefined : productoBySku.get(sku);
    const categoria = prod?.categoria ?? "Sin categoría";
    const item: CompraSku = {
      sku,
      descripcion: prod?.descripcion ?? (sku === SIN_SKU ? "Líneas sin SKU del catálogo" : sku),
      categoria,
      unidadesPedidas: pedidasPorSku.get(sku) ?? 0,
      unidadesFacturadas: facturadasPorSku.get(sku) ?? 0,
      gastoFacturadoEur: round2(gastoPorSku.get(sku) ?? 0),
    };
    skus.push(item);
    const c = catAgg.get(categoria) ?? { categoria, unidadesPedidas: 0, gastoFacturadoEur: 0 };
    c.unidadesPedidas += item.unidadesPedidas;
    c.gastoFacturadoEur = round2(c.gastoFacturadoEur + item.gastoFacturadoEur);
    catAgg.set(categoria, c);
  }

  return {
    totales,
    porProveedor,
    plazo,
    porCategoria: [...catAgg.values()].sort((a, b) => b.gastoFacturadoEur - a.gastoFacturadoEur),
    topSkus: skus.sort((a, b) => b.gastoFacturadoEur - a.gastoFacturadoEur).slice(0, 8),
    facturasSinPedido,
  };
}

function sumMap(m: Map<string, number>): number {
  let t = 0;
  for (const v of m.values()) t += v;
  return t;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
