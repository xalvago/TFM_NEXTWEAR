"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CANAL_LABEL, MONEDA_LABEL } from "@/lib/finance";
import type { Opciones } from "@/lib/queries/executive";
import { cn } from "@/lib/utils";
import { CanalIcon, MonedaIcon, PaisFlag } from "@/components/dim-icon";

const ALL = "__all__";

// Filtros no temporales de la vista ejecutiva (el año tiene su propio selector).
const KEYS = ["proveedor", "pais", "moneda", "canal"] as const;

/**
 * Filtros globales de la vista ejecutiva: barra principal (proveedor, moneda) y
 * «Más filtros» plegable (país, canal). El estado vive en la URL (compartible) y
 * el servidor recalcula todo con él.
 */
export function ExecFilters({
  opciones,
  embedded = false,
}: {
  opciones: Opciones;
  embedded?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "" || value === ALL) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function limpiar() {
    const params = new URLSearchParams(searchParams.toString());
    for (const k of KEYS) params.delete(k);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  const proveedor = searchParams.get("proveedor") ?? ALL;
  const pais = searchParams.get("pais") ?? ALL;
  const moneda = searchParams.get("moneda") ?? ALL;
  const canal = searchParams.get("canal") ?? ALL;

  const nombreProveedor = (id: string) =>
    id === ALL
      ? "Todos los proveedores"
      : (opciones.proveedores.find((p) => p.id === id)?.nombre ?? id);
  const nombrePais = (p: string) => (p === ALL ? "Todos los países" : p);

  const hayFiltros = [proveedor, pais, moneda, canal].some((v) => v !== ALL);
  const nAvanzados = [pais, canal].filter((v) => v !== ALL).length;

  // Los secundarios arrancan abiertos solo si ya hay alguno activo.
  const [mas, setMas] = useState(nAvanzados > 0);

  return (
    <div
      className={cn(
        "relative transition-opacity",
        embedded
          ? "rounded-xl border border-border/60 bg-background/40"
          : "card-wash rounded-2xl shadow-card",
        pending && "opacity-70"
      )}
      data-pending={pending ? "" : undefined}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <Field label="Proveedor">
          <Select value={proveedor} onValueChange={(v) => setParam("proveedor", v)}>
            <SelectTrigger aria-label="Proveedor" className="h-9 w-52 rounded-full text-xs">
              <SelectValue>{(v: string) => nombreProveedor(v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los proveedores</SelectItem>
              {opciones.proveedores.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Moneda">
          <Seg>
            <SegChip active={moneda === ALL} onClick={() => setParam("moneda", ALL)}>
              Todas
            </SegChip>
            {Object.keys(MONEDA_LABEL).map((m) => (
              <SegChip key={m} active={moneda === m} onClick={() => setParam("moneda", m)}>
                <MonedaIcon moneda={m} size={12} />
                {m}
              </SegChip>
            ))}
          </Seg>
        </Field>

        <button
          type="button"
          onClick={() => setMas((v) => !v)}
          aria-expanded={mas}
          aria-controls="filtros-exec-avanzados"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-[background-color,border-color,color,transform] [transition-timing-function:var(--ease-out)] active:scale-[0.97]",
            mas || nAvanzados > 0
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-input bg-background/60 text-muted-foreground hover:text-foreground"
          )}
        >
          <SlidersHorizontal size={14} strokeWidth={1.9} />
          Más filtros
          {nAvanzados > 0 && (
            <span className="font-numeric grid size-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {nAvanzados}
            </span>
          )}
          <ChevronDown
            size={13}
            strokeWidth={2}
            aria-hidden
            className={cn(
              "transition-transform duration-300 [transition-timing-function:var(--ease-out)]",
              mas && "rotate-180"
            )}
          />
        </button>

        {hayFiltros && (
          <button
            type="button"
            onClick={limpiar}
            className="h-9 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground active:scale-[0.97]"
          >
            Limpiar
          </button>
        )}
      </div>

      <div
        id="filtros-exec-avanzados"
        className={cn(
          "grid transition-[grid-template-rows] duration-500 [transition-timing-function:var(--ease-out)]",
          mas ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden" inert={!mas}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/50 bg-background/30 px-4 py-2.5">
            <Field label="País">
              <Select value={pais} onValueChange={(v) => setParam("pais", v)}>
                <SelectTrigger aria-label="País" className="h-9 w-44 rounded-full text-xs">
                  <SelectValue>
                    {(v: string) => (
                      <span className="flex items-center gap-1.5">
                        {v !== ALL && <PaisFlag pais={v} size={15} />}
                        {nombrePais(v)}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos los países</SelectItem>
                  {opciones.paises.map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className="flex items-center gap-1.5">
                        <PaisFlag pais={p} size={15} />
                        {p}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Canal">
              <Seg>
                <SegChip active={canal === ALL} onClick={() => setParam("canal", ALL)}>
                  Todos
                </SegChip>
                {opciones.canales.map((c) => (
                  <SegChip key={c} active={canal === c} onClick={() => setParam("canal", c)}>
                    <CanalIcon canal={c} size={12} />
                    {CANAL_LABEL[c] ?? c}
                  </SegChip>
                ))}
              </Seg>
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="eyebrow">{label}</span>
      {children}
    </div>
  );
}

function Seg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-9 items-center gap-0.5 rounded-full border border-input bg-background/60 p-0.5">
      {children}
    </div>
  );
}

function SegChip({
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
        "inline-flex items-center gap-1 rounded-full px-2.5 text-xs font-medium leading-8 transition-colors [transition-timing-function:var(--ease-out)]",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
