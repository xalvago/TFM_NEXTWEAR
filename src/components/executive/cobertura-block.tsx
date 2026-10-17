import { ChevronDown, CheckCircle2, CircleDashed, CircleSlash } from "lucide-react";
import { formatInt, formatPct } from "@/lib/finance";
import type { Cobertura, EstadoCobertura } from "@/lib/queries/cobertura";
import { Block } from "@/components/executive/dense";

const ESTADO: Record<
  EstadoCobertura,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  disponible: { label: "Disponible", color: "var(--ok)", icon: CheckCircle2 },
  parcial: { label: "Parcial", color: "var(--pending)", icon: CircleDashed },
  no_disponible: { label: "No disponible", color: "var(--exception)", icon: CircleSlash },
};

/** Contenido de la cobertura (para la ventana emergente de la vista ejecutiva). */
export function CoberturaDetalle({ cobertura }: { cobertura: Cobertura }) {
  return (
    <Block eyebrow="Transparencia" tint="sky" title="Cobertura de datos">
      <CoberturaCuerpo cobertura={cobertura} />
    </Block>
  );
}

/** Cobertura de datos, colapsada al final: qué se mide, con qué completitud y qué no existe. */
export function CoberturaBlock({ cobertura }: { cobertura: Cobertura }) {
  const disponibles = cobertura.filas.filter((f) => f.estado === "disponible").length;

  return (
    <details className="card-wash tint-sky group/cob relative overflow-hidden rounded-2xl shadow-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-col">
          <span className="eyebrow">Transparencia</span>
          <span className="font-display text-base leading-snug">
            Cobertura de datos
            <span className="ml-2 font-sans text-xs font-normal text-muted-foreground">
              {disponibles} de {cobertura.filas.length} métricas con ≥{" "}
              {formatPct(cobertura.umbral).replace(",0", "")} de completitud
            </span>
          </span>
        </div>
        <ChevronDown
          aria-hidden
          size={16}
          className="text-muted-foreground transition-transform duration-200 group-open/cob:rotate-180"
        />
      </summary>

      <div className="border-t border-border/50 px-4 pb-4 pt-3">
        <CoberturaCuerpo cobertura={cobertura} />
      </div>
    </details>
  );
}

function CoberturaCuerpo({ cobertura }: { cobertura: Cobertura }) {
  return (
    <div className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          Una métrica solo se da por disponible si al menos el{" "}
          {formatPct(cobertura.umbral).replace(",0", "")} de las filas relevantes tiene el
          campo informado. NULL no se trata como 0.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="thead-brand text-left">
                <th className="px-3 py-2.5">Métrica</th>
                <th className="px-3 py-2.5">Fuente</th>
                <th className="w-[18%] px-3 py-2.5">Completitud</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {cobertura.filas.map((f) => {
                const e = ESTADO[f.estado];
                const Icon = e.icon;
                return (
                  <tr key={f.fuente} className="border-b border-border/30 align-top last:border-0">
                    <td className="py-1.5 pr-3 leading-tight">
                      <span className="font-medium">{f.metrica}</span>
                      <span className="block text-[0.68rem] text-muted-foreground">
                        {f.universo}
                      </span>
                    </td>
                    <td className="font-numeric py-1.5 pr-3 text-xs text-muted-foreground">
                      {f.fuente}
                    </td>
                    <td className="py-1.5 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 flex-1 rounded-full bg-secondary/70">
                          <span
                            className="fill-bar block h-full rounded-full"
                            style={
                              {
                                width: `${Math.max(2, f.pct * 100)}%`,
                                "--bar": e.color,
                              } as React.CSSProperties
                            }
                          />
                        </span>
                        <span className="font-numeric w-14 text-right text-xs">
                          {formatPct(f.pct)}
                        </span>
                      </div>
                      <span className="font-numeric text-[0.65rem] text-muted-foreground">
                        {formatInt(f.pobladas)} de {formatInt(f.total)}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3">
                      <span
                        className="inline-flex items-center gap-1 text-xs"
                        style={{ color: e.color }}
                      >
                        <Icon aria-hidden size={13} />
                        {e.label}
                      </span>
                    </td>
                    <td className="whitespace-normal py-1.5 text-xs text-muted-foreground">
                      {f.observaciones}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Lo que no se puede calcular con esta base
          </h3>
          <ul className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
            {cobertura.noDisponibles.map((n) => (
              <li key={n.metrica} className="flex gap-1.5">
                <CircleSlash
                  aria-hidden
                  size={13}
                  className="mt-px shrink-0 text-[color:var(--exception)]"
                />
                <span>
                  <span className="font-medium">{n.metrica}.</span>{" "}
                  <span className="text-muted-foreground">{n.motivo}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
    </div>
  );
}
