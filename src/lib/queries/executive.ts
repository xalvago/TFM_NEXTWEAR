import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getTasasVivas } from "@/lib/fx-live";
import {
  ANIOS_DATASET,
  ESTADOS_EXCLUIDOS_GASTO,
  MESES_CORTO,
  MESES_DATASET,
  anioDe,
  mesDe,
} from "@/lib/finance";

/**
 * Datos de la Vista ejecutiva.
 *
 * Estrategia: como el dataset es pequeño (~350 facturas, ~800 líneas), traemos las
 * filas necesarias y AGREGAMOS en TypeScript. Toda la lógica de negocio (neto de
 * notas de crédito, estados excluidos, sumas en EUR) queda visible y auditable.
 *
 * Definición oficial de GASTO: `facturas.total_factura_eur` (con IVA), suma directa
 * (las notas de crédito ya vienen negativas), excluyendo `ESTADOS_EXCLUIDOS_GASTO`.
 * El gasto por centro de coste sale de `facturas_lineas.total_linea_eur` (base sin
 * IVA): no cuadra con el total a propósito y así se declara en pantalla.
 *
 * Filtros (URL): `anio` solo afecta a KPIs y distribuciones; el gráfico interanual
 * SIEMPRE usa los 3 años. El resto de filtros afectan a todo.
 */

export type PeriodoAnio = number | "todos";

export interface ExecFiltros {
  anio: PeriodoAnio;
  proveedorId?: string;
  pais?: string;
  moneda?: string;
  canal?: string;
}

export interface Kpis {
  gastoNetoEur: number;
  numFacturas: number;
  numNotasCredito: number;
  numEnExcepcion: number;
  pctExcepcion: number; // fracción 0..1 sobre documentos del periodo
  importeExcepcionEur: number;
  saldoPendienteEur: number;
  gastoExtranjeroEur: number; // USD + CNY, valorado en EUR
  pctExtranjero: number; // fracción 0..1 sobre el gasto bruto (sin NC)
  numDuplicados: number; // casos de excepción tipo "duplicado"
}

export interface PuntoInteranual {
  mes: string; // "Abr" | "May" | "Jun" | "Jul"
  parcial: boolean; // mes de la fecha de corte, sin cerrar
  [anio: string]: string | number | boolean | null;
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
  pais: string;
  monedaFacturacion: string;
  canal: string;
  numFacturas: number;
  gastoEur: number;
  pctSobreTotal: number; // fracción 0..1
  numEnExcepcion: number;
  importeExcepcionEur: number;
}

/** Fase 4: control de facturación (embudo, excepciones, importe en riesgo). */
export interface EmbudoEstado {
  estado: string;
  numFacturas: number;
  importeEur: number;
}

export interface ExcepcionPorTipo {
  tipo: string;
  numCasos: number;
  numRequierenHumano: number;
  numAbiertos: number;
}

export interface ExcepcionTop {
  facturaId: string;
  numeroFactura: string | null;
  proveedor: string;
  importeEur: number;
  motivo: string | null;
  tipos: string[];
}

export interface ControlFacturacion {
  embudo: EmbudoEstado[];
  porTipo: ExcepcionPorTipo[];
  topExcepciones: ExcepcionTop[];
  totalCasos: number;
  casosRequierenHumano: number;
  casosAbiertos: number;
  // Facturas en excepción / total de documentos del periodo, y su importe.
  numEnExcepcion: number;
  importeEnExcepcionEur: number;
  numConciliadasOk: number;
}

export interface GastoPorMoneda {
  moneda: string;
  gastoEur: number;
}

export interface GastoPorPais {
  pais: string;
  gastoEur: number;
  numProveedores: number;
}

export interface TipoCambioActual {
  moneda: string; // USD | CNY
  tasa: number; // unidades de `moneda` por 1 EUR (p. ej. ~7.7 CNY/EUR): eur = original / tasa
  fecha: string;
  fuente: "bce_en_vivo" | "dataset";
  // Última tasa registrada en `tipos_cambio` (la de valoración de facturas).
  tasaDataset: number;
  fechaDataset: string;
}

/** Auditoría del tipo de cambio aplicado en facturas frente a la tabla de referencia. */
export interface AuditoriaFx {
  moneda: string;
  numFacturas: number;
  gastoEur: number;
  aplicadaMin: number;
  aplicadaMedia: number;
  aplicadaMax: number;
  refMin: number;
  refMax: number;
  fueraDeRango: number; // facturas con tasa aplicada fuera de [refMin, refMax]
  facturasFueraDeRango: string[]; // factura_id (máx. 5)
}

export interface Opciones {
  proveedores: { id: string; nombre: string }[];
  paises: string[];
  canales: string[];
}

export interface CalidadDatos {
  fechaCorte: string | null; // última fecha de expedición cargada (facturas reales)
  mesParcial: { anio: number; mes: number } | null;
  cargasEnCurso: number; // nueva_entrada + pendiente_captura (excluidas)
  importeCargasEnCursoEur: number;
  pendientesConciliacion: number;
  asientosRegistrados: number;
}

export interface ExecutiveData {
  filtros: ExecFiltros;
  kpis: Kpis;
  interanual: PuntoInteranual[];
  porCentro: GastoPorCentro[];
  porProveedor: GastoPorProveedor[];
  porMoneda: GastoPorMoneda[];
  porPais: GastoPorPais[];
  tiposCambio: TipoCambioActual[];
  auditoriaFx: AuditoriaFx[];
  opciones: Opciones;
  control: ControlFacturacion;
  calidad: CalidadDatos;
  /** Reconciliación interna: |suma por proveedor − KPI gasto| (debe ser ~0). */
  descuadreEur: number;
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
  tipo_cambio_aplicado: number | null;
  numero_factura: string | null;
  motivo_excepcion: string | null;
};

type ProveedorRow = {
  proveedor_id: string;
  razon_social: string;
  pais: string | null;
  moneda_facturacion: string;
  canal_recepcion: string | null;
};

export async function getExecutiveData(
  filtros: ExecFiltros = { anio: "todos" }
): Promise<ExecutiveData> {
  const supabase = getSupabaseAdmin();
  const { anio } = filtros;

  const [
    facturasRes,
    lineasRes,
    centrosRes,
    proveedoresRes,
    casosRes,
    tiposCambioRes,
    asientosRes,
  ] = await Promise.all([
    supabase
      .from("facturas")
      .select(
        "factura_id, proveedor_id, moneda_original, total_factura_eur, saldo_pendiente_eur, es_nota_credito, estado, fecha_expedicion, tipo_cambio_aplicado, numero_factura, motivo_excepcion"
      ),
    supabase
      .from("facturas_lineas")
      .select("factura_id, centro_coste_id, total_linea_eur"),
    supabase.from("centros_coste").select("centro_coste_id, nombre, tipo"),
    supabase
      .from("maestro_proveedores")
      .select("proveedor_id, razon_social, pais, moneda_facturacion, canal_recepcion"),
    supabase
      .from("casos_excepcion")
      .select(
        "factura_id, tipo_excepcion, requiere_intervencion_humana, estado_resolucion"
      ),
    supabase
      .from("tipos_cambio")
      .select("fecha, moneda_origen, tasa_cambio")
      .order("fecha", { ascending: false }),
    supabase
      .from("asientos_contables")
      .select("asiento_id", { count: "exact", head: true })
      .eq("estado_registro", "registrado"),
  ]);

  for (const res of [
    facturasRes,
    lineasRes,
    centrosRes,
    proveedoresRes,
    casosRes,
    tiposCambioRes,
    asientosRes,
  ]) {
    if (res.error) throw res.error;
  }

  const todasFacturas = (facturasRes.data ?? []) as FacturaRow[];
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
  const proveedores = (proveedoresRes.data ?? []) as ProveedorRow[];
  const casos = (casosRes.data ?? []) as {
    factura_id: string | null;
    tipo_excepcion: string | null;
    requiere_intervencion_humana: boolean | null;
    estado_resolucion: string | null;
  }[];

  const centroById = new Map(centros.map((c) => [c.centro_coste_id, c]));
  const proveedorById = new Map(proveedores.map((p) => [p.proveedor_id, p]));

  // Facturas que cuentan en importes (sin anuladas ni cargas en curso del robot).
  const financieras = todasFacturas.filter(
    (f) => !ESTADOS_EXCLUIDOS_GASTO.includes(f.estado ?? "")
  );

  // --- Calidad de datos --------------------------------------------------------
  const cargas = todasFacturas.filter(
    (f) => f.estado === "nueva_entrada" || f.estado === "pendiente_captura"
  );
  const fechas = financieras
    .map((f) => f.fecha_expedicion)
    .filter((d): d is string => !!d)
    .sort();
  const fechaCorte = fechas.length ? fechas[fechas.length - 1] : null;
  let mesParcial: CalidadDatos["mesParcial"] = null;
  if (fechaCorte) {
    const y = Number(fechaCorte.slice(0, 4));
    const m = Number(fechaCorte.slice(5, 7));
    const dia = Number(fechaCorte.slice(8, 10));
    const ultimoDia = new Date(y, m, 0).getDate();
    if (dia < ultimoDia) mesParcial = { anio: y, mes: m };
  }

  // --- Aplicación de filtros (todo salvo año) -----------------------------------
  const pasaFiltros = (f: FacturaRow): boolean => {
    const prov = f.proveedor_id ? proveedorById.get(f.proveedor_id) : undefined;
    if (filtros.proveedorId && f.proveedor_id !== filtros.proveedorId) return false;
    if (filtros.moneda && f.moneda_original !== filtros.moneda) return false;
    if (filtros.pais && prov?.pais !== filtros.pais) return false;
    if (filtros.canal && prov?.canal_recepcion !== filtros.canal) return false;
    return true;
  };
  const filtradas = financieras.filter(pasaFiltros);

  const matchAnio = (iso: string | null | undefined) =>
    anio === "todos" ? true : anioDe(iso) === anio;
  const periodo = filtradas.filter((f) => matchAnio(f.fecha_expedicion));
  const periodoIds = new Set(periodo.map((f) => f.factura_id));

  // --- KPIs --------------------------------------------------------------------
  const gastoNetoEur = sum(periodo.map((f) => f.total_factura_eur));
  const saldoPendienteEur = sum(periodo.map((f) => f.saldo_pendiente_eur));
  const numFacturas = periodo.filter((f) => !f.es_nota_credito).length;
  const numNotasCredito = periodo.filter((f) => f.es_nota_credito).length;
  const enExcepcion = periodo.filter((f) => f.estado === "en_excepcion");
  const importeExcepcionEur = sum(enExcepcion.map((f) => f.total_factura_eur));
  const pctExcepcion =
    periodo.length > 0 ? enExcepcion.length / periodo.length : 0;

  // Gasto en divisa extranjera sobre gasto bruto (excluye NC para no distorsionar).
  const brutas = periodo.filter((f) => !f.es_nota_credito);
  const gastoBruto = sum(brutas.map((f) => f.total_factura_eur));
  const gastoExtranjeroEur = sum(
    brutas
      .filter((f) => f.moneda_original && f.moneda_original !== "EUR")
      .map((f) => f.total_factura_eur)
  );
  const pctExtranjero = gastoBruto > 0 ? gastoExtranjeroEur / gastoBruto : 0;

  const numDuplicados = casos.filter(
    (c) =>
      c.tipo_excepcion === "duplicado" &&
      c.factura_id &&
      periodoIds.has(c.factura_id)
  ).length;

  const kpis: Kpis = {
    gastoNetoEur,
    numFacturas,
    numNotasCredito,
    numEnExcepcion: enExcepcion.length,
    pctExcepcion,
    importeExcepcionEur,
    saldoPendienteEur,
    gastoExtranjeroEur,
    pctExtranjero,
    numDuplicados,
  };

  // --- Gráfico interanual (SIEMPRE los 3 años, con filtros no temporales) -------
  const interanual: PuntoInteranual[] = MESES_DATASET.map((mNum, i) => {
    const punto: PuntoInteranual = {
      mes: MESES_CORTO[i],
      parcial: mesParcial?.mes === mNum,
    };
    for (const y of ANIOS_DATASET) {
      const delMes = filtradas.filter(
        (f) => anioDe(f.fecha_expedicion) === y && mesDe(f.fecha_expedicion) === mNum
      );
      // Mes sin facturas = sin dato (null), no 0: no se pinta un hundimiento falso.
      punto[String(y)] = delMes.length
        ? round2(sum(delMes.map((f) => f.total_factura_eur)))
        : null;
    }
    return punto;
  });

  // --- Gasto por centro de coste (periodo; nivel de línea, base sin IVA) -------
  const centroTotals = new Map<string, number>();
  for (const l of lineas) {
    if (!periodoIds.has(l.factura_id) || !l.centro_coste_id) continue;
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

  // --- Gasto por proveedor (ranking completo) y por país ------------------------
  const provAgg = new Map<
    string,
    { gasto: number; n: number; nExc: number; impExc: number }
  >();
  for (const f of periodo) {
    if (!f.proveedor_id) continue;
    const acc = provAgg.get(f.proveedor_id) ?? { gasto: 0, n: 0, nExc: 0, impExc: 0 };
    acc.gasto += f.total_factura_eur ?? 0;
    acc.n += 1;
    if (f.estado === "en_excepcion") {
      acc.nExc += 1;
      acc.impExc += f.total_factura_eur ?? 0;
    }
    provAgg.set(f.proveedor_id, acc);
  }
  const sumaProveedores = [...provAgg.values()].reduce((a, v) => a + v.gasto, 0);
  const porProveedor: GastoPorProveedor[] = [...provAgg.entries()]
    .map(([proveedorId, v]) => {
      const p = proveedorById.get(proveedorId);
      return {
        proveedorId,
        razonSocial: p?.razon_social ?? proveedorId,
        pais: p?.pais ?? "—",
        monedaFacturacion: p?.moneda_facturacion ?? "—",
        canal: p?.canal_recepcion ?? "—",
        numFacturas: v.n,
        gastoEur: round2(v.gasto),
        pctSobreTotal: sumaProveedores !== 0 ? v.gasto / sumaProveedores : 0,
        numEnExcepcion: v.nExc,
        importeExcepcionEur: round2(v.impExc),
      };
    })
    .sort((a, b) => b.gastoEur - a.gastoEur);

  const paisAgg = new Map<string, { gasto: number; provs: Set<string> }>();
  for (const p of porProveedor) {
    const acc = paisAgg.get(p.pais) ?? { gasto: 0, provs: new Set<string>() };
    acc.gasto += p.gastoEur;
    acc.provs.add(p.proveedorId);
    paisAgg.set(p.pais, acc);
  }
  const porPais: GastoPorPais[] = [...paisAgg.entries()]
    .map(([pais, v]) => ({
      pais,
      gastoEur: round2(v.gasto),
      numProveedores: v.provs.size,
    }))
    .sort((a, b) => b.gastoEur - a.gastoEur);

  // --- Gasto por moneda de origen (periodo) ------------------------------------
  const monedaTotals = new Map<string, number>();
  for (const f of periodo) {
    const m = f.moneda_original ?? "—";
    monedaTotals.set(m, (monedaTotals.get(m) ?? 0) + (f.total_factura_eur ?? 0));
  }
  const porMoneda: GastoPorMoneda[] = [...monedaTotals.entries()]
    .map(([moneda, gastoEur]) => ({ moneda, gastoEur: round2(gastoEur) }))
    .sort((a, b) => b.gastoEur - a.gastoEur);

  // --- Tipos de cambio: referencia actual y auditoría de lo aplicado ----------
  const tiposCambioRows = (tiposCambioRes.data ?? []) as {
    fecha: string;
    moneda_origen: string;
    tasa_cambio: number;
  }[];
  const vistos = new Set<string>();
  const tiposCambio: TipoCambioActual[] = [];
  for (const t of tiposCambioRows) {
    if (vistos.has(t.moneda_origen)) continue;
    vistos.add(t.moneda_origen);
    tiposCambio.push({
      moneda: t.moneda_origen,
      tasa: t.tasa_cambio,
      fecha: t.fecha,
      fuente: "dataset",
      tasaDataset: t.tasa_cambio,
      fechaDataset: t.fecha,
    });
  }
  tiposCambio.sort((a, b) => a.moneda.localeCompare(b.moneda));

  const vivas = await getTasasVivas(tiposCambio.map((t) => t.moneda));
  for (const t of tiposCambio) {
    const v = vivas[t.moneda];
    if (v) {
      t.tasa = v.tasa;
      t.fecha = v.fecha;
      t.fuente = "bce_en_vivo";
    }
  }

  const auditoriaFx: AuditoriaFx[] = [];
  for (const t of tiposCambio) {
    const refs = tiposCambioRows
      .filter((r) => r.moneda_origen === t.moneda)
      .map((r) => r.tasa_cambio);
    if (!refs.length) continue;
    const refMin = Math.min(...refs);
    const refMax = Math.max(...refs);
    const delaMoneda = periodo.filter(
      (f) => f.moneda_original === t.moneda && f.tipo_cambio_aplicado != null
    );
    if (!delaMoneda.length) continue;
    const tasas = delaMoneda.map((f) => f.tipo_cambio_aplicado as number);
    const fuera = delaMoneda.filter(
      (f) =>
        (f.tipo_cambio_aplicado as number) < refMin ||
        (f.tipo_cambio_aplicado as number) > refMax
    );
    auditoriaFx.push({
      moneda: t.moneda,
      numFacturas: delaMoneda.length,
      gastoEur: round2(sum(delaMoneda.map((f) => f.total_factura_eur))),
      aplicadaMin: Math.min(...tasas),
      aplicadaMedia: tasas.reduce((a, v) => a + v, 0) / tasas.length,
      aplicadaMax: Math.max(...tasas),
      refMin,
      refMax,
      fueraDeRango: fuera.length,
      facturasFueraDeRango: fuera.slice(0, 5).map((f) => f.factura_id),
    });
  }

  // --- Control de facturación (fase 4) -----------------------------------------
  const embudoMap = new Map<string, { n: number; imp: number }>();
  for (const f of periodo) {
    const e = f.estado ?? "—";
    const acc = embudoMap.get(e) ?? { n: 0, imp: 0 };
    acc.n += 1;
    acc.imp += f.total_factura_eur ?? 0;
    embudoMap.set(e, acc);
  }
  const embudo: EmbudoEstado[] = [...embudoMap.entries()]
    .map(([estado, v]) => ({ estado, numFacturas: v.n, importeEur: round2(v.imp) }))
    .sort((a, b) => b.numFacturas - a.numFacturas);

  // Casos ligados a una factura del periodo (un caso solo de albarán/pedido no se cuenta).
  const casosPeriodo = casos.filter((c) => c.factura_id && periodoIds.has(c.factura_id));
  const tipoMap = new Map<string, ExcepcionPorTipo>();
  for (const c of casosPeriodo) {
    const t = c.tipo_excepcion ?? "desconocido";
    const acc = tipoMap.get(t) ?? { tipo: t, numCasos: 0, numRequierenHumano: 0, numAbiertos: 0 };
    acc.numCasos += 1;
    if (c.requiere_intervencion_humana) acc.numRequierenHumano += 1;
    if (c.estado_resolucion === "abierto" || c.estado_resolucion === "en_revision") {
      acc.numAbiertos += 1;
    }
    tipoMap.set(t, acc);
  }
  const porTipo = [...tipoMap.values()].sort((a, b) => b.numCasos - a.numCasos);

  const tiposPorFactura = new Map<string, Set<string>>();
  for (const c of casosPeriodo) {
    const s = tiposPorFactura.get(c.factura_id as string) ?? new Set<string>();
    s.add(c.tipo_excepcion ?? "desconocido");
    tiposPorFactura.set(c.factura_id as string, s);
  }
  const topExcepciones: ExcepcionTop[] = enExcepcion
    .slice()
    .sort(
      (a, b) =>
        Math.abs(b.total_factura_eur ?? 0) - Math.abs(a.total_factura_eur ?? 0)
    )
    .slice(0, 6)
    .map((f) => ({
      facturaId: f.factura_id,
      numeroFactura: f.numero_factura,
      proveedor:
        (f.proveedor_id && proveedorById.get(f.proveedor_id)?.razon_social) || "—",
      importeEur: f.total_factura_eur ?? 0,
      motivo: f.motivo_excepcion,
      tipos: [...(tiposPorFactura.get(f.factura_id) ?? [])],
    }));

  const control: ControlFacturacion = {
    embudo,
    porTipo,
    topExcepciones,
    totalCasos: casosPeriodo.length,
    casosRequierenHumano: casosPeriodo.filter((c) => c.requiere_intervencion_humana).length,
    casosAbiertos: casosPeriodo.filter(
      (c) => c.estado_resolucion === "abierto" || c.estado_resolucion === "en_revision"
    ).length,
    numEnExcepcion: enExcepcion.length,
    importeEnExcepcionEur: importeExcepcionEur,
    numConciliadasOk: periodo.filter((f) => f.estado === "conciliada_ok").length,
  };

  // --- Opciones de filtro ------------------------------------------------------
  const opciones: Opciones = {
    proveedores: proveedores
      .map((p) => ({ id: p.proveedor_id, nombre: p.razon_social }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    paises: [...new Set(proveedores.map((p) => p.pais).filter((p): p is string => !!p))].sort(),
    canales: [
      ...new Set(
        proveedores.map((p) => p.canal_recepcion).filter((c): c is string => !!c)
      ),
    ].sort(),
  };

  const calidad: CalidadDatos = {
    fechaCorte,
    mesParcial,
    cargasEnCurso: cargas.length,
    importeCargasEnCursoEur: sum(cargas.map((f) => f.total_factura_eur)),
    pendientesConciliacion: financieras.filter(
      (f) => f.estado === "pendiente_conciliacion"
    ).length,
    asientosRegistrados: asientosRes.count ?? 0,
  };

  return {
    filtros,
    kpis,
    interanual,
    porCentro,
    porProveedor,
    porMoneda,
    porPais,
    tiposCambio,
    auditoriaFx,
    opciones,
    control,
    calidad,
    descuadreEur: round2(Math.abs(sumaProveedores - gastoNetoEur)),
  };
}

// --- utilidades ---------------------------------------------------------------

function sum(values: (number | null | undefined)[]): number {
  return round2(values.reduce<number>((acc, v) => acc + (v ?? 0), 0));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
