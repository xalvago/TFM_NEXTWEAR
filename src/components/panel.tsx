import { cn } from "@/lib/utils";

const TINT_CLASS = {
  violet: "tint-violet",
  sky: "tint-sky",
  rose: "tint-rose",
} as const;

/** Panel con cabecera editorial (eyebrow + título) para secciones y gráficos. */
export function Panel({
  eyebrow,
  title,
  description,
  actions,
  className,
  tint,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  tint?: keyof typeof TINT_CLASS;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "card-wash relative flex flex-col overflow-hidden rounded-2xl shadow-card",
        tint && TINT_CLASS[tint],
        className
      )}
    >
      <header className="flex items-start justify-between gap-4 px-6 py-5">
        <div className="flex flex-col gap-1">
          {eyebrow && (
            <span className="eyebrow flex items-center gap-2">
              <span
                aria-hidden
                className="h-3 w-1 rounded-full"
                style={{ background: "var(--gradient-brand)" }}
              />
              {eyebrow}
            </span>
          )}
          <h2 className="font-display text-lg leading-snug">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      <div className="flex min-h-0 flex-1 flex-col px-6 pb-6">{children}</div>
    </section>
  );
}
