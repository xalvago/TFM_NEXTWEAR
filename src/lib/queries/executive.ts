import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { ANIOS_DATASET, MESES_CORTO, anioDe, mesDe } from "@/lib/finance";

/**
 * Datos de la Vista ejecutiva (FASE 1).
 *
 * Estrategia: como el dataset es pequeño (334 facturas, 804 líneas), traemos las
 * filas necesarias y AGREGAMOS en TypeScript. Ventaja para un TFM: toda la lógica
 * de negocio (neto de notas de crédito, exclusión de anuladas, sumas en EUR) queda
 * visible y auditable en código, sin depender de vistas/funciones SQL.
 *
 * `anio`: filtra KPIs y distribuciones. El gráfico interanual SIEMPRE usa los 3 años.
 */

export type PeriodoAnio = number | "todos";

export interface Kpis {
  gastoNetoEur: number;
  numFacturas: number;
  numNotasCredito: number;
  pctExcepcion: number; // fracción 0..1
  numEnExcepcion: number;
  saldoPendienteEur: number;
  numDuplicados: number;
}

export interface PuntoInteranual {
  mes: string; // "Abr" | "May" | "Jun"
  [anio: string]: string | number;
}

export interface GastoPorCentro {
  centroId: string;
  nombre: string;
  tipo: string; // tienda_fisica | ecommerce | almacen_central
  gastoEur: number;
}

export interface GastoPorProveedor {
  proveedorId: string;
  razonSocial: string;
  monedaFacturacion: string;
  gastoEur: number;
}

export interface GastoPorMoneda {
  moneda: string;
  gastoEur: number;
}

export interface TipoCambioActual {
  moneda: string; // USD | CNY
  tasa: number; // unidades de EUR que valen 1 unidad de `moneda` (convención del dataset: original * tasa = EUR)
  fecha: string;
}

export interface ExecutiveData {
  anio: PeriodoAnio;
  kpis: Kpis;
  interanual: PuntoInteranual[];
  porCentro: GastoPorCentro[];
  porProveedor: GastoPorProveedor[];
  porMoneda: GastoPorMoneda[];
  tiposCambio: TipoCambioActual[];
}

type FacturaRow = {
  factura_id: string;
  proveedor_id: string | null;
  moneda_original: string | null;
  total_factura_eur: number | null;
  saldo_pendiente_eur: number | null;
  es_nota_credito: boolean | null;
  estado: string | null;
  fecha_expedicion: string | null;
};

export async function getExecutiveData(
  anio: PeriodoAnio = "todos"
): Promise<ExecutiveData> {
  const supabase = getSupabaseAdmin();

  const [facturasRes, lineasRes, centrosRes, proveedoresRes, casosRes, tiposCambioRes] =
    await Promise.all([
      supabase
        .from("facturas")
        .select(
          "factura_id, proveedor_id, moneda_original, total_factura_eur, saldo_pendiente_eur, es_nota_credito, estado, fecha_expedicion"
        ),
      supabase
        .from("facturas_lineas")
        .select("factura_id, centro_coste_id, total_linea_eur"),
      supabase.from("centros_coste").select("centro_coste_id, nombre, tipo"),
      supabase
        .from("maestro_proveedores")
        .select("proveedor_id, razon_social, moneda_facturacion"),
      supabase.from("casos_excepcion").select("factura_id, tipo_excepcion"),
      supabase
        .from("tipos_cambio")
        .select("fecha, moneda_origen, tasa_cambio")
        .order("fecha", { ascending: false }),
    ]);

  for (const res of [
    facturasRes,
    lineasRes,
    centrosRes,
    proveedoresRes,
    casosRes,
    tiposCambioRes,
  ]) {
    if (res.error) throw res.error;
  }

  const facturas = (facturasRes.data ?? []) as FacturaRow[];
  const lineas = (lineasRes.data ?? []) as {
    factura_id: string;
    centro_coste_id: string | null;
    total_linea_eur: number | null;
  }[];
  const centros = (centrosRes.data ?? []) as {
    centro_coste_id: string;
    nombre: string;
    tipo: string;
  }[];
  const proveedores = (proveedoresRes.data ?? []) as {
    proveedor_id: string;
    razon_social: string;
    moneda_facturacion: string;
  }[];
  const casos = (casosRes.data ?? []) as {
    factura_id: string | null;
    tipo_excepcion: string | null;
  }[];

  // Índices auxiliares.
  const centroById = new Map(centros.map((c) => [c.centro_coste_id, c]));
  const proveedorById = new Map(proveedores.map((p) => [p.proveedor_id, p]));
  const facturaById = new Map(facturas.map((f) => [f.factura_id, f]));

  const matchAnio = (iso: string | null | undefined) =>
    anio === "todos" ? true : anioDe(iso) === anio;

  // Facturas del periodo, excluyendo anuladas (regla: anuladas no cuentan en importes).
  const noAnuladasPeriodo = facturas.filter(
    (f) => f.estado !== "anulada" && matchAnio(f.fecha_expedicion)
  );

  // --- KPIs ------------------------------------------------------------------
  // Gasto neto: suma directa de total_factura_eur. Las NC ya vienen negativas.
  const gastoNetoEur = sum(noAnuladasPeriodo.map((f) => f.total_factura_eur));
  const saldoPendienteEur = sum(
    noAnuladasPeriodo.map((f) => f.saldo_pendiente_eur)
  );
  const facturasReales = noAnuladasPeriodo.filter((f) => !f.es_nota_credito);
  const numFacturas = facturasReales.length;
  const numNotasCredito = noAnuladasPeriodo.filter(
    (f) => f.es_nota_credito
  ).length;
  const numEnExcepcion = noAnuladasPeriodo.filter(
    (f) => f.estado === "en_excepcion"
  ).length;
  const pctExcepcion =
    noAnuladasPeriodo.length > 0
      ? numEnExcepcion / noAnuladasPeriodo.length
      : 0;

  // Pagos duplicados detectados: casos de excepción tipo "duplicado", cuya factura
  // referenciada cae en el periodo seleccionado (no anulada).
  const numDuplicados = casos.filter((c) => {
    if (c.tipo_excepcion !== "duplicado") return false;
    if (!c.factura_id) return false;
    const f = facturaById.get(c.factura_id);
    if (!f || f.estado === "anulada") return false;
    return matchAnio(f.fecha_expedicion);
  }).length;

  const kpis: Kpis = {
    gastoNetoEur,
    numFacturas,
    numNotasCredito,
    pctExcepcion,
    numEnExcepcion,
    saldoPendienteEur,
    numDuplicados,
  };

  // --- Gráfico interanual (SIEMPRE los 3 años) -------------------------------
  // Meses del dataset: abril(4)/mayo(5)/junio(6).
  const MESES_NUM = [4, 5, 6];
  const interanual: PuntoInteranual[] = MESES_NUM.map((mNum, i) => {
    const punto: PuntoInteranual = { mes: MESES_CORTO[i] };
    for (const y of ANIOS_DATASET) {
      const total = sum(
        facturas
          .filter(
            (f) =>
              f.estado !== "anulada" &&
              anioDe(f.fecha_expedicion) === y &&
              mesDe(f.fecha_expedicion) === mNum
          )
          .map((f) => f.total_factura_eur)
      );
      punto[String(y)] = round2(total);
    }
    return punto;
  });

  // --- Gasto por centro de coste (periodo) -----------------------------------
  // Las facturas no llevan centro; el centro está a nivel de línea.
  const centroTotals = new Map<string, number>();
  for (const l of lineas) {
    const f = l.factura_id ? facturaById.get(l.factura_id) : undefined;
    if (!f || f.estado === "anulada") continue;
    if (!matchAnio(f.fecha_expedicion)) continue;
    if (!l.centro_coste_id) continue;
    centroTotals.set(
      l.centro_coste_id,
      (centroTotals.get(l.centro_coste_id) ?? 0) + (l.total_linea_eur ?? 0)
    );
  }
  const porCentro: GastoPorCentro[] = [...centroTotals.entries()]
    .map(([centroId, gastoEur]) => {
      const c = centroById.get(centroId);
      return {
        centroId,
        nombre: c?.nombre ?? centroId,
        tipo: c?.tipo ?? "desconocido",
        gastoEur: round2(gastoEur),
      };
    })
    .sort((a, b) => b.gastoEur - a.gastoEur);

  // --- Gasto por proveedor (top 10, periodo) ---------------------------------
  const provTotals = new Map<string, number>();
  for (const f of noAnuladasPeriodo) {
    if (!f.proveedor_id) continue;
    provTotals.set(
      f.proveedor_id,
      (provTotals.get(f.proveedor_id) ?? 0) + (f.total_factura_eur ?? 0)
    );
  }
  const porProveedor: GastoPorProveedor[] = [...provTotals.entries()]
    .map(([proveedorId, gastoEur]) => {
      const p = proveedorById.get(proveedorId);
      return {
        proveedorId,
        razonSocial: p?.razon_social ?? proveedorId,
        monedaFacturacion: p?.moneda_facturacion ?? "—",
        gastoEur: round2(gastoEur),
      };
    })
    .sort((a, b) => b.gastoEur - a.gastoEur)
    .slice(0, 10);

  // --- Gasto por moneda de origen (periodo) ----------------------------------
  const monedaTotals = new Map<string, number>();
  for (const f of noAnuladasPeriodo) {
    const m = f.moneda_original ?? "—";
    monedaTotals.set(m, (monedaTotals.get(m) ?? 0) + (f.total_factura_eur ?? 0));
  }
  const porMoneda: GastoPorMoneda[] = [...monedaTotals.entries()]
    .map(([moneda, gastoEur]) => ({ moneda, gastoEur: round2(gastoEur) }))
    .sort((a, b) => b.gastoEur - a.gastoEur);

  // --- Tipos de cambio actuales (última fecha por moneda) --------------------
  const tiposCambioRows = (tiposCambioRes.data ?? []) as {
    fecha: string;
    moneda_origen: string;
    tasa_cambio: number;
  }[];
  const tiposCambioVistos = new Set<string>();
  const tiposCambio: TipoCambioActual[] = [];
  for (const t of tiposCambioRows) {
    if (tiposCambioVistos.has(t.moneda_origen)) continue;
    tiposCambioVistos.add(t.moneda_origen);
    tiposCambio.push({ moneda: t.moneda_origen, tasa: t.tasa_cambio, fecha: t.fecha });
  }
  tiposCambio.sort((a, b) => a.moneda.localeCompare(b.moneda));

  return { anio, kpis, interanual, porCentro, porProveedor, porMoneda, tiposCambio };
}

// --- utilidades ---------------------------------------------------------------

function sum(values: (number | null | undefined)[]): number {
  return round2(values.reduce<number>((acc, v) => acc + (v ?? 0), 0));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
