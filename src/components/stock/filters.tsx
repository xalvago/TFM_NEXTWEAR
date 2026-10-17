"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CentroOption } from "@/lib/queries/stock";
import { UMBRAL_STOCK_BAJO_DEFECTO } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ALL = "__all__";

const CATEGORIA_LABEL: Record<string, string> = {
  accesorio: "Accesorio",
  calzado: "Calzado",
  camiseta: "Camiseta",
  chaqueta: "Chaqueta",
  pantalon: "Pantalón",
  sudadera: "Sudadera",
};

/**
 * Misma estructura que los filtros de Facturas: barra principal con lo habitual
 * (búsqueda, categoría, centro, nivel) y «Más filtros» plegable con lo secundario.
 */
export function StockFilters({
  categorias,
  centros,
  embedded = false,
}: {
  categorias: string[];
  centros: CentroOption[];
  embedded?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [umbral, setUmbral] = useState(
    searchParams.get("umbral") ?? String(UMBRAL_STOCK_BAJO_DEFECTO)
  );
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "" || value === ALL) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  // Búsqueda con debounce local.
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => setParam("q", q || null), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const categoria = searchParams.get("categoria") ?? ALL;
  const centro = searchParams.get("centro") ?? ALL;
  const tipo = searchParams.get("tipo") ?? ALL;
  const nivel = searchParams.get("nivel") ?? ALL;

  const umbralCambiado = umbral !== String(UMBRAL_STOCK_BAJO_DEFECTO);
  const nAvanzados = [tipo !== ALL, umbralCambiado].filter(Boolean).length;
  const hayFiltros =
    categoria !== ALL || centro !== ALL || nivel !== ALL || nAvanzados > 0 || q;

  // Los filtros secundarios arrancan abiertos solo si ya hay alguno activo.
  const [mas, setMas] = useState(nAvanzados > 0);

  return (
    <div
      className={cn(
        "relative",
        embedded
          ? "border-b border-border/60"
          : "card-wash rounded-2xl shadow-card"
      )}
      data-pending={pending ? "" : undefined}
    >
      {/* Barra principal: siempre visible */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <div className="relative">
          <Search
            aria-hidden
            size={15}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="SKU o producto…"
            aria-label="Buscar por SKU o producto"
            className="h-9 w-44 rounded-full border border-input bg-background/70 pl-9 pr-8 text-sm outline-none transition-colors focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Borrar búsqueda"
              className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X size={13} strokeWidth={2} />
            </button>
          )}
        </div>

        <Select value={categoria} onValueChange={(v) => setParam("categoria", v)}>
          <SelectTrigger aria-label="Categoría" className="h-9 w-44 rounded-full">
            <SelectValue>
              {(v: string) =>
                v === ALL ? "Todas las categorías" : (CATEGORIA_LABEL[v] ?? v)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las categorías</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORIA_LABEL[c] ?? c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={centro} onValueChange={(v) => setParam("centro", v)}>
          <SelectTrigger aria-label="Centro" className="h-9 w-52 rounded-full">
            <SelectValue>
              {(v: string) =>
                v === ALL
                  ? "Todos los centros"
                  : (centros.find((c) => c.centro_coste_id === v)?.nombre ?? v)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los centros</SelectItem>
            {centros.map((c) => (
              <SelectItem key={c.centro_coste_id} value={c.centro_coste_id}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div
          role="group"
          aria-label="Nivel de stock"
          className="flex h-9 items-center gap-0.5 rounded-full border border-input bg-background/60 p-0.5"
        >
          {[
            [ALL, "Todos"],
            ["bajo", "Bajo"],
            ["ok", "Suficiente"],
          ].map(([v, l]) => (
            <SegChip key={v} active={nivel === v} onClick={() => setParam("nivel", v)}>
              {l}
            </SegChip>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setMas((v) => !v)}
          aria-expanded={mas}
          aria-controls="filtros-stock-avanzados"
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
            onClick={() => {
              setUmbral(String(UMBRAL_STOCK_BAJO_DEFECTO));
              setQ("");
              startTransition(() => router.replace(pathname, { scroll: false }));
            }}
            className="h-9 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground active:scale-[0.97]"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Filtros secundarios plegables */}
      <div
        id="filtros-stock-avanzados"
        className={cn(
          "grid transition-[grid-template-rows] duration-500 [transition-timing-function:var(--ease-out)]",
          mas ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden" inert={!mas}>
          <div className="flex flex-wrap items-end gap-3 border-t border-border/50 bg-background/30 px-4 py-3">
            <Field label="Tipo de centro">
              <div className="flex h-9 items-center gap-0.5 rounded-full border border-input bg-background/60 p-0.5">
                {[
                  [ALL, "Todos"],
                  ["tienda_fisica", "Tiendas"],
                  ["ecommerce", "Ecommerce"],
                  ["almacen_central", "Almacén"],
                ].map(([v, l]) => (
                  <SegChip key={v} active={tipo === v} onClick={() => setParam("tipo", v)}>
                    {l}
                  </SegChip>
                ))}
              </div>
            </Field>

            <Field label="Umbral stock bajo">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  step={10}
                  value={umbral}
                  onChange={(e) => setUmbral(e.target.value)}
                  onBlur={() => setParam("umbral", umbral || null)}
                  onKeyDown={(e) => e.key === "Enter" && setParam("umbral", umbral || null)}
                  className="h-9 w-24 rounded-full font-numeric"
                />
                <span className="text-xs text-muted-foreground">unidades</span>
              </div>
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="eyebrow">{label}</Label>
      {children}
    </div>
  );
}

/** Botón de un control segmentado (chips tipo píldora). */
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
