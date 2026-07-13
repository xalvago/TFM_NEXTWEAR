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
