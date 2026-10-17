import { ANIOS_DATASET } from "@/lib/finance";
import type { PuntoInteranual } from "@/lib/queries/executive";
import { IsoLines } from "@/components/stock/iso-charts";

// Un color por año; el más reciente en coral para destacarlo sobre el teal del resto.
const ANIO_COLOR: Record<string, string> = {
  "2024": "var(--chart-4)",
  "2025": "var(--chart-3)",
  "2026": "var(--chart-2)",
};

/** Gasto mensual por año como líneas isométricas con pared, una por año. */
export function EvolucionIso({ data }: { data: PuntoInteranual[] }) {
  const series = ANIOS_DATASET.map((y) => ({
    key: String(y),
    label: String(y),
    color: ANIO_COLOR[String(y)] ?? "var(--chart-5)",
  }));
  const groups = data.map((d) => ({
    key: d.mes,
    label: d.mes,
    partial: d.parcial,
    values: Object.fromEntries(
      series.map((s) => [s.key, typeof d[s.key] === "number" ? (d[s.key] as number) : null])
    ),
  }));
  const parcial = data.find((d) => d.parcial);
  return (
    <div className="flex flex-col gap-2">
      <div className="h-[19rem] [&>svg]:!h-full [&>svg]:!max-h-full">
        <IsoLines groups={groups} series={series} titulo="Gasto mensual por año" />
      </div>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/50 pt-2.5">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span aria-hidden className="size-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
        {parcial && (
          <li className="ml-auto text-xs text-muted-foreground">
            * {parcial.mes}: mes sin cerrar; no comparar con meses completos.
          </li>
        )}
      </ul>
    </div>
  );
}
