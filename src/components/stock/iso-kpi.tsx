import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StateTone } from "@/lib/finance";
import { InfoTip } from "@/components/info-tip";

const TONE_TINT: Record<StateTone, string> = {
  ok: "tint-ok",
  exception: "tint-exception",
  pending: "tint-amber",
  credit: "tint-sky",
  neutral: "tint-violet",
};

// Color base del cubo por significado (mismas variables que el resto del dashboard).
const TONE_COLOR: Record<StateTone, string> = {
  ok: "var(--ok)",
  exception: "var(--exception)",
  pending: "var(--pending)",
  credit: "var(--credit)",
  neutral: "var(--chart-1)",
};

/** Cubo isométrico con el icono tumbado sobre su cara superior. */
function IsoCube({
  icon: Icon,
  color,
  size = 46,
}: {
  icon: LucideIcon;
  color: string;
  size?: number;
}) {
  const mix = (pct: number, other: string) =>
    `color-mix(in oklab, ${color} ${pct}%, ${other})`;
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="iso-cube relative block shrink-0 transition-transform duration-300 [transition-timing-function:var(--ease-out)] group-hover:-translate-y-[3px]"
    >
      <svg viewBox="0 0 44 46" className="absolute inset-0 size-full overflow-visible">
        <ellipse cx="25" cy="43" rx="17" ry="3.2" className="fill-black/15" />
        <polygon points="4,15 22,25 22,43 4,33" style={{ fill: mix(74, "black") }} />
        <polygon points="22,25 40,15 40,33 22,43" style={{ fill: mix(88, "black") }} />
        <polygon points="22,5 40,15 22,25 4,15" style={{ fill: mix(100, "white") }} />
      </svg>
      <span
        className="absolute grid place-items-center text-white"
        style={{
          left: 22,
          top: 15,
          width: 18,
          height: 18,
          transform: "translate(-50%, -50%) rotate(-30deg) skewX(30deg) scaleY(0.866)",
        }}
      >
        <Icon size={18} strokeWidth={2.4} />
      </span>
    </span>
  );
}

export interface IsoKpiProps {
  label: string;
  value: string;
  note?: string;
  info?: string;
  tone?: StateTone;
  icon: LucideIcon;
  /** Variante baja: cubo a la izquierda y textos a la derecha. */
  compact?: boolean;
}

/** KPI compacto con textos centrados y cubo isométrico como elemento gráfico. */
export function IsoKpi({ label, value, note, info, tone = "neutral", icon, compact = false }: IsoKpiProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "card-wash hover-lift group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-xl px-3 py-2 shadow-card",
          TONE_TINT[tone]
        )}
      >
        <IsoCube icon={icon} color={TONE_COLOR[tone]} size={36} />
        <div className="flex min-w-0 flex-col">
          <span className="eyebrow max-w-full truncate text-[0.62rem]">{label}</span>
          <span className="font-numeric text-lg leading-tight">{value}</span>
          {note && (
            <span className="truncate text-[0.68rem] leading-snug text-muted-foreground" title={note}>
              {note}
            </span>
          )}
        </div>
        {info && (
          <span className="absolute right-1.5 top-1.5">
            <InfoTip text={info} />
          </span>
        )}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "card-wash hover-lift group relative flex min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl px-3 pb-3 pt-2.5 text-center shadow-card",
        TONE_TINT[tone]
      )}
    >
      {info && (
        <span className="absolute right-2 top-2">
          <InfoTip text={info} />
        </span>
      )}
      <IsoCube icon={icon} color={TONE_COLOR[tone]} />
      <span className="eyebrow mt-1 max-w-full truncate text-[0.65rem]">{label}</span>
      <span className="font-numeric text-xl leading-tight">{value}</span>
      {note && (
        <span className="max-w-full text-balance text-[0.7rem] leading-snug text-muted-foreground">
          {note}
        </span>
      )}
    </div>
  );
}
