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
import { Search, X } from "lucide-react";
import {
  ESTADO_FACTURA,
  ESTADO_LABEL,
  MONEDA_LABEL,
} from "@/lib/finance";
import type { ProveedorOption } from "@/lib/queries/facturas";
import { cn } from "@/lib/utils";

const ALL = "__all__";

export function FacturasFilters({
  proveedores,
  embedded = false,
}: {
  proveedores: ProveedorOption[];
  embedded?: boolean;
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

  const hayFiltros =
    estado !== ALL ||
    proveedor !== ALL ||
    moneda !== ALL ||
    desde ||
    hasta ||
    q;

  return (
    <div
      className={cn(
        "relative flex flex-wrap items-end gap-3",
        embedded
          ? "border-b border-border/60 px-5 py-4"
          : "card-wash rounded-2xl p-4 shadow-card"
      )}
      data-pending={pending ? "" : undefined}
    >
      <Field label="Buscar nº">
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
            placeholder="F-2026-…"
            aria-label="Buscar por nº de factura"
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
      </Field>

      <Field label="Estado">
        <Select value={estado} onValueChange={(v) => setParam("estado", v)}>
          <SelectTrigger className="h-9 w-52 rounded-full">
            <SelectValue placeholder="Todos" />
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
      </Field>

      <Field label="Proveedor">
        <Select value={proveedor} onValueChange={(v) => setParam("proveedor", v)}>
          <SelectTrigger className="h-9 w-56 rounded-full">
            <SelectValue placeholder="Todos" />
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
      </Field>

      <Field label="Moneda">
        <div className="flex h-9 items-center gap-0.5 rounded-full border border-input bg-background/60 p-0.5">
          <SegChip active={moneda === ALL} onClick={() => setParam("moneda", ALL)}>
            Todas
          </SegChip>
          {Object.keys(MONEDA_LABEL).map((m) => (
            <SegChip
              key={m}
              active={moneda === m}
              onClick={() => setParam("moneda", m)}
            >
              {m}
            </SegChip>
          ))}
        </div>
      </Field>

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

      {hayFiltros && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
          className="h-9 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/60 active:scale-[0.97]"
        >
          Limpiar
        </button>
      )}
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
        "rounded-full px-2.5 text-xs font-medium leading-8 transition-colors [transition-timing-function:var(--ease-out)]",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
