"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import {
  CANAL_LABEL,
  ESTADO_FACTURA,
  ESTADO_LABEL,
  MONEDA_LABEL,
} from "@/lib/finance";
import type { ProveedorOption } from "@/lib/queries/facturas";
import { cn } from "@/lib/utils";
import { CanalIcon, MonedaIcon, PaisFlag } from "@/components/dim-icon";

const ALL = "__all__";

export function FacturasFilters({
  proveedores,
  embedded = false,
  actions,
}: {
  proveedores: ProveedorOption[];
  embedded?: boolean;
  /** Controles extra al final de la barra principal (p. ej. botón de alertas). */
  actions?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  // Búsqueda con debounce local.
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

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => setParam("q", q || null), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const estado = searchParams.get("estado") ?? ALL;
  const proveedor = searchParams.get("proveedor") ?? ALL;
  const moneda = searchParams.get("moneda") ?? ALL;
  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";
  const pais = searchParams.get("pais") ?? ALL;
  const canal = searchParams.get("canal") ?? ALL;
  const min = searchParams.get("min") ?? "";
  const max = searchParams.get("max") ?? "";
  const humano = searchParams.get("humano") === "1";
  const saldo = searchParams.get("saldo") === "1";
  const paises = [
    ...new Set(proveedores.map((p) => p.pais).filter((x): x is string => !!x)),
  ].sort();
  const canales = [
    ...new Set(
      proveedores.map((p) => p.canal_recepcion).filter((x): x is string => !!x)
    ),
  ].sort();

  const nAvanzados = [
    desde,
    hasta,
    pais !== ALL,
    canal !== ALL,
    min,
    max,
    humano,
    saldo,
  ].filter(Boolean).length;
  const hayFiltros =
    estado !== ALL || proveedor !== ALL || moneda !== ALL || nAvanzados > 0 || q;

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
            placeholder="Buscar nº F-2026-…"
            aria-label="Buscar por nº de factura"
            className="h-9 w-48 rounded-full border border-input bg-background/70 pl-9 pr-8 text-sm outline-none transition-colors focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20"
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

        <Select value={estado} onValueChange={(v) => setParam("estado", v)}>
          <SelectTrigger aria-label="Estado" className="h-9 w-48 rounded-full">
            <SelectValue>
              {(v: string) =>
                v === ALL ? "Todos los estados" : (ESTADO_LABEL[v] ?? v)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los estados</SelectItem>
            {ESTADO_FACTURA.map((e) => (
              <SelectItem key={e} value={e}>
                {ESTADO_LABEL[e]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={proveedor} onValueChange={(v) => setParam("proveedor", v)}>
          <SelectTrigger aria-label="Proveedor" className="h-9 w-52 rounded-full">
            <SelectValue>
              {(v: string) =>
                v === ALL
                  ? "Todos los proveedores"
                  : (proveedores.find((p) => p.proveedor_id === v)?.razon_social ?? v)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los proveedores</SelectItem>
            {proveedores.map((p) => (
              <SelectItem key={p.proveedor_id} value={p.proveedor_id}>
                {p.razon_social}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div
          role="group"
          aria-label="Moneda"
          className="flex h-9 items-center gap-0.5 rounded-full border border-input bg-background/60 p-0.5"
        >
          <SegChip active={moneda === ALL} onClick={() => setParam("moneda", ALL)}>
            Todas
          </SegChip>
          {Object.keys(MONEDA_LABEL).map((m) => (
            <SegChip
              key={m}
              active={moneda === m}
              onClick={() => setParam("moneda", m)}
            >
              <MonedaIcon moneda={m} size={12} />
              {m}
            </SegChip>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setMas((v) => !v)}
          aria-expanded={mas}
          aria-controls="filtros-avanzados"
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
              setQ("");
              startTransition(() => router.replace(pathname, { scroll: false }));
            }}
            className="h-9 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground active:scale-[0.97]"
          >
            Limpiar
          </button>
        )}

        {actions && <div className="ml-auto">{actions}</div>}
      </div>

      {/* Filtros secundarios plegables */}
      <div
        id="filtros-avanzados"
        className={cn(
          "grid transition-[grid-template-rows] duration-500 [transition-timing-function:var(--ease-out)]",
          mas ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden" inert={!mas}>
          <div className="flex flex-wrap items-end gap-3 border-t border-border/50 bg-background/30 px-4 py-3">
            <Field label="Desde">
              <Input
                type="date"
                value={desde}
                onChange={(e) => setParam("desde", e.target.value || null)}
                className="h-9 w-40 rounded-full"
              />
            </Field>

            <Field label="Hasta">
              <Input
                type="date"
                value={hasta}
                onChange={(e) => setParam("hasta", e.target.value || null)}
                className="h-9 w-40 rounded-full"
              />
            </Field>

            <Field label="País del proveedor">
              <Select value={pais} onValueChange={(v) => setParam("pais", v)}>
                <SelectTrigger className="h-9 w-44 rounded-full">
                  <SelectValue>
                    {(v: string) =>
                      v === ALL ? (
                        "Todos los países"
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <PaisFlag pais={v} size={15} />
                          {v}
                        </span>
                      )
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos los países</SelectItem>
                  {paises.map((p) => (
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
              <div className="flex h-9 items-center gap-0.5 rounded-full border border-input bg-background/60 p-0.5">
                <SegChip active={canal === ALL} onClick={() => setParam("canal", ALL)}>
                  Todos
                </SegChip>
                {canales.map((c) => (
                  <SegChip key={c} active={canal === c} onClick={() => setParam("canal", c)}>
                    <CanalIcon canal={c} size={12} />
                    {CANAL_LABEL[c] ?? c}
                  </SegChip>
                ))}
              </div>
            </Field>

            <Field label="Importe EUR (desde · hasta)">
              <div className="flex items-center gap-1.5">
                <NumInput
                  key={`min-${min}`}
                  value={min}
                  placeholder="mín."
                  label="Importe mínimo en EUR"
                  onCommit={(v) => setParam("min", v)}
                />
                <span aria-hidden className="text-muted-foreground">
                  –
                </span>
                <NumInput
                  key={`max-${max}`}
                  value={max}
                  placeholder="máx."
                  label="Importe máximo en EUR"
                  onCommit={(v) => setParam("max", v)}
                />
              </div>
            </Field>

            <Field label="Revisión">
              <div className="flex h-9 items-center gap-0.5 rounded-full border border-input bg-background/60 p-0.5">
                <SegChip active={humano} onClick={() => setParam("humano", humano ? null : "1")}>
                  Requiere humano
                </SegChip>
                <SegChip active={saldo} onClick={() => setParam("saldo", saldo ? null : "1")}>
                  Con saldo
                </SegChip>
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

/** Número con confirmación al salir del campo o pulsar Intro (evita una consulta por tecla). */
function NumInput({
  value,
  placeholder,
  label,
  onCommit,
}: {
  value: string;
  placeholder: string;
  label: string;
  onCommit: (v: string | null) => void;
}) {
  const [local, setLocal] = useState(value);
  const commit = () => {
    if (local !== value) onCommit(local === "" ? null : local);
  };
  return (
    <input
      type="number"
      inputMode="decimal"
      value={local}
      placeholder={placeholder}
      aria-label={label}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      className="h-9 w-24 rounded-full border border-input bg-background/70 px-3 text-sm outline-none transition-colors focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20"
    />
  );
}
