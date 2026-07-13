"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";
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

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "" || value === ALL) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  const categoria = searchParams.get("categoria") ?? ALL;
  const centro = searchParams.get("centro") ?? ALL;

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
      <Field label="Categoría">
        <div className="flex min-h-9 flex-wrap items-center gap-1.5">
          <CatChip
            active={categoria === ALL}
            onClick={() => setParam("categoria", ALL)}
          >
            Todas
          </CatChip>
          {categorias.map((c) => (
            <CatChip
              key={c}
              active={categoria === c}
              onClick={() => setParam("categoria", c)}
            >
              {CATEGORIA_LABEL[c] ?? c}
            </CatChip>
          ))}
        </div>
      </Field>

      <Field label="Centro">
        <Select value={centro} onValueChange={(v) => setParam("centro", v)}>
          <SelectTrigger className="h-9 w-56 rounded-full">
            <SelectValue placeholder="Todos" />
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
            className="h-9 w-24 rounded-full font-numeric"
          />
          <span className="text-xs text-muted-foreground">unidades</span>
        </div>
      </Field>

      {(categoria !== ALL || centro !== ALL || umbral !== String(UMBRAL_STOCK_BAJO_DEFECTO)) && (
        <button
          type="button"
          onClick={() => {
            setUmbral(String(UMBRAL_STOCK_BAJO_DEFECTO));
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

/** Chip de categoría (píldora conmutable). */
function CatChip({
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
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors [transition-timing-function:var(--ease-out)]",
        active
          ? "border-primary/40 gradient-brand-soft text-primary"
          : "border-border bg-background/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
