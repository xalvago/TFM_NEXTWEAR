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
 * Franja compacta de KPIs pensada para integrarse bajo el gráfico de
 * evolución (mismo ancho/alto que la fila hero, no una sección aparte).
 */
export function KpiStrip({ kpis }: { kpis: Kpis }) {
  const entries = buildEntries(kpis);

  return (
    <section
      aria-label="Indicadores clave"
      className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/50 pt-3 sm:grid-cols-5 sm:divide-x sm:divide-border/50"
    >
      {entries.map((e) => {
        const Icon = e.icon;
        const tone = e.tone ?? "neutral";
        return (
          <div
            key={e.label}
            className="group flex items-start gap-2 sm:pl-4 sm:first:pl-0"
          >
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-lg",
                TONE_ICON_BG[tone]
              )}
            >
              <Icon aria-hidden size={14} strokeWidth={1.85} className="icon-anim" />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="eyebrow truncate text-[0.65rem]">{e.label}</span>
              <span className="font-numeric text-base leading-tight sm:text-lg">
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
