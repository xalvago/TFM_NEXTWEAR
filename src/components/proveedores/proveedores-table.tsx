"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StateBadge } from "@/components/state-badge";
import { formatEUR, formatDate, formatInt } from "@/lib/finance";
import type { ProveedorRow } from "@/lib/queries/proveedores";
import { cn } from "@/lib/utils";

const CANAL_LABEL: Record<string, string> = {
  email: "Email",
  portal_web: "Portal web",
  api: "API",
};

/**
 * Tabla de proveedores con buscador instantáneo por cualquier campo del
 * maestro (razón social, NIF, país, moneda, canal, forma de pago, IBAN,
 * categorías habituales). Dataset pequeño (10 filas): filtrado en cliente,
 * sin necesidad de ida y vuelta al servidor.
 */
export function ProveedoresTable({ rows }: { rows: ProveedorRow[] }) {
  const [q, setQ] = useState("");

  const visibles = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((p) => {
      const haystack = [
        p.proveedor_id,
        p.razon_social,
        p.nif,
        p.pais,
        p.moneda_facturacion,
        p.canal_recepcion ? (CANAL_LABEL[p.canal_recepcion] ?? p.canal_recepcion) : null,
        p.portal_url,
        p.email_recepcion_facturas,
        p.categorias_habituales,
        p.forma_pago,
        p.iban,
        p.activo ? "activo" : "inactivo",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [rows, q]);

  return (
    <div className="flex flex-col">
      {/* Buscador instantáneo */}
      <div className="border-b border-border/60 px-6 py-4">
        <div className="relative max-w-sm">
          <Search
            aria-hidden
            size={15}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, NIF, país, IBAN, canal…"
            aria-label="Buscar proveedores"
            className="h-9 w-full rounded-full border border-border/70 bg-background/70 pl-9 pr-9 text-sm outline-none transition-colors focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Borrar búsqueda"
              className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X size={14} strokeWidth={2} />
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {formatInt(visibles.length)} de {formatInt(rows.length)} proveedores
        </p>
      </div>

      {visibles.length === 0 ? (
        <div className="grid place-items-center py-16 text-sm text-muted-foreground">
          {rows.length === 0
            ? "No hay proveedores registrados."
            : "Ningún proveedor coincide con la búsqueda."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[200px] pl-4">Proveedor</TableHead>
                <TableHead className="w-[90px]">País</TableHead>
                <TableHead className="w-[90px]">Moneda</TableHead>
                <TableHead className="w-[120px]">Canal</TableHead>
                <TableHead className="w-[130px]">Forma de pago</TableHead>
                <TableHead className="min-w-[200px]">IBAN</TableHead>
                <TableHead className="w-[90px] text-right">Facturas</TableHead>
                <TableHead className="w-[140px] text-right">Gasto EUR</TableHead>
                <TableHead className="w-[140px] text-right pr-4">
                  Saldo pendiente
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibles.map((p) => (
                <TableRow key={p.proveedor_id}>
                  <TableCell className="pl-4 font-medium">
                    <Link
                      href={`/facturas?proveedor=${p.proveedor_id}`}
                      className="hover:text-primary hover:underline underline-offset-2"
                    >
                      {p.razon_social}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {p.nif ?? p.proveedor_id}
                      </span>
                      {!p.activo && (
                        <StateBadge tone="neutral" dot={false}>
                          Inactivo
                        </StateBadge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.pais ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span className="font-numeric text-xs text-muted-foreground">
                      {p.moneda_facturacion}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.canal_recepcion
                      ? (CANAL_LABEL[p.canal_recepcion] ?? p.canal_recepcion)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.forma_pago ?? "—"}
                  </TableCell>
                  <TableCell>
                    {p.iban ? (
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">{p.iban}</span>
                        {p.iban_fecha_actualizacion && (
                          <span className="text-[0.7rem] text-muted-foreground">
                            Actualizado {formatDate(p.iban_fecha_actualizacion)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-numeric text-muted-foreground">
                    {formatInt(p.numFacturas)}
                  </TableCell>
                  <TableCell className="text-right font-numeric">
                    {formatEUR(p.gastoTotalEur)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "pr-4 text-right font-numeric",
                      p.saldoPendienteEur > 0 && "text-[color:var(--pending)]"
                    )}
                  >
                    {formatEUR(p.saldoPendienteEur)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
