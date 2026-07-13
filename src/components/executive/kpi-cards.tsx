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

// Barra de acento superior (gradiente) por tono — da color y vida a cada card.
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

export function KpiCards({ kpis }: { kpis: Kpis }) {
  const entries: Entry[] = [
    {
      label: "Gasto neto (EUR)",
      value: formatEUR(kpis.gastoNetoEur),
      note: `${formatInt(kpis.numNotasCredito)} notas de crédito descontadas`,
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
      note: `${formatInt(kpis.numEnExcepcion)} requieren revisión`,
      tone: kpis.numEnExcepcion > 0 ? "exception" : "ok",
      icon: AlertTriangle,
    },
    {
      label: "Saldo pendiente (EUR)",
      value: formatEUR(kpis.saldoPendienteEur),
      note: "deuda neta tras abonos y pagos",
      icon: Scale,
    },
    {
      label: "Pagos duplicados",
      value: formatInt(kpis.numDuplicados),
      note: "detectados por conciliación",
      tone: kpis.numDuplicados > 0 ? "exception" : "ok",
      icon: Copy,
    },
  ];

  return (
    <section
      aria-label="Indicadores clave"
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
    >
      {entries.map((e) => {
        const Icon = e.icon;
        const tone = e.tone ?? "neutral";
        return (
          <div
            key={e.label}
            className="card-wash hover-lift group relative flex flex-col gap-3 overflow-hidden rounded-2xl p-5 shadow-card"
          >
            {/* Acento superior con gradiente por tono */}
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-[3px]"
              style={{ background: TONE_ACCENT[tone] }}
            />
            <span
              className={cn(
                "grid size-9 place-items-center rounded-xl",
                TONE_ICON_BG[tone]
              )}
            >
              <Icon aria-hidden size={17} strokeWidth={1.75} className="icon-anim" />
            </span>
            <div className="flex flex-col gap-1">
              <span className="eyebrow">{e.label}</span>
              <span className="font-numeric text-xl leading-none sm:text-2xl">
                {e.value}
              </span>
              {e.note && (
                <span className="text-xs leading-snug text-muted-foreground">
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
