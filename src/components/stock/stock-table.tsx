"use client";

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
import { formatEUR, formatInt, formatDate } from "@/lib/finance";
import type { StockRow } from "@/lib/queries/stock";
import { cn } from "@/lib/utils";

const TIPO_LABEL: Record<string, string> = {
  tienda_fisica: "Tienda física",
  ecommerce: "Ecommerce",
  almacen_central: "Almacén central",
};

const PAGE_SIZE = 12;

export function StockTable({
  rows,
  umbral,
  embedded = false,
}: {
  rows: StockRow[];
  umbral: number;
  embedded?: boolean;
}) {
  const [page, setPage] = useState(1);

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
        No hay stock que coincida con los filtros.
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
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[100px] pl-4">SKU</TableHead>
              <TableHead className="min-w-[160px]">Producto</TableHead>
              <TableHead className="w-[110px]">Categoría</TableHead>
              <TableHead className="min-w-[150px]">Centro</TableHead>
              <TableHead className="w-[100px] text-right">Cantidad</TableHead>
              <TableHead className="w-[120px] text-right">Valor EUR</TableHead>
              <TableHead className="w-[110px] pr-4">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((r) => {
              const bajo = r.cantidadDisponible <= umbral;
              return (
                <TableRow
                  key={`${r.sku}::${r.centroId}`}
                  className={cn(
                    "hover:bg-transparent",
                    bajo &&
                      "bg-[color:var(--exception)]/6 hover:bg-[color:var(--exception)]/10"
                  )}
                >
                  <TableCell className="pl-4 font-numeric text-xs text-muted-foreground">
                    {r.sku}
                  </TableCell>
                  <TableCell className="whitespace-normal font-medium">
                    {r.descripcion}
                  </TableCell>
                  <TableCell className="text-muted-foreground capitalize">
                    {r.categoria ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">
                    {r.centroNombre}
                    <span className="ml-1.5 text-xs text-muted-foreground/70">
                      ({TIPO_LABEL[r.centroTipo] ?? r.centroTipo})
                    </span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-numeric",
                      bajo && "text-[color:var(--exception)] font-medium"
                    )}
                  >
                    {formatInt(r.cantidadDisponible)}
                  </TableCell>
                  <TableCell className="text-right font-numeric">
                    {formatEUR(r.valorEur)}
                  </TableCell>
                  <TableCell className="pr-4">
                    {bajo ? (
                      <StateBadge tone="exception">Stock bajo</StateBadge>
                    ) : (
                      <StateBadge tone="ok" dot={false}>
                        OK
                      </StateBadge>
                    )}
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
        noun="SKU × centro"
      />
      <p className="border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">
        Actualizado {formatDate(rows[0]?.fechaActualizacion)} (última fecha de
        movimiento registrado).
      </p>
    </div>
  );
}
