"use client";

import { useState } from "react";
import { Bell, ChevronDown } from "lucide-react";
import { FacturasFilters } from "@/components/facturas/filters";
import { FacturasTable } from "@/components/facturas/facturas-table";
import { ExcepcionesPanel } from "@/components/facturas/excepciones-panel";
import { StatGrid } from "@/components/stat-tile";
import type {
  CasoExcepcionItem,
  FacturaListItem,
  ProveedorOption,
} from "@/lib/queries/facturas";
import { cn } from "@/lib/utils";

const EASE = "[transition-timing-function:var(--ease-out)]";

/**
 * Filtros + tabla de facturas con un hueco lateral (xl) que alterna entre dos usos:
 *  - alertas cerradas: los KPIs ocupan ese hueco en cuadrícula 2×2 (altura de la tabla);
 *  - alertas abiertas: los KPIs suben a su fila superior y el panel de excepciones
 *    ocupa el hueco ("puerta" que se abre).
 * Por debajo de xl los KPIs quedan siempre arriba y el panel se muestra bajo la tabla.
 */
export function FacturasWorkspace({
  rows,
  proveedores,
  casos,
  counts,
  activeTipo,
  totalIntervencion,
  totalAutomatico,
  kpis,
  header,
}: {
  rows: FacturaListItem[];
  proveedores: ProveedorOption[];
  casos: CasoExcepcionItem[];
  counts: Record<string, number>;
  activeTipo?: string;
  totalIntervencion: number;
  totalAutomatico: number;
  kpis: React.ReactNode;
  /** Cabecera de la página, integrada en la parte superior del contenedor de la tabla. */
  header?: React.ReactNode;
}) {
  // Si se llega con ?exc=tipo, el panel arranca abierto para mostrar el filtro.
  const [open, setOpen] = useState(!!activeTipo);

  return (
    <div className="flex flex-col">
      {/* KPIs en su fila superior: siempre bajo xl; en xl solo con las alertas abiertas */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-700",
          EASE,
          open ? "grid-rows-[1fr]" : "grid-rows-[1fr] xl:grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "pb-4 transition-[opacity,transform,visibility] duration-700",
              EASE,
              open
                ? "translate-y-0 opacity-100"
                : "xl:invisible xl:-translate-y-3 xl:opacity-0"
            )}
          >
            <StatGrid label="Resumen de la lista">{kpis}</StatGrid>
          </div>
        </div>
      </div>

      <div className="card-wash relative overflow-hidden rounded-2xl shadow-card">
        {header && (
          <header className="tint-logo border-b border-border/60 px-4 py-3.5">{header}</header>
        )}
        <FacturasFilters
          proveedores={proveedores}
          embedded
          actions={
            <AlertButton
              open={open}
              count={totalIntervencion}
              onClick={() => setOpen((v) => !v)}
            />
          }
        />

        <div className="flex flex-col xl:flex-row">
          {/* La tabla ocupa solo el ancho de sus columnas */}
          <div className="min-w-0 shrink">
            <FacturasTable rows={rows} embedded />
          </div>

          {/* Hueco lateral (xl): KPIs 2×2 o panel de alertas */}
          <div
            id="panel-excepciones"
            className={cn(
              "relative min-w-0 border-border/60 xl:min-w-[340px] xl:flex-1 xl:border-l",
              open ? "max-xl:h-[420px] max-xl:border-t" : "max-xl:hidden"
            )}
          >
            <section
              aria-label="Resumen de la lista"
              inert={open}
              className={cn(
                "absolute inset-0 grid grid-cols-2 grid-rows-2 gap-3 p-4 transition-[opacity,transform] duration-700 max-xl:hidden [&_.font-numeric]:text-[1.7rem]",
                // Columna estrecha: icono sobre las cifras para ganar ancho y no cortar el valor.
                "[&>div]:!flex-col [&>div]:!justify-center [&>div]:!gap-1 [&>div>div]:items-center [&>div>div]:text-center",
                EASE,
                open
                  ? "pointer-events-none translate-x-3 opacity-0"
                  : "translate-x-0 opacity-100"
              )}
            >
              {kpis}
            </section>

            <div
              inert={!open}
              className={cn(
                "absolute inset-0 origin-left transition-[opacity,transform,filter] duration-700 [perspective:1400px]",
                EASE,
                open
                  ? "opacity-100 [filter:blur(0)] [transform:none]"
                  : "pointer-events-none opacity-0 [filter:blur(6px)] [transform:translateX(24px)] xl:[transform:perspective(1400px)_rotateY(-60deg)]"
              )}
            >
              <ExcepcionesPanel
                casos={casos}
                counts={counts}
                activeTipo={activeTipo}
                totalIntervencion={totalIntervencion}
                totalAutomatico={totalAutomatico}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertButton({
  open,
  count,
  onClick,
}: {
  open: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls="panel-excepciones"
      aria-label={`Casos de excepción: ${count} requieren atención`}
      className={cn(
        "group inline-flex h-9 items-center gap-2 rounded-full border pl-3 pr-1.5 text-sm font-medium transition-[background-color,border-color,color,transform] [transition-timing-function:var(--ease-out)] active:scale-[0.97]",
        open
          ? "border-[color:var(--exception)]/40 bg-[color:var(--exception)]/10 text-[color:var(--exception)]"
          : "border-input bg-background/60 text-foreground hover:border-[color:var(--exception)]/40 hover:text-[color:var(--exception)]"
      )}
    >
      <Bell size={15} strokeWidth={1.9} className="icon-anim" />
      <span className="hidden sm:inline">Alertas</span>
      <span className="font-numeric inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[color:var(--exception)] px-1.5 text-[11px] font-semibold text-[color:var(--exception-foreground)] shadow-[0_0_0_3px_color-mix(in_oklab,var(--exception)_18%,transparent)]">
        +{count}
      </span>
      <ChevronDown
        size={14}
        strokeWidth={2}
        aria-hidden
        className={cn(
          "mr-1 transition-transform duration-300 [transition-timing-function:var(--ease-out)]",
          open && "rotate-180"
        )}
      />
    </button>
  );
}
