import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Cobertura de datos: % de filas relevantes con el campo poblado, medido en vivo
 * con conteos de solo lectura. Regla de completitud: una métrica solo se da por
 * disponible si supera `UMBRAL_COMPLETITUD`; NULL nunca se trata como 0.
 */
export const UMBRAL_COMPLETITUD = 0.95;

export type EstadoCobertura = "disponible" | "parcial" | "no_disponible";

export interface FilaCobertura {
  metrica: string;
  fuente: string; // tabla.columna
  universo: string; // sobre qué filas se mide
  total: number;
  pobladas: number;
  pct: number; // 0..1
  estado: EstadoCobertura;
  observaciones: string;
}

export interface NoDisponible {
  metrica: string;
  motivo: string;
}

export interface Cobertura {
  umbral: number;
  filas: FilaCobertura[];
  noDisponibles: NoDisponible[];
}

// Estados que no cuentan en importes (ver ESTADOS_EXCLUIDOS_GASTO).
const EXCLUIDOS = "(anulada,nueva_entrada,pendiente_captura)";

type Spec = {
  metrica: string;
  tabla: string;
  col: string;
  universo: string;
  observaciones: string;
  // Filtro del universo (sobre el builder). Devuelve el builder filtrado.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filtro?: (q: any) => any;
};

const SPECS: Spec[] = [
  {
    metrica: "Gasto facturado (EUR)",
    tabla: "facturas",
    col: "total_factura_eur",
    universo: "facturas no anuladas ni en carga",
    observaciones: "Base del gasto neto; las notas de crédito ya son negativas.",
    filtro: (q) => q.not("estado", "in", EXCLUIDOS),
  },
  {
    metrica: "Saldo pendiente (EUR)",
    tabla: "facturas",
    col: "saldo_pendiente_eur",
    universo: "facturas no anuladas ni en carga",
    observaciones: "NULL en cargas del robot: se excluyen, no se cuentan como 0.",
    filtro: (q) => q.not("estado", "in", EXCLUIDOS),
  },
  {
    metrica: "Proveedor de la factura",
    tabla: "facturas",
    col: "proveedor_id",
    universo: "facturas no anuladas ni en carga",
    observaciones: "Necesario para gasto por proveedor, país y canal.",
    filtro: (q) => q.not("estado", "in", EXCLUIDOS),
  },
  {
    metrica: "Pedido referenciado",
    tabla: "facturas",
    col: "pedido_id_ref",
    universo: "facturas no anuladas ni en carga",
    observaciones:
      "Las facturas sin pedido quedan fuera de la cadena pedido→recibido→facturado (excepción «sin pedido»).",
    filtro: (q) => q.not("estado", "in", EXCLUIDOS),
  },
  {
    metrica: "Tipo de cambio aplicado",
    tabla: "facturas",
    col: "tipo_cambio_aplicado",
    universo: "facturas en USD o CNY",
    observaciones: "Auditable frente a la tabla de referencia tipos_cambio.",
    filtro: (q) => q.not("estado", "in", EXCLUIDOS).neq("moneda_original", "EUR"),
  },
  {
    metrica: "Fecha del tipo de cambio",
    tabla: "facturas",
    col: "fecha_tipo_cambio",
    universo: "facturas en USD o CNY",
    observaciones: "Permite saber de qué día es la tasa usada.",
    filtro: (q) => q.not("estado", "in", EXCLUIDOS).neq("moneda_original", "EUR"),
  },
  {
    metrica: "País del proveedor",
    tabla: "maestro_proveedores",
    col: "pais",
    universo: "proveedores",
    observaciones: "Fuente fiable del país. facturas.pais_origen_mercancia está poco poblado y no se usa.",
  },
  {
    metrica: "Moneda de facturación",
    tabla: "maestro_proveedores",
    col: "moneda_facturacion",
    universo: "proveedores",
    observaciones: "EUR / USD / CNY.",
  },
  {
    metrica: "Canal de recepción",
    tabla: "maestro_proveedores",
    col: "canal_recepcion",
    universo: "proveedores",
    observaciones: "email / portal_web / api.",
  },
  {
    metrica: "Unidades pedidas",
    tabla: "pedidos_lineas",
    col: "cantidad_pedida",
    universo: "líneas de pedido",
    observaciones: "El importe pedido no se calcula: el precio acordado está en la moneda del pedido.",
  },
  {
    metrica: "Unidades recibidas",
    tabla: "albaranes_lineas",
    col: "cantidad_entregada",
    universo: "líneas de albarán",
    observaciones: "Vinculadas al pedido por albaranes.pedido_id.",
  },
  {
    metrica: "Unidades facturadas",
    tabla: "facturas_lineas",
    col: "cantidad",
    universo: "líneas de factura",
    observaciones: "Las notas de crédito no suman unidades.",
  },
  {
    metrica: "SKU de la línea facturada",
    tabla: "facturas_lineas",
    col: "sku",
    universo: "líneas de factura",
    observaciones: "Las líneas sin SKU salen como «Sin SKU» en los rankings de producto.",
  },
  {
    metrica: "Centro de coste de la línea",
    tabla: "facturas_lineas",
    col: "centro_coste_id",
    universo: "líneas de factura",
    observaciones: "El gasto por destino sale de líneas (base sin IVA).",
  },
  {
    metrica: "Categoría de producto",
    tabla: "productos",
    col: "categoria",
    universo: "productos del catálogo",
    observaciones: "Catálogo de solo 20 SKU.",
  },
  {
    metrica: "Colección de producto",
    tabla: "productos",
    col: "coleccion",
    universo: "productos del catálogo",
    observaciones: "",
  },
  {
    metrica: "Confianza de extracción (Capturador)",
    tabla: "facturas",
    col: "confianza_extraccion",
    universo: "facturas no anuladas ni en carga",
    observaciones: "El Capturador aún no la escribe.",
    filtro: (q) => q.not("estado", "in", EXCLUIDOS),
  },
  {
    metrica: "Categoría contable (Clasificador)",
    tabla: "facturas_lineas",
    col: "categoria_contable",
    universo: "líneas de factura",
    observaciones: "El Clasificador aún no la escribe.",
  },
];

export async function getCobertura(): Promise<Cobertura> {
  const supabase = getSupabaseAdmin();

  const filas = await Promise.all(
    SPECS.map(async (sp): Promise<FilaCobertura> => {
      const base = () => {
        // Tabla/columna dinámicas: el builder tipado no las admite, de ahí el cast.
        const q = supabase
          .from(sp.tabla as "facturas")
          .select(sp.col, { count: "exact", head: true });
        return sp.filtro ? sp.filtro(q) : q;
      };
      const [totalRes, pobladasRes] = await Promise.all([
        base(),
        base().not(sp.col, "is", null),
      ]);
      const total = totalRes.count ?? 0;
      const pobladas = pobladasRes.count ?? 0;
      const pct = total > 0 ? pobladas / total : 0;
      const estado: EstadoCobertura =
        pct >= UMBRAL_COMPLETITUD ? "disponible" : pobladas > 0 ? "parcial" : "no_disponible";
      return {
        metrica: sp.metrica,
        fuente: `${sp.tabla}.${sp.col}`,
        universo: sp.universo,
        total,
        pobladas,
        pct,
        estado,
        observaciones: sp.observaciones,
      };
    })
  );

  return {
    umbral: UMBRAL_COMPLETITUD,
    filas,
    noDisponibles: [
      { metrica: "Ventas e ingresos", motivo: "La base es de Cuentas por Pagar: no existen ventas." },
      { metrica: "Beneficio y margen", motivo: "Sin ventas no hay margen; no se estima." },
      { metrica: "Clientes y segmentos", motivo: "No hay clientes en el modelo; el eje es el proveedor." },
      { metrica: "Aprobaciones y comunicaciones", motivo: "Tablas vacías: aún no hay datos." },
      { metrica: "Rendimiento de agentes (coste LLM, tiempos)", motivo: "log_agentes tiene muy pocas filas." },
    ],
  };
}
