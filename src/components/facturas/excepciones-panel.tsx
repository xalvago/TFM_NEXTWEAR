"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { StateBadge } from "@/components/state-badge";
import {
  TIPO_EXCEPCION_LABEL,
  ESTADO_RESOLUCION_LABEL,
  estadoResolucionTone,
} from "@/lib/finance";
import type { CasoExcepcionItem } from "@/lib/queries/facturas";
import { cn } from "@/lib/utils";

/**
 * Panel de casos de excepción (casos_excepcion, polimórfica).
 * Valor central del sistema: debe verse de un vistazo y ser filtrable por tipo.
 * Cada caso enlaza al documento afectado (factura → detalle; albarán/pedido → id).
 * Incluye buscador instantáneo por nº de documento (factura / albarán / pedido).
 */
export function ExcepcionesPanel({
  casos,
  counts,
  activeTipo,
  total,
}: {
  casos: CasoExcepcionItem[];
  counts: Record<string, number>;
  activeTipo?: string;
  total: number;
}) {
  const tipos = Object.keys(TIPO_EXCEPCION_LABEL).filter((t) => counts[t] > 0);
  const [q, setQ] = useState("");

  const visibles = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return casos;
    return casos.filter((c) => {
      const haystack = [
        c.numero_factura,
        c.factura_id,
        c.albaran_id,
        c.pedido_id,
        c.descripcion,
        TIPO_EXCEPCION_LABEL[c.tipo_excepcion ?? ""],
        ESTADO_RESOLUCION_LABEL[c.estado_resolucion ?? ""],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [casos, q]);

  return (
    <section className="card-wash tint-rose relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl shadow-card">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{
          background:
            "linear-gradient(90deg, var(--exception), color-mix(in oklab, var(--exception), var(--pending) 55%))",
        }}
      />
      <header className="border-b border-border/60 px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="eyebrow text-[color:var(--exception)]">
              Requiere atención
            </span>
            <h2 className="font-display text-lg tracking-tight">
              Casos de excepción
            </h2>
          </div>
          <span className="font-numeric text-2xl leading-none text-[color:var(--exception)]">
            {total}
          </span>
        </div>

        {/* Chips por tipo */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip href="/facturas" active={!activeTipo}>
            Todos · {total}
          </Chip>
          {tipos.map((t) => (
            <Chip
              key={t}
              href={`/facturas?exc=${t}`}
              active={activeTipo === t}
            >
              {TIPO_EXCEPCION_LABEL[t]} · {counts[t]}
            </Chip>
          ))}
        </div>

        {/* Buscador instantáneo */}
        <div className="relative mt-3">
          <Search
            aria-hidden
            size={15}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar nº factura, albarán o pedido…"
            aria-label="Buscar en casos de excepción"
            className="h-9 w-full rounded-full border border-border/70 bg-background/70 pl-9 pr-9 text-sm outline-none transition-colors focus-visible:border-[color:var(--exception)]/50 focus-visible:ring-2 focus-visible:ring-[color:var(--exception)]/20"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Borrar búsqueda"
              className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      </header>

      <ul className="min-h-0 flex-1 divide-y divide-border/50 overflow-y-auto">
        {visibles.map((c) => (
          <li
            key={c.caso_id}
            className="flex flex-col gap-2 px-6 py-3.5 transition-colors hover:bg-[color:var(--exception)]/[0.04]"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <StateBadge tone="exception" dot={false}>
                  {TIPO_EXCEPCION_LABEL[c.tipo_excepcion ?? ""] ??
                    c.tipo_excepcion}
                </StateBadge>
                <StateBadge
                  tone={estadoResolucionTone(c.estado_resolucion)}
                  dot={false}
                >
                  {ESTADO_RESOLUCION_LABEL[c.estado_resolucion ?? ""] ??
                    c.estado_resolucion ??
                    "—"}
                </StateBadge>
              </div>
              <TargetLink caso={c} />
            </div>
            {c.descripcion && (
              <p className="text-sm text-muted-foreground leading-snug">
                {c.descripcion}
              </p>
            )}
          </li>
        ))}
        {visibles.length === 0 && (
          <li className="px-6 py-8 text-center text-sm text-muted-foreground">
            {q
              ? "Ningún caso coincide con la búsqueda."
              : "Sin casos para este tipo."}
          </li>
        )}
      </ul>
    </section>
  );
}

function TargetLink({ caso }: { caso: CasoExcepcionItem }) {
  if (caso.target === "factura" && caso.factura_id) {
    return (
      <Link
        href={`/facturas/${caso.factura_id}`}
        className="font-numeric text-xs text-primary hover:underline underline-offset-2 whitespace-nowrap"
      >
        {caso.numero_factura ?? caso.factura_id} →
      </Link>
    );
  }
  const id =
    caso.albaran_id ?? caso.pedido_id ?? caso.factura_id ?? "—";
  const label =
    caso.target === "albaran"
      ? "Albarán"
      : caso.target === "pedido"
        ? "Pedido"
        : "Doc.";
  return (
    <span className="font-numeric text-xs text-muted-foreground whitespace-nowrap">
      {label} {id}
    </span>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        active
          ? "border-[color:var(--exception)]/40 bg-[color:var(--exception)]/12 text-[color:var(--exception)]"
          : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30"
      )}
    >
      {children}
    </Link>
  );
}
