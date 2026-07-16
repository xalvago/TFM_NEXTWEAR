import {
  Wallet,
  FileText,
  AlertTriangle,
  Scale,
  Copy,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEUR, formatInt, formatPct, type StateTone } from "@/lib/finance";
import type { Kpis } from "@/lib/queries/executive";

type Entry = {
  label: string;
  value: string;
  note?: string;
  tone?: StateTone;
  icon: LucideIcon;
};

const TONE_ICON_BG: Record<StateTone, string> = {
  ok: "bg-[color:var(--ok)]/10 text-[color:var(--ok)]",
  exception: "bg-[color:var(--exception)]/10 text-[color:var(--exception)]",
  pending: "bg-[color:var(--pending)]/10 text-[color:var(--pending)]",
  credit: "bg-[color:var(--credit)]/10 text-[color:var(--credit)]",
  neutral: "gradient-brand-soft text-primary",
};

// Barra de acento superior (gradiente) por tono.
const TONE_ACCENT: Record<StateTone, string> = {
  ok: "linear-gradient(90deg, var(--ok), color-mix(in oklab, var(--ok), var(--chart-2) 55%))",
  exception:
    "linear-gradient(90deg, var(--exception), color-mix(in oklab, var(--exception), var(--pending) 55%))",
  pending:
    "linear-gradient(90deg, var(--pending), color-mix(in oklab, var(--pending), var(--exception) 40%))",
  credit:
    "linear-gradient(90deg, var(--credit), color-mix(in oklab, var(--credit), var(--chart-1) 55%))",
  neutral: "var(--gradient-brand)",
};

function buildEntries(kpis: Kpis): Entry[] {
  return [
    {
      label: "Gasto neto (EUR)",
      value: formatEUR(kpis.gastoNetoEur),
      note: `${formatInt(kpis.numNotasCredito)} NC descontadas`,
      icon: Wallet,
    },
    {
      label: "Facturas",
      value: formatInt(kpis.numFacturas),
      note: "documentos del periodo",
      icon: FileText,
    },
    {
      label: "En excepción",
      value: formatPct(kpis.pctExcepcion),
      note: `${formatInt(kpis.numEnExcepcion)} a revisar`,
      tone: kpis.numEnExcepcion > 0 ? "exception" : "ok",
      icon: AlertTriangle,
    },
    {
      label: "Saldo pendiente (EUR)",
      value: formatEUR(kpis.saldoPendienteEur),
      note: "deuda neta",
      icon: Scale,
    },
    {
      label: "Pagos duplicados",
      value: formatInt(kpis.numDuplicados),
      note: "por conciliación",
      tone: kpis.numDuplicados > 0 ? "exception" : "ok",
      icon: Copy,
    },
  ];
}

/**
 * Tarjetas de KPI independientes bajo el gráfico de evolución: 5 tarjetas en
 * dos filas (3 + 2), ocupando el ancho del gráfico.
 */
export function KpiStrip({ kpis }: { kpis: Kpis }) {
  const entries = buildEntries(kpis);

  return (
    <section
      aria-label="Indicadores clave"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      {entries.map((e) => {
        const Icon = e.icon;
        const tone = e.tone ?? "neutral";
        return (
          <div
            key={e.label}
            className="card-wash hover-lift group relative flex flex-col gap-2 overflow-hidden rounded-xl p-3.5 shadow-card"
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-[3px]"
              style={{ background: TONE_ACCENT[tone] }}
            />
            <span
              className={cn(
                "grid size-7 place-items-center rounded-lg",
                TONE_ICON_BG[tone]
              )}
            >
              <Icon aria-hidden size={14} strokeWidth={1.85} className="icon-anim" />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="eyebrow truncate text-[0.65rem]">{e.label}</span>
              <span className="font-numeric text-lg leading-tight">
                {e.value}
              </span>
              {e.note && (
                <span className="truncate text-[0.7rem] leading-snug text-muted-foreground">
                  {e.note}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
