import { cn } from "@/lib/utils";
import { formatEUR, formatPct } from "@/lib/finance";

/**
 * Piezas de lectura densa: el espacio lo marca el dato (nº de filas, longitud de
 * etiquetas), no una rejilla fija. Servidor puro, sin librería de gráficos.
 */

export interface BarItem {
  key: string;
  label: string;
  value: number; // magnitud de la barra (EUR, uds...)
  display?: string; // texto del valor; por defecto EUR
  sub?: string; // contexto a la derecha, en gris
  color?: string; // var(--...)
  href?: string;
}

/** Lista de barras en línea: etiqueta · barra proporcional · valor · contexto. */
export function BarList({
  items,
  max,
  labelWidth = "9rem",
}: {
  items: BarItem[];
  max?: number;
  labelWidth?: string;
}) {
  const top = max ?? Math.max(...items.map((i) => Math.abs(i.value)), 1);
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((i) => {
        const w = Math.max(2, (Math.abs(i.value) / top) * 100);
        return (
          <li
            key={i.key}
            className="grid items-center gap-x-3 text-sm"
            style={{ gridTemplateColumns: `${labelWidth} minmax(3rem,1fr) auto` }}
          >
            <span className="truncate text-muted-foreground" title={i.label}>
              {i.label}
            </span>
            <span className="h-2 rounded-full bg-secondary/70">
              <span
                className="fill-bar block h-full rounded-full"
                style={
                  {
                    width: `${w}%`,
                    "--bar": i.color ?? "var(--chart-1)",
                  } as React.CSSProperties
                }
              />
            </span>
            <span className="flex items-baseline justify-end gap-2 whitespace-nowrap">
              <span className="font-numeric text-[0.8rem]">
                {i.display ?? formatEUR(i.value)}
              </span>
              {i.sub && (
                <span className="font-numeric w-12 text-right text-[0.7rem] text-muted-foreground">
                  {i.sub}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export interface Segment {
  key: string;
  label: string;
  value: number; // EUR
  color: string;
  icon?: React.ReactNode; // contexto visual junto a la etiqueta
}

/** Una dimensión como barra 100 % apilada + leyenda con importe y %. */
export function StackedRow({
  title,
  segments,
  note,
}: {
  title: string;
  segments: Segment[];
  note?: string;
}) {
  const total = segments.reduce((a, s) => a + Math.max(0, s.value), 0);
  const visibles = segments.filter((s) => s.value > 0);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="eyebrow">{title}</span>
        {note && (
          <span className="text-[0.68rem] text-muted-foreground">{note}</span>
        )}
      </div>
      {total > 0 ? (
        <>
          <div
            className="flex h-2.5 w-full gap-px overflow-hidden rounded-full bg-secondary/60"
            role="img"
            aria-label={`${title}: ${visibles.map((s) => `${s.label} ${formatPct(s.value / total)}`).join(", ")}`}
          >
            {visibles.map((s) => (
              <span
                key={s.key}
                className="fill-seg"
                style={
                  {
                    width: `${(s.value / total) * 100}%`,
                    "--bar": s.color,
                  } as React.CSSProperties
                }
                title={`${s.label}: ${formatEUR(s.value)}`}
              />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
            {visibles.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ background: s.color }}
                />
                {s.icon}
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-numeric">{formatPct(s.value / total)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">Sin datos.</span>
      )}
    </div>
  );
}

/** Contenedor compacto: ocupa lo que mide su contenido. */
export type Tint = "violet" | "sky" | "rose" | "ok" | "exception" | "amber" | "logo";

const TINT_CLASS: Record<Tint, string> = {
  violet: "tint-violet",
  sky: "tint-sky",
  rose: "tint-rose",
  ok: "tint-ok",
  exception: "tint-exception",
  amber: "tint-amber",
  logo: "tint-logo",
};

export function Block({
  title,
  eyebrow,
  heading,
  info,
  tint,
  children,
  className,
}: {
  title?: string;
  eyebrow?: string;
  /** Cabecera propia (p. ej. el h1 de la página); sustituye a eyebrow + title. */
  heading?: React.ReactNode;
  info?: React.ReactNode;
  /** Color del tema del bloque: violeta=gasto, azul=compra, rojo=control, ámbar=divisa. */
  tint?: Tint;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "card-wash relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl px-4 py-3.5 shadow-card",
        tint && TINT_CLASS[tint],
        className
      )}
    >
      <header className="flex items-start justify-between gap-3">
        {heading ?? (
          <div className="flex flex-col">
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2 className="font-display text-base leading-snug">{title}</h2>
          </div>
        )}
        {info}
      </header>
      {children}
    </section>
  );
}
