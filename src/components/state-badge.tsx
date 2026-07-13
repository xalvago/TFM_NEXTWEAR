import { cn } from "@/lib/utils";
import type { StateTone } from "@/lib/finance";

/**
 * Badge de estado semántico. El color codifica significado (excepción, ok,
 * pendiente, nota de crédito) — no es decorativo.
 */
const toneClasses: Record<StateTone, string> = {
  ok: "border-[color:var(--ok)]/30 bg-[color:var(--ok)]/10 text-[color:var(--ok)]",
  exception:
    "border-[color:var(--exception)]/35 bg-[color:var(--exception)]/12 text-[color:var(--exception)]",
  pending:
    "border-[color:var(--pending)]/40 bg-[color:var(--pending)]/12 text-[color:color-mix(in_oklab,var(--pending),black_18%)]",
  credit:
    "border-[color:var(--credit)]/30 bg-[color:var(--credit)]/10 text-[color:var(--credit)]",
  neutral: "border-border bg-muted text-muted-foreground",
};

export function StateBadge({
  tone,
  children,
  className,
  dot = true,
}: {
  tone: StateTone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClasses[tone],
        className
      )}
    >
      {dot && (
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-current opacity-80"
        />
      )}
      {children}
    </span>
  );
}
