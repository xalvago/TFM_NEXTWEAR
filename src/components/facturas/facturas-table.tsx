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

export function FacturasTable({
  rows,
  embedded = false,
}: {
  rows: FacturaListItem[];
  embedded?: boolean;
}) {
  const router = useRouter();
  const [page, setPage] = useState(1);

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
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[150px] pl-4">Nº factura</TableHead>
              <TableHead className="min-w-[180px]">Proveedor</TableHead>
              <TableHead className="w-[120px]">Fecha</TableHead>
              <TableHead className="w-[80px]">Moneda</TableHead>
              <TableHead className="w-[140px] text-right">Total EUR</TableHead>
              <TableHead className="w-[180px] pr-4">Estado</TableHead>
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
                  <TableCell className="pl-4 font-medium">
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
                  <TableCell className="whitespace-normal text-muted-foreground">
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
                  <TableCell className="pr-4">
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
