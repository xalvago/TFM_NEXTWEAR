import {
  Wallet,
  AlertTriangle,
  Scale,
  Copy,
  Globe2,
  type LucideIcon,
} from "lucide-react";
import { formatEUR, formatInt, formatPct, type StateTone } from "@/lib/finance";
import { IsoKpi } from "@/components/stock/iso-kpi";
import type { Kpis } from "@/lib/queries/executive";

type Entry = {
  label: string;
  value: string;
  note?: string;
  info?: string; // «cómo se calcula»
  tone?: StateTone;
  icon: LucideIcon;
};

function buildEntries(kpis: Kpis): Entry[] {
  return [
    {
      label: "Gasto neto",
      value: formatEUR(kpis.gastoNetoEur),
      note: `${formatInt(kpis.numFacturas)} facturas · ${formatInt(kpis.numNotasCredito)} NC descontadas`,
      info: "Suma de total_factura_eur (con IVA). Las notas de crédito ya son negativas y restan. Excluye anuladas y cargas en curso del robot.",
      icon: Wallet,
    },
    {
      label: "Saldo pendiente",
      value: formatEUR(kpis.saldoPendienteEur),
      note: "deuda neta tras abonos y pagos",
      info: "Suma de saldo_pendiente_eur de las facturas del periodo.",
      tone: "pending",
      icon: Scale,
    },
    {
      label: "Importe en excepción",
      value: formatEUR(kpis.importeExcepcionEur),
      note: `${formatInt(kpis.numEnExcepcion)} facturas · ${formatPct(kpis.pctExcepcion)} del total`,
      info: "Suma de total_factura_eur de facturas en estado en_excepcion. El % es sobre el nº de documentos del periodo.",
      tone: kpis.numEnExcepcion > 0 ? "exception" : "ok",
      icon: AlertTriangle,
    },
    {
      label: "Gasto en divisa",
      value: formatPct(kpis.pctExtranjero),
      note: `${formatEUR(kpis.gastoExtranjeroEur)} en USD + CNY`,
      info: "Gasto de facturas en USD/CNY (valorado en EUR) sobre el gasto bruto, sin notas de crédito.",
      tone: "credit",
      icon: Globe2,
    },
    {
      label: "Facturas duplicadas",
      value: formatInt(kpis.numDuplicados),
      note: "casos detectados",
      info: "Casos de casos_excepcion de tipo duplicado cuya factura cae en el periodo. No son pagos duplicados: solo hay 2 pagos en la base.",
      tone: kpis.numDuplicados > 0 ? "exception" : "ok",
      icon: Copy,
    },
  ];
}

/** KPIs isométricos compactos en una sola franja (5 columnas en pantallas anchas). */
export function KpiStrip({ kpis }: { kpis: Kpis }) {
  return (
    <section
      aria-label="Indicadores clave"
      className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    >
      {buildEntries(kpis).map((e) => (
        <IsoKpi key={e.label} compact {...e} />
      ))}
    </section>
  );
}
