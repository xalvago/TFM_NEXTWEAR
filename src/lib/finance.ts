/**
 * Lógica de negocio y formateo de FinFlow.
 *
 * Reglas clave (ver CLAUDE.md §"Reglas de negocio"):
 *  - Todo el dinero se suma en EUR (`_eur`). Nunca se mezclan monedas `_original`.
 *  - Las notas de crédito tienen `total_factura_eur` NEGATIVO: sumar directamente
 *    ya produce el neto (gasto − abonos).
 *  - Las facturas `anulada` se excluyen de los importes.
 */

// --- Formateo -----------------------------------------------------------------

const eurFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const eurCompactFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const intFormatter = new Intl.NumberFormat("es-ES");

const pctFormatter = new Intl.NumberFormat("es-ES", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Importe EUR completo, ej. "1.234,56 €". */
export function formatEUR(value: number | null | undefined): string {
  return eurFormatter.format(value ?? 0);
}

/** Importe en la moneda original del documento (EUR/USD/CNY). */
export function formatMoneda(
  value: number | null | undefined,
  moneda: string | null | undefined
): string {
  const currency = moneda ?? "EUR";
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  } catch {
    // Moneda no reconocida por Intl: formateo numérico + código.
    return `${intFormatter.format(value ?? 0)} ${currency}`;
  }
}

/** Importe EUR compacto para ejes/etiquetas, ej. "1,2 M €". */
export function formatEURCompact(value: number | null | undefined): string {
  return eurCompactFormatter.format(value ?? 0);
}

export function formatInt(value: number | null | undefined): string {
  return intFormatter.format(value ?? 0);
}

/** Recibe una fracción 0..1. */
export function formatPct(fraction: number): string {
  return pctFormatter.format(Number.isFinite(fraction) ? fraction : 0);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

// --- Estados de factura -------------------------------------------------------

export const ESTADO_FACTURA = [
  "pendiente_captura",
  "pendiente_conciliacion",
  "conciliada_ok",
  "en_excepcion",
  "pendiente_aprobacion",
  "aprobada",
  "rechazada",
  "contabilizada",
  "pagada",
  "anulada",
] as const;

export type EstadoFactura = (typeof ESTADO_FACTURA)[number];

/** Estados que requieren atención humana (valor central del sistema). */
export const ESTADOS_ATENCION: EstadoFactura[] = [
  "en_excepcion",
  "pendiente_aprobacion",
  "rechazada",
];

export const ESTADO_LABEL: Record<string, string> = {
  pendiente_captura: "Pendiente captura",
  pendiente_conciliacion: "Pendiente conciliación",
  conciliada_ok: "Conciliada OK",
  en_excepcion: "En excepción",
  pendiente_aprobacion: "Pendiente aprobación",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  contabilizada: "Contabilizada",
  pagada: "Pagada",
  anulada: "Anulada",
};

/** Familia de color semántico para un estado (mapea a tokens CSS de estado). */
export type StateTone = "ok" | "exception" | "pending" | "credit" | "neutral";

export function estadoTone(estado: string | null | undefined): StateTone {
  switch (estado) {
    case "conciliada_ok":
    case "aprobada":
    case "contabilizada":
    case "pagada":
      return "ok";
    case "en_excepcion":
    case "rechazada":
      return "exception";
    case "pendiente_captura":
    case "pendiente_conciliacion":
    case "pendiente_aprobacion":
      return "pending";
    case "anulada":
      return "neutral";
    default:
      return "neutral";
  }
}

// --- Tipos de excepción -------------------------------------------------------

export const TIPO_EXCEPCION_LABEL: Record<string, string> = {
  duplicado: "Duplicado",
  importe_distinto: "Importe distinto",
  sin_pedido: "Sin pedido",
  nota_credito: "Nota de crédito",
  entrega_parcial: "Entrega parcial",
  salto_divisa: "Salto de divisa",
  producto_no_reconocido: "Producto no reconocido",
  entrega_incompleta: "Entrega incompleta",
  mercancia_danada: "Mercancía dañada",
  iban_no_coincide: "IBAN no coincide",
};

export const ESTADO_RESOLUCION_LABEL: Record<string, string> = {
  abierto: "Abierto",
  en_revision: "En revisión",
  resuelto_ok: "Resuelto",
  resuelto_fraude: "Fraude confirmado",
  descartado: "Descartado",
};

export function estadoResolucionTone(
  estado: string | null | undefined
): StateTone {
  switch (estado) {
    case "resuelto_ok":
      return "ok";
    case "resuelto_fraude":
      return "exception";
    case "abierto":
    case "en_revision":
      return "pending";
    case "descartado":
      return "neutral";
    default:
      return "neutral";
  }
}

// --- Estados de pago -----------------------------------------------------------

export const PAGO_ESTADO_LABEL: Record<string, string> = {
  programado: "Programado",
  retenido: "Retenido",
  ejecutado: "Ejecutado",
  rechazado: "Rechazado",
  anulado: "Anulado",
};

export function pagoEstadoTone(estado: string | null | undefined): StateTone {
  switch (estado) {
    case "ejecutado":
      return "ok";
    case "rechazado":
      return "exception";
    case "programado":
    case "retenido":
      return "pending";
    case "anulado":
      return "neutral";
    default:
      return "neutral";
  }
}

// --- Divisas ------------------------------------------------------------------

export const MONEDA_LABEL: Record<string, string> = {
  EUR: "Euro",
  USD: "Dólar EE. UU.",
  CNY: "Yuan chino",
};

export const MONEDA_SIMBOLO: Record<string, string> = {
  EUR: "€",
  USD: "$",
  CNY: "¥",
};

// --- Factura de exportación (proveedores asiáticos) ----------------------------

export const TIPO_ID_FISCAL_LABEL: Record<string, string> = {
  nif: "NIF",
  uscc: "USCC",
  vat: "VAT",
  otro: "ID fiscal",
};

export const REGIMEN_IVA_LABEL: Record<string, string> = {
  nacional: "Nacional",
  exportacion: "Exportación",
  intracomunitario: "Intracomunitario",
};

// --- Periodo / años -----------------------------------------------------------

/** Años presentes en el dataset (abr–jun de cada uno). */
export const ANIOS_DATASET = [2024, 2025, 2026] as const;
export type AnioDataset = (typeof ANIOS_DATASET)[number];

export const MESES_CORTO = ["Abr", "May", "Jun"] as const;

/** Devuelve el año (número) de una fecha ISO, o null. */
export function anioDe(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const y = Number(iso.slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

/** Devuelve el mes 1..12 de una fecha ISO, o null. */
export function mesDe(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const m = Number(iso.slice(5, 7));
  return Number.isFinite(m) ? m : null;
}
