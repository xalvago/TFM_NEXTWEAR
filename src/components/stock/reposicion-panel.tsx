"use client";

import { useMemo, useState } from "react";
import { ArrowDownWideNarrow, CalendarClock } from "lucide-react";
import { StateBadge } from "@/components/state-badge";
import { formatInt, formatDate } from "@/lib/finance";
import type { ReposicionRow } from "@/lib/queries/stock";
import { cn } from "@/lib/utils";

const ESTADO_PEDIDO_LABEL: Record<string, string> = {
  abierto: "Abierto",
  parcialmente_recibido: "Parcial",
};

type EstadoFiltro = "todos" | "abierto" | "parcialmente_recibido";
type Orden = "entrega" | "pendiente";

/**
 * Previsión de reposición: SKUs con cantidad pendiente de entrega en pedidos
 * abiertos o parcialmente recibidos. Lista compacta con filtro por estado del
 * pedido y orden (entrega más próxima / mayor cantidad pendiente).
 */
export function ReposicionPanel({ rows }: { rows: ReposicionRow[] }) {
  const [estado, setEstado] = useState<EstadoFiltro>("todos");
  const [orden, setOrden] = useState<Orden>("entrega");

  const counts = useMemo(
    () => ({
      todos: rows.length,
      abierto: rows.filter((r) => r.estado === "abierto").length,
      parcialmente_recibido: rows.filter(
        (r) => r.estado === "parcialmente_recibido"
      ).length,
    }),
    [rows]
  );

  const visibles = useMemo(() => {
    const filtradas =
      estado === "todos" ? rows : rows.filter((r) => r.estado === estado);
    const orderadas = [...filtradas].sort((a, b) => {
      if (orden === "pendiente")
        return b.cantidadPendiente - a.cantidadPendiente;
      // entrega más próxima primero (nulos al final)
      const fa = a.fechaEntregaPrevista ?? "9999-12-31";
      const fb = b.fechaEntregaPrevista ?? "9999-12-31";
      return fa.localeCompare(fb);
    });
    return orderadas;
  }, [rows, estado, orden]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Motor de filtrado */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={estado === "todos"} onClick={() => setEstado("todos")}>
            Todos · {counts.todos}
          </FilterChip>
          <FilterChip
            active={estado === "abierto"}
            onClick={() => setEstado("abierto")}
          >
            Abierto · {counts.abierto}
          </FilterChip>
          <FilterChip
            active={estado === "parcialmente_recibido"}
            onClick={() => setEstado("parcialmente_recibido")}
          >
            Parcial · {counts.parcialmente_recibido}
          </FilterChip>
        </div>

        <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-background/60 p-0.5">
          <SortButton
            active={orden === "entrega"}
            onClick={() => setOrden("entrega")}
            label="Entrega más próxima"
          >
            <CalendarClock size={14} strokeWidth={1.75} />
          </SortButton>
          <SortButton
            active={orden === "pendiente"}
            onClick={() => setOrden("pendiente")}
            label="Mayor cantidad pendiente"
          >
            <ArrowDownWideNarrow size={14} strokeWidth={1.75} />
          </SortButton>
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="grid flex-1 place-items-center py-10 text-center text-sm text-muted-foreground">
          Sin reposición para este filtro.
        </div>
      ) : (
        <ul className="-mx-6 min-h-0 flex-1 divide-y divide-border/50 overflow-y-auto border-t border-border/50">
          {visibles.map((r) => (
            <li
              key={`${r.pedidoId}::${r.sku}`}
              className="flex flex-col gap-1.5 px-6 py-3 transition-colors hover:bg-foreground/[0.03]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium leading-snug">
                  {r.descripcion}
                </span>
                <span className="shrink-0 text-right font-numeric text-sm font-semibold">
                  {formatInt(r.cantidadPendiente)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    uds
                  </span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                <span className="font-numeric">{r.sku}</span>
                <span aria-hidden>·</span>
                <span className="font-numeric">{r.pedidoId}</span>
                <span aria-hidden>·</span>
                <span>{r.centroNombre}</span>
              </div>

              <div className="mt-0.5 flex items-center justify-between gap-2">
                <StateBadge tone={r.estado === "abierto" ? "pending" : "credit"}>
                  {ESTADO_PEDIDO_LABEL[r.estado] ?? r.estado}
                </StateBadge>
                <span className="text-xs text-muted-foreground">
                  Entrega {formatDate(r.fechaEntregaPrevista)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        active
          ? "border-[color:var(--credit)]/40 bg-[color:var(--credit)]/12 text-[color:var(--credit)]"
          : "border-border bg-background/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function SortButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      aria-label={label}
      className={cn(
        "grid size-7 place-items-center rounded-full transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
