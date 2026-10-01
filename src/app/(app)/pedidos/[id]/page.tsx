import Link from "next/link";
import { notFound } from "next/navigation";
import { getPedidoDetalle } from "@/lib/queries/documentos";
import {
  formatDate,
  formatInt,
  formatEUR,
  ESTADO_PEDIDO_LABEL,
  estadoPedidoTone,
} from "@/lib/finance";
import { StateBadge } from "@/components/state-badge";
import { Panel } from "@/components/panel";
import { CadenaDocumental, CasosPanel } from "@/components/facturas/cadena-documental";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detalle = await getPedidoDetalle(id);
  if (!detalle) notFound();
  const { pedido: p, lineas, albaranes, facturas, casos } = detalle;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/facturas"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span aria-hidden>←</span> Facturas y conciliación
      </Link>

      <header className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-card sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Pedido</span>
          <h1 className="font-display text-3xl leading-none tracking-tight">
            {p.pedido_id}
          </h1>
          <p className="text-sm text-muted-foreground">
            {p.razon_social ?? p.proveedor_id ?? "—"}
            {p.centro_nombre ? ` · destino ${p.centro_nombre}` : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            Pedido {formatDate(p.fecha_pedido)} · Entrega prevista{" "}
            {formatDate(p.fecha_entrega_prevista)}
            {p.moneda ? ` · ${p.moneda}` : ""}
          </p>
        </div>
        <StateBadge tone={estadoPedidoTone(p.estado)}>
          {ESTADO_PEDIDO_LABEL[p.estado ?? ""] ?? p.estado ?? "—"}
        </StateBadge>
      </header>

      <CadenaDocumental
        foco="pedido"
        pedido={p}
        albaranes={albaranes}
        facturas={facturas}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            eyebrow="Detalle"
            title="Líneas del pedido"
            description="Cantidad pedida frente a lo entregado en los albaranes."
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[110px]">SKU</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="w-[90px] text-right">Pedido</TableHead>
                    <TableHead className="w-[90px] text-right">Entregado</TableHead>
                    <TableHead className="w-[90px] text-right">Pendiente</TableHead>
                    <TableHead className="w-[120px] text-right">P. acordado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineas.map((l) => {
                    const pendiente = l.cantidad_pedida - l.cantidad_entregada;
                    return (
                      <TableRow key={l.sku} className="hover:bg-transparent">
                        <TableCell className="font-numeric text-xs text-muted-foreground">
                          {l.sku}
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          {l.descripcion}
                        </TableCell>
                        <TableCell className="text-right font-numeric">
                          {formatInt(l.cantidad_pedida)}
                        </TableCell>
                        <TableCell className="text-right font-numeric">
                          {formatInt(l.cantidad_entregada)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-numeric",
                            pendiente > 0 && "text-[color:var(--pending)]",
                            pendiente < 0 && "text-[color:var(--exception)]"
                          )}
                        >
                          {formatInt(pendiente)}
                        </TableCell>
                        <TableCell className="text-right font-numeric">
                          {l.precio_unitario_acordado != null
                            ? p.moneda && p.moneda !== "EUR"
                              ? `${l.precio_unitario_acordado} ${p.moneda}`
                              : formatEUR(l.precio_unitario_acordado)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </div>
        <CasosPanel casos={casos} />
      </div>
    </div>
  );
}
