import Link from "next/link";
import { notFound } from "next/navigation";
import { getAlbaranDetalle } from "@/lib/queries/documentos";
import {
  formatDate,
  formatInt,
  ESTADO_ALBARAN_LABEL,
  estadoAlbaranTone,
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

export const dynamic = "force-dynamic";

export default async function AlbaranPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detalle = await getAlbaranDetalle(id);
  if (!detalle) notFound();
  const { albaran: a, lineas, pedido, facturas, casos } = detalle;

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
          <span className="eyebrow">Albarán</span>
          <h1 className="font-display text-3xl leading-none tracking-tight">
            {a.albaran_id}
          </h1>
          <p className="text-sm text-muted-foreground">
            {a.razon_social ?? a.proveedor_id ?? "—"}
            {a.centro_nombre ? ` · recibido en ${a.centro_nombre}` : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            Entrega {formatDate(a.fecha_entrega)}
          </p>
        </div>
        <StateBadge tone={estadoAlbaranTone(a.estado)}>
          {ESTADO_ALBARAN_LABEL[a.estado ?? ""] ?? a.estado ?? "—"}
        </StateBadge>
      </header>

      <CadenaDocumental
        foco="albaran"
        pedido={pedido}
        albaranes={[
          {
            albaran_id: a.albaran_id,
            estado: a.estado,
            fecha_entrega: a.fecha_entrega,
          },
        ]}
        facturas={facturas}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            eyebrow="Detalle"
            title="Líneas del albarán"
            description={`${formatInt(lineas.length)} referencias entregadas.`}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[110px]">SKU</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="w-[110px] text-right">Entregado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineas.map((l) => (
                    <TableRow key={l.sku} className="hover:bg-transparent">
                      <TableCell className="font-numeric text-xs text-muted-foreground">
                        {l.sku}
                      </TableCell>
                      <TableCell className="whitespace-normal">{l.descripcion}</TableCell>
                      <TableCell className="text-right font-numeric">
                        {formatInt(l.cantidad_entregada)}
                      </TableCell>
                    </TableRow>
                  ))}
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
