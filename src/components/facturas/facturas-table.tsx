"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StateBadge } from "@/components/state-badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
  formatEUR,
  formatDate,
  ESTADO_LABEL,
  estadoTone,
} from "@/lib/finance";
import type { FacturaListItem } from "@/lib/queries/facturas";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

/** Columnas: ancho inicial ajustado al contenido; el usuario puede arrastrarlo. */
const COLS: {
  key: string;
  label: string;
  width: number;
  min: number;
  className?: string;
}[] = [
  { key: "numero", label: "Nº factura", width: 205, min: 110, className: "pl-4" },
  { key: "proveedor", label: "Proveedor", width: 205, min: 120 },
  { key: "fecha", label: "Fecha", width: 104, min: 90 },
  { key: "moneda", label: "Moneda", width: 76, min: 64 },
  { key: "total", label: "Total EUR", width: 112, min: 90, className: "text-right" },
  { key: "saldo", label: "Saldo EUR", width: 112, min: 90, className: "text-right" },
  { key: "estado", label: "Estado", width: 176, min: 120 },
];

export function FacturasTable({
  rows,
  embedded = false,
}: {
  rows: FacturaListItem[];
  embedded?: boolean;
}) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [widths, setWidths] = useState<number[]>(() => COLS.map((c) => c.width));

  function startResize(i: number, e: React.PointerEvent<HTMLSpanElement>) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = widths[i];
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const w = Math.max(COLS[i].min, startW + ev.clientX - startX);
      setWidths((prev) => prev.map((v, j) => (j === i ? w : v)));
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  }

  // Al cambiar los filtros (nuevas filas) volver a la primera página, ajustando
  // el estado durante el render (patrón recomendado en vez de un efecto).
  const [prevRows, setPrevRows] = useState(rows);
  if (prevRows !== rows) {
    setPrevRows(rows);
    setPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    [rows, current]
  );

  if (rows.length === 0) {
    return (
      <div
        className={cn(
          "grid place-items-center py-16 text-sm text-muted-foreground",
          !embedded && "rounded-2xl bg-card shadow-card"
        )}
      >
        No hay facturas que coincidan con los filtros.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative",
        !embedded && "card-wash overflow-hidden rounded-2xl shadow-card"
      )}
    >
      <div className="overflow-x-auto">
        <Table
          className="table-fixed"
          style={{ width: widths.reduce((a, b) => a + b, 0) }}
        >
          <colgroup>
            {widths.map((w, i) => (
              <col key={COLS[i].key} style={{ width: w }} />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {COLS.map((c, i) => (
                <TableHead
                  key={c.key}
                  className={cn("relative select-none", c.className ?? "")}
                >
                  {c.label}
                  <span
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Redimensionar columna ${c.label}`}
                    onPointerDown={(e) => startResize(i, e)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-1/2 h-5 w-2 -translate-y-1/2 cursor-col-resize touch-none after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border/70 hover:after:w-0.5 hover:after:bg-primary/60"
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((f) => {
              const href = `/facturas/${f.factura_id}`;
              const negativo = (f.total_factura_eur ?? 0) < 0;
              return (
                <TableRow
                  key={f.factura_id}
                  onClick={() => router.push(href)}
                  className="cursor-pointer"
                >
                  <TableCell className="truncate pl-4 font-medium">
                    <Link
                      href={href}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-primary hover:underline underline-offset-2"
                    >
                      {f.numero_factura ?? f.factura_id}
                    </Link>
                    {f.es_nota_credito && (
                      <StateBadge tone="credit" dot={false} className="ml-2">
                        NC
                      </StateBadge>
                    )}
                  </TableCell>
                  <TableCell
                    className="truncate text-muted-foreground"
                    title={f.razon_social ?? undefined}
                  >
                    {f.razon_social ?? f.proveedor_id ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(f.fecha_expedicion)}
                  </TableCell>
                  <TableCell>
                    <span className="font-numeric text-xs text-muted-foreground">
                      {f.moneda_original ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-numeric",
                      negativo && "text-[color:var(--credit)]"
                    )}
                  >
                    {formatEUR(f.total_factura_eur)}
                  </TableCell>
                  <TableCell className="text-right font-numeric text-muted-foreground">
                    {formatEUR(f.saldo_pendiente_eur)}
                  </TableCell>
                  <TableCell>
                    <StateBadge tone={estadoTone(f.estado)}>
                      {ESTADO_LABEL[f.estado ?? ""] ?? f.estado ?? "—"}
                    </StateBadge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <PaginationBar
        page={current}
        pageCount={pageCount}
        total={rows.length}
        pageSize={PAGE_SIZE}
        onPage={setPage}
        noun="facturas"
      />
    </div>
  );
}
