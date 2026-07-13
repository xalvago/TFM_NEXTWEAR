# Conciliación real + sección Pagos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **No git repo in this project** (`git rev-parse --is-inside-work-tree` fails — no `.git`). Skip all `git add`/`git commit` steps from the base skill template; each task's "commit" step is replaced with "save file" (already done by Write/Edit) — nothing further to do.

**Goal:** Replace the text-parsing JOIN (`albaran_ids_ref`) with the real `facturas_albaranes` bridge table, surface `casos_excepcion.estado_resolucion`, and add a filterable Pagos section to `/facturas`, backed by 2 seeded demo rows so the UI isn't empty.

**Architecture:** Server-side Supabase queries in `src/lib/queries/*.ts` (service-role client, read-only) feed React Server Components in `src/app/(app)/facturas/*`; presentational pieces are client components under `src/components/{facturas,pagos}/*` following the existing `card-wash` / `Panel` / `StateBadge` / `SegChip` patterns already in the codebase. No new tables — schema already migrated (see `supabase/migrations/01`–`07`).

**Tech Stack:** Next.js 16 App Router (Server Components + `force-dynamic`), TypeScript, `@supabase/supabase-js` service-role client (`getSupabaseAdmin()`), Tailwind v4, no test runner (project has no jest/vitest — verification is `npm run lint` + manual `curl`/browser check, matching existing project convention).

## Global Constraints

- Money sums always use `_eur` columns, never mix `_original` across currencies (CLAUDE.md invariant).
- Dashboard is read-only against the DB from the UI — the only writes in this plan are the 2 demo-seed migration statements applied directly via Supabase MCP, not through app code.
- Follow existing component conventions: `card-wash` for containers, `Panel` component for titled sections, `StateBadge` for status pills, `SegChip` for segmented filter controls, `PaginationBar` only if a table can exceed ~12 rows.
- `src/lib/queries/*.ts` files start with `import "server-only";` and use `getSupabaseAdmin()` — never call Supabase from a client component.

---

### Task 1: Real JOIN for `facturas_albaranes` + `estado_resolucion` on casos

**Files:**
- Modify: `src/lib/queries/facturas.ts`

**Interfaces:**
- Produces: `CasoExcepcionItem.estado_resolucion: string | null` (consumed by Task 3's UI components).
- Produces: `getFacturaDetalle()` still returns `FacturaDetalle.albaranes: AlbaranRef[]`, same shape as before, now populated via the bridge table.

- [ ] **Step 1: Add `estado_resolucion` to `CasoExcepcionItem` and to `getCasosExcepcion`**

In `src/lib/queries/facturas.ts`, update the interface (around line 94):

```typescript
export interface CasoExcepcionItem {
  caso_id: string;
  tipo_excepcion: string | null;
  descripcion: string | null;
  factura_id: string | null;
  albaran_id: string | null;
  pedido_id: string | null;
  estado_resolucion: string | null;
  // Contexto del documento afectado (para el enlace/etiqueta):
  numero_factura: string | null;
  estado_factura: string | null;
  target: "factura" | "albaran" | "pedido" | "desconocido";
}
```

Update `getCasosExcepcion`'s query and mapping:

```typescript
export async function getCasosExcepcion(
  tipo?: string
): Promise<CasoExcepcionItem[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("casos_excepcion")
    .select(
      "caso_id, tipo_excepcion, descripcion, factura_id, albaran_id, pedido_id, estado_resolucion, facturas(numero_factura, estado)"
    )
    .order("caso_id");
  if (tipo) query = query.eq("tipo_excepcion", tipo);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((c) => {
    const fac = c.facturas as unknown as {
      numero_factura: string | null;
      estado: string | null;
    } | null;
    const target: CasoExcepcionItem["target"] = c.factura_id
      ? "factura"
      : c.albaran_id
        ? "albaran"
        : c.pedido_id
          ? "pedido"
          : "desconocido";
    return {
      caso_id: c.caso_id,
      tipo_excepcion: c.tipo_excepcion,
      descripcion: c.descripcion,
      factura_id: c.factura_id,
      albaran_id: c.albaran_id,
      pedido_id: c.pedido_id,
      estado_resolucion: c.estado_resolucion,
      numero_factura: fac?.numero_factura ?? null,
      estado_factura: fac?.estado ?? null,
      target,
    };
  });
}
```

(Only the `.select(...)` string gains `estado_resolucion`, and the return object gains the `estado_resolucion: c.estado_resolucion` line — rest is unchanged.)

- [ ] **Step 2: Replace the `albaran_ids_ref` text parse with a real JOIN in `getFacturaDetalle`**

Delete the `parseAlbaranIds` function entirely (currently right above `getFacturaDetalle`, lines 224–231):

```typescript
/** Parte "ALB-1;ALB-2" en ["ALB-1","ALB-2"]. */
function parseAlbaranIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[;,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
```

In `getFacturaDetalle`, delete the line `const albaranIds = parseAlbaranIds(factura.albaran_ids_ref);` and replace the `albaranesRes` entry inside the `Promise.all([...])` array:

```typescript
  const [lineasRes, pedidoRes, albaranesRes, casosRes] = await Promise.all([
    supabase
      .from("facturas_lineas")
      .select(
        "linea_id, sku, descripcion, centro_coste_id, cantidad, precio_unitario_original, precio_unitario_eur, descuento_pct, total_linea_original, total_linea_eur, flag_revision, motivo_flag"
      )
      .eq("factura_id", facturaId)
      .order("linea_id"),
    factura.pedido_id_ref
      ? supabase
          .from("pedidos")
          .select(
            "pedido_id, estado, fecha_pedido, fecha_entrega_prevista, moneda"
          )
          .eq("pedido_id", factura.pedido_id_ref)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("facturas_albaranes")
      .select("albaranes(albaran_id, estado, fecha_entrega)")
      .eq("factura_id", facturaId),
    supabase
      .from("casos_excepcion")
      .select(
        "caso_id, tipo_excepcion, descripcion, factura_id, albaran_id, pedido_id, estado_resolucion"
      )
      .eq("factura_id", facturaId),
  ]);
```

Update the `casos` mapping to include `estado_resolucion` (add the field to the returned object):

```typescript
  const casos: CasoExcepcionItem[] = (casosRes.data ?? []).map((c) => ({
    caso_id: c.caso_id,
    tipo_excepcion: c.tipo_excepcion,
    descripcion: c.descripcion,
    factura_id: c.factura_id,
    albaran_id: c.albaran_id,
    pedido_id: c.pedido_id,
    estado_resolucion: c.estado_resolucion,
    numero_factura: factura.numero_factura,
    estado_factura: factura.estado,
    target: "factura",
  }));
```

Replace the final `albaranes:` line in the returned `FacturaDetalle` object. Currently:

```typescript
    albaranes: (albaranesRes.data ?? []) as AlbaranRef[],
```

Replace with a flatten-and-filter (the bridge query returns one row per link, each wrapping the joined `albaranes` object, which can be `null` if orphaned — none are today, but stay defensive):

```typescript
    albaranes: (albaranesRes.data ?? [])
      .map((r) => r.albaranes as unknown as AlbaranRef | null)
      .filter((a): a is AlbaranRef => a !== null),
```

- [ ] **Step 3: Verify types compile**

Run: `npm run lint`
Expected: no errors in `src/lib/queries/facturas.ts`.

- [ ] **Step 4: Manual check against real data**

Run (from project root, dev server already running on port 3000):
```bash
curl -s http://localhost:3000/facturas/F-2024-001 | grep -o "Albarán" | head -1
```
Expected: prints `Albarán` if that factura has a linked albarán (adjust the ID to any real `factura_id` from `select factura_id from facturas limit 1` if `F-2024-001` doesn't exist — IDs follow the dataset's own convention, check via Supabase MCP `execute_sql` if unsure).

---

### Task 2: New labels/tones in `finance.ts`

**Files:**
- Modify: `src/lib/finance.ts`

**Interfaces:**
- Produces: `ESTADO_RESOLUCION_LABEL: Record<string,string>`, `estadoResolucionTone(estado): StateTone`, `PAGO_ESTADO_LABEL: Record<string,string>`, `pagoEstadoTone(estado): StateTone` — consumed by Task 3 (excepciones UI) and Task 5 (pagos UI).
- Consumes: existing `StateTone` type (already exported, line 122).

- [ ] **Step 1: Add `iban_no_coincide` to `TIPO_EXCEPCION_LABEL`**

In `src/lib/finance.ts`, update the existing object (around line 147):

```typescript
export const TIPO_EXCEPCION_LABEL: Record<string, string> = {
  duplicado: "Duplicado",
  importe_distinto: "Importe distinto",
  sin_pedido: "Sin pedido",
  nota_credito: "Nota de crédito",
  entrega_parcial: "Entrega parcial",
  salto_divisa: "Salto de divisa",
  producto_no_reconocido: "Producto no reconocido",
  entrega_incompleta: "Entrega incompleta",
  mercancia_danada: "Mercancía dañada",
  iban_no_coincide: "IBAN no coincide",
};
```

- [ ] **Step 2: Add resolution label/tone right after it**

Append immediately after the `TIPO_EXCEPCION_LABEL` block:

```typescript
export const ESTADO_RESOLUCION_LABEL: Record<string, string> = {
  abierto: "Abierto",
  en_revision: "En revisión",
  resuelto_ok: "Resuelto",
  resuelto_fraude: "Fraude confirmado",
  descartado: "Descartado",
};

export function estadoResolucionTone(
  estado: string | null | undefined
): StateTone {
  switch (estado) {
    case "resuelto_ok":
      return "ok";
    case "resuelto_fraude":
      return "exception";
    case "abierto":
    case "en_revision":
      return "pending";
    case "descartado":
      return "neutral";
    default:
      return "neutral";
  }
}
```

- [ ] **Step 3: Add pago label/tone before the "Divisas" section**

Insert right before the `// --- Divisas ---` comment (around line 159):

```typescript
// --- Estados de pago -----------------------------------------------------------

export const PAGO_ESTADO_LABEL: Record<string, string> = {
  programado: "Programado",
  retenido: "Retenido",
  ejecutado: "Ejecutado",
  rechazado: "Rechazado",
  anulado: "Anulado",
};

export function pagoEstadoTone(estado: string | null | undefined): StateTone {
  switch (estado) {
    case "ejecutado":
      return "ok";
    case "rechazado":
      return "exception";
    case "programado":
    case "retenido":
      return "pending";
    case "anulado":
      return "neutral";
    default:
      return "neutral";
  }
}
```

- [ ] **Step 4: Verify**

Run: `npm run lint`
Expected: no errors.

---

### Task 3: Show resolution badge in excepciones UI

**Files:**
- Modify: `src/components/facturas/excepciones-panel.tsx`
- Modify: `src/app/(app)/facturas/[id]/page.tsx`

**Interfaces:**
- Consumes: `CasoExcepcionItem.estado_resolucion` (Task 1), `ESTADO_RESOLUCION_LABEL` / `estadoResolucionTone` (Task 2).

- [ ] **Step 1: Add the badge in `ExcepcionesPanel`**

In `src/components/facturas/excepciones-panel.tsx`, update the import line (currently `import { TIPO_EXCEPCION_LABEL } from "@/lib/finance";`):

```typescript
import {
  TIPO_EXCEPCION_LABEL,
  ESTADO_RESOLUCION_LABEL,
  estadoResolucionTone,
} from "@/lib/finance";
```

In the `visibles` search haystack (inside the `useMemo`), add the resolution label so search matches it too:

```typescript
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
```

In the `<li>` render block, add a second badge next to the type badge:

```typescript
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <StateBadge tone="exception" dot={false}>
                  {TIPO_EXCEPCION_LABEL[c.tipo_excepcion ?? ""] ??
                    c.tipo_excepcion}
                </StateBadge>
                <StateBadge tone={estadoResolucionTone(c.estado_resolucion)} dot={false}>
                  {ESTADO_RESOLUCION_LABEL[c.estado_resolucion ?? ""] ??
                    c.estado_resolucion ?? "—"}
                </StateBadge>
              </div>
              <TargetLink caso={c} />
            </div>
```

(This replaces the existing `<div className="flex items-center justify-between gap-2">` block that currently contains a single `StateBadge` + `TargetLink`.)

- [ ] **Step 2: Add the badge in the factura detail page's casos rail**

In `src/app/(app)/facturas/[id]/page.tsx`, update the import (currently pulls `TIPO_EXCEPCION_LABEL` from `@/lib/finance`):

```typescript
import {
  formatEUR,
  formatMoneda,
  formatDate,
  formatInt,
  ESTADO_LABEL,
  estadoTone,
  TIPO_EXCEPCION_LABEL,
  ESTADO_RESOLUCION_LABEL,
  estadoResolucionTone,
} from "@/lib/finance";
```

In the "Casos de excepción" panel's `<li>` (inside the `casos.map`), add the second badge:

```typescript
                {casos.map((c) => (
                  <li key={c.caso_id} className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StateBadge tone="exception" dot={false}>
                        {TIPO_EXCEPCION_LABEL[c.tipo_excepcion ?? ""] ??
                          c.tipo_excepcion}
                      </StateBadge>
                      <StateBadge tone={estadoResolucionTone(c.estado_resolucion)} dot={false}>
                        {ESTADO_RESOLUCION_LABEL[c.estado_resolucion ?? ""] ??
                          c.estado_resolucion ?? "—"}
                      </StateBadge>
                    </div>
                    {c.descripcion && (
                      <p className="text-sm text-muted-foreground leading-snug">
                        {c.descripcion}
                      </p>
                    )}
                  </li>
                ))}
```

- [ ] **Step 3: Verify**

Run: `npm run lint`
Expected: no errors.

Run (dev server on port 3000):
```bash
curl -s http://localhost:3000/facturas | grep -o "Abierto\|En revisión\|Resuelto" | sort -u
```
Expected: at least `Abierto` appears (all 84 seeded casos default to `estado_resolucion='abierto'`).

---

### Task 4: `pagos` query module

**Files:**
- Create: `src/lib/queries/pagos.ts`

**Interfaces:**
- Produces: `PagoListItem` type, `getPagos(filtros?: { estadoPago?: string }): Promise<PagoListItem[]>` — consumed by Task 5's `PagosSection`/`PagosTable` and Task 6's page wiring.

- [ ] **Step 1: Write the query module**

Create `src/lib/queries/pagos.ts`:

```typescript
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Consultas de la sección "Pagos" (tesorería) dentro de Facturas y conciliación.
 * facturas.numero_factura / razon_social_proveedor ya están denormalizados en
 * facturas, así que no hace falta un segundo JOIN a maestro_proveedores.
 */

export interface PagosFiltros {
  estadoPago?: string;
}

export interface PagoListItem {
  pago_id: string;
  factura_id: string;
  numero_factura: string | null;
  razon_social: string | null;
  fecha_pago: string | null;
  fecha_vencimiento: string | null;
  importe_eur: number | null;
  estado_pago: string | null;
  es_pago_parcial: boolean | null;
  medio_pago: string | null;
}

type EmbeddedFactura = {
  numero_factura: string | null;
  razon_social_proveedor: string | null;
} | null;

export async function getPagos(
  filtros: PagosFiltros = {}
): Promise<PagoListItem[]> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("pagos")
    .select(
      "pago_id, factura_id, fecha_pago, fecha_vencimiento, importe_eur, estado_pago, es_pago_parcial, medio_pago, facturas(numero_factura, razon_social_proveedor)"
    )
    .order("fecha_pago", { ascending: false, nullsFirst: false });

  if (filtros.estadoPago) query = query.eq("estado_pago", filtros.estadoPago);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((p) => {
    const fac = p.facturas as unknown as EmbeddedFactura;
    return {
      pago_id: p.pago_id,
      factura_id: p.factura_id,
      numero_factura: fac?.numero_factura ?? null,
      razon_social: fac?.razon_social_proveedor ?? null,
      fecha_pago: p.fecha_pago,
      fecha_vencimiento: p.fecha_vencimiento,
      importe_eur: p.importe_eur,
      estado_pago: p.estado_pago,
      es_pago_parcial: p.es_pago_parcial,
      medio_pago: p.medio_pago,
    };
  });
}
```

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: no errors.

---

### Task 5: Pagos UI components

**Files:**
- Create: `src/components/pagos/pagos-section.tsx`
- Create: `src/components/pagos/pagos-table.tsx`

**Interfaces:**
- Consumes: `PagoListItem` (Task 4), `PAGO_ESTADO_LABEL`/`pagoEstadoTone` (Task 2), `StateBadge` (`@/components/state-badge`), `formatEUR`/`formatDate` (`@/lib/finance`), `cn` (`@/lib/utils`).
- Produces: `PagosSection({ pagos, activeEstado }: { pagos: PagoListItem[]; activeEstado?: string })` — a client component that renders the filter chips + table; consumed by Task 6 in `facturas/page.tsx`.

- [ ] **Step 1: Write `pagos-table.tsx`**

Create `src/components/pagos/pagos-table.tsx`:

```typescript
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StateBadge } from "@/components/state-badge";
import { formatEUR, formatDate, PAGO_ESTADO_LABEL, pagoEstadoTone } from "@/lib/finance";
import type { PagoListItem } from "@/lib/queries/pagos";
import { cn } from "@/lib/utils";

export function PagosTable({ rows }: { rows: PagoListItem[] }) {
  const router = useRouter();

  if (rows.length === 0) {
    return (
      <div className="grid place-items-center py-12 text-sm text-muted-foreground">
        No hay pagos que coincidan con el filtro.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[150px] pl-4">Factura</TableHead>
            <TableHead className="min-w-[180px]">Proveedor</TableHead>
            <TableHead className="w-[120px]">Fecha pago</TableHead>
            <TableHead className="w-[120px]">Vencimiento</TableHead>
            <TableHead className="w-[140px] text-right">Importe EUR</TableHead>
            <TableHead className="w-[140px]">Medio</TableHead>
            <TableHead className="w-[160px] pr-4">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => {
            const href = `/facturas/${p.factura_id}`;
            return (
              <TableRow
                key={p.pago_id}
                onClick={() => router.push(href)}
                className="cursor-pointer"
              >
                <TableCell className="pl-4 font-medium">
                  <Link
                    href={href}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-primary hover:underline underline-offset-2"
                  >
                    {p.numero_factura ?? p.factura_id}
                  </Link>
                  {p.es_pago_parcial && (
                    <StateBadge tone="pending" dot={false} className="ml-2">
                      Parcial
                    </StateBadge>
                  )}
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">
                  {p.razon_social ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(p.fecha_pago)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(p.fecha_vencimiento)}
                </TableCell>
                <TableCell className="text-right font-numeric">
                  {formatEUR(p.importe_eur)}
                </TableCell>
                <TableCell
                  className={cn("text-sm text-muted-foreground capitalize")}
                >
                  {p.medio_pago ?? "—"}
                </TableCell>
                <TableCell className="pr-4">
                  <StateBadge tone={pagoEstadoTone(p.estado_pago)}>
                    {PAGO_ESTADO_LABEL[p.estado_pago ?? ""] ?? p.estado_pago ?? "—"}
                  </StateBadge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 2: Write `pagos-section.tsx`**

Create `src/components/pagos/pagos-section.tsx`:

```typescript
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { PAGO_ESTADO_LABEL } from "@/lib/finance";
import type { PagoListItem } from "@/lib/queries/pagos";
import { PagosTable } from "./pagos-table";
import { cn } from "@/lib/utils";

const ALL = "__all__";

export function PagosSection({
  pagos,
  activeEstado,
}: {
  pagos: PagoListItem[];
  activeEstado?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setEstado(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) params.delete("pagoEstado");
    else params.set("pagoEstado", value);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  const estado = activeEstado ?? ALL;

  return (
    <div data-pending={pending ? "" : undefined}>
      <div className="flex flex-wrap items-center gap-0.5 rounded-full border border-input bg-background/60 p-0.5 mb-4">
        <SegChip active={estado === ALL} onClick={() => setEstado(ALL)}>
          Todos
        </SegChip>
        {Object.entries(PAGO_ESTADO_LABEL).map(([value, label]) => (
          <SegChip
            key={value}
            active={estado === value}
            onClick={() => setEstado(value)}
          >
            {label}
          </SegChip>
        ))}
      </div>
      <PagosTable rows={pagos} />
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
```

- [ ] **Step 3: Verify**

Run: `npm run lint`
Expected: no errors (note: `SegChip` here is a local copy of the one in `filters.tsx` — it's not exported from that file, so duplicating the ~15-line component is correct per YAGNI rather than introducing a shared-component refactor out of scope for this plan).

---

### Task 6: Wire Pagos section into the Facturas page

**Files:**
- Modify: `src/app/(app)/facturas/page.tsx`

**Interfaces:**
- Consumes: `getPagos` (Task 4), `PagosSection` (Task 5).

- [ ] **Step 1: Add the import, searchParam, query call, and panel**

In `src/app/(app)/facturas/page.tsx`, update imports:

```typescript
import {
  getFacturas,
  getProveedoresOptions,
  getCasosExcepcion,
  getCasosPorTipo,
  type FacturasFiltros,
} from "@/lib/queries/facturas";
import { getPagos } from "@/lib/queries/pagos";
import { formatInt } from "@/lib/finance";
import { FacturasFilters } from "@/components/facturas/filters";
import { FacturasTable } from "@/components/facturas/facturas-table";
import { ExcepcionesPanel } from "@/components/facturas/excepciones-panel";
import { PagosSection } from "@/components/pagos/pagos-section";
import { Panel } from "@/components/panel";
```

Update the `searchParams` type and destructuring:

```typescript
export default async function FacturasPage({
  searchParams,
}: {
  searchParams: Promise<{
    estado?: string;
    proveedor?: string;
    moneda?: string;
    desde?: string;
    hasta?: string;
    q?: string;
    exc?: string;
    pagoEstado?: string;
  }>;
}) {
  const sp = await searchParams;
  const filtros: FacturasFiltros = {
    estado: sp.estado,
    proveedorId: sp.proveedor,
    moneda: sp.moneda,
    desde: sp.desde,
    hasta: sp.hasta,
    q: sp.q,
  };

  const [facturas, proveedores, casos, counts, pagos] = await Promise.all([
    getFacturas(filtros),
    getProveedoresOptions(),
    getCasosExcepcion(sp.exc),
    getCasosPorTipo(),
    getPagos({ estadoPago: sp.pagoEstado }),
  ]);
```

Add the new panel right after the closing `</div>` of the existing `xl:grid-cols-3` grid (i.e., after the `ExcepcionesPanel` block, still inside the outer `<div className="flex flex-col gap-6">`):

```typescript
      <Panel eyebrow="Tesorería" title="Pagos" description={`${formatInt(pagos.length)} pagos registrados.`}>
        <PagosSection pagos={pagos} activeEstado={sp.pagoEstado} />
      </Panel>
    </div>
  );
}
```

(This replaces the file's existing closing `    </div>\n  );\n}` at the very end — the new `<Panel>` block goes before those two closing tags.)

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: no errors.

Run (dev server on port 3000 — confirm real port first per CLAUDE.md, `next.config.ts` can shift it):
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/facturas
```
Expected: `200`

```bash
curl -s http://localhost:3000/facturas | grep -o "Pagos"
```
Expected: `Pagos` appears (panel title).

---

### Task 7: Seed 2 demo `pagos` + mark 2 `facturas` as `pagada`

**Files:**
- Create: `supabase/migrations/08_seed_pagos_demo.sql`
- Apply via: Supabase MCP `apply_migration` tool (project `rnmidwhumdrpxulfsbjo`) — this is a data seed, not a schema change, but kept in `supabase/migrations/` for the same audit-trail reason as blocks 01–07.

**Interfaces:**
- None — this is a data-only task, consumed implicitly by Tasks 4–6's queries once applied.

- [ ] **Step 1: Pick 2 candidate facturas**

Run via Supabase MCP `execute_sql` (project `rnmidwhumdrpxulfsbjo`):

```sql
select f.factura_id, f.total_factura_eur, f.total_factura_original, f.moneda_original,
       f.fecha_vencimiento, m.iban
from public.facturas f
join public.maestro_proveedores m on m.proveedor_id = f.proveedor_id
where f.estado = 'pendiente_conciliacion'
  and f.es_nota_credito is not true
  and f.total_factura_eur > 0
order by f.factura_id
limit 2;
```

Expected: 2 rows. Note their `factura_id`, `total_factura_eur`, `total_factura_original`, `moneda_original`, `fecha_vencimiento`, `iban` values for Step 2.

- [ ] **Step 2: Write the seed SQL using the 2 real IDs and values from Step 1**

Create `supabase/migrations/08_seed_pagos_demo.sql`, substituting `<FACTURA_1>`/`<FACTURA_2>` and the matching values found in Step 1 (example shape shown — replace every placeholder with the real values before running):

```sql
-- Bloque 08: seed demo — 2 facturas marcadas como pagadas + su pago ejecutado
update public.facturas
set estado = 'pagada', saldo_pendiente_eur = 0
where factura_id in ('<FACTURA_1>', '<FACTURA_2>');

insert into public.pagos (
  pago_id, factura_id, fecha_pago, fecha_vencimiento,
  importe_original, moneda, importe_eur, es_pago_parcial,
  iban_destino, medio_pago, estado_pago
) values
  ('PAGO-DEMO-1', '<FACTURA_1>', '<FECHA_VENCIMIENTO_1>', '<FECHA_VENCIMIENTO_1>',
   <TOTAL_ORIGINAL_1>, '<MONEDA_1>', <TOTAL_EUR_1>, false,
   '<IBAN_1>', 'transferencia', 'ejecutado'),
  ('PAGO-DEMO-2', '<FACTURA_2>', '<FECHA_VENCIMIENTO_2>', '<FECHA_VENCIMIENTO_2>',
   <TOTAL_ORIGINAL_2>, '<MONEDA_2>', <TOTAL_EUR_2>, false,
   '<IBAN_2>', 'transferencia', 'ejecutado');
```

- [ ] **Step 3: Apply via Supabase MCP**

Call `apply_migration` with `project_id: "rnmidwhumdrpxulfsbjo"`, `name: "08_seed_pagos_demo"`, `query` = the exact SQL written in Step 2 (with real values substituted).
Expected: `{"success":true}`.

- [ ] **Step 4: Verify the seed**

Run via Supabase MCP `execute_sql`:

```sql
select factura_id, estado, saldo_pendiente_eur from public.facturas where estado = 'pagada';
select pago_id, factura_id, estado_pago, importe_eur from public.pagos;
```

Expected: 2 rows in each result, matching the IDs from Step 1.

- [ ] **Step 5: End-to-end UI check**

With the dev server running, in a browser (or via `curl`) confirm:
```bash
curl -s "http://localhost:3000/facturas?estado=pagada" | grep -o "Pagada" | head -1
```
Expected: `Pagada` (the 2 seeded facturas show up when filtering by that estado).

```bash
curl -s "http://localhost:3000/facturas?pagoEstado=ejecutado" | grep -o "Ejecutado" | head -1
```
Expected: `Ejecutado` (the Pagos section shows the 2 seeded rows when filtered).

---

## Self-Review Notes

- **Spec coverage:** A (facturas.ts JOIN + estado_resolucion) → Task 1. Labels/tones → Task 2. UI badges → Task 3. `pagos` query → Task 4. Pagos UI → Task 5. Page wiring → Task 6. Demo data → Task 7. All spec sections covered.
- **No placeholders in code** — the only bracketed placeholders (`<FACTURA_1>` etc.) are in Task 7 by design, since the real IDs don't exist until Step 1's query runs against live data; every other task has complete, literal code.
- **Type consistency checked:** `CasoExcepcionItem.estado_resolucion`, `PagoListItem` fields, `PagosSection`/`PagosTable` prop names (`pagos`, `rows`, `activeEstado`) match across Tasks 1, 3, 4, 5, 6.
