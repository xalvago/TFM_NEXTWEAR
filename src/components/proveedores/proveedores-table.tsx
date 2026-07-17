import Link from "next/link";
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

export function ProveedoresTable({ rows }: { rows: ProveedorRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="grid place-items-center py-16 text-sm text-muted-foreground">
        No hay proveedores registrados.
      </div>
    );
  }

  return (
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
          {rows.map((p) => (
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
  );
}
