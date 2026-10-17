import Link from "next/link";
import { CircleAlert } from "lucide-react";
import {
  ESTADO_PEDIDO_LABEL,
  estadoPedidoTone,
  formatEUR,
  formatInt,
  formatPct,
  type StateTone,
} from "@/lib/finance";
import type { ComprasData } from "@/lib/queries/compras";
import { InfoTip } from "@/components/info-tip";
import { BarList, Block, type BarItem } from "@/components/executive/dense";

const TONE_COLOR: Record<StateTone, string> = {
  ok: "var(--ok)",
  exception: "var(--exception)",
  pending: "var(--pending)",
  credit: "var(--credit)",
  neutral: "var(--chart-5)",
};

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="eyebrow text-[0.62rem]">{label}</span>
      <span className="font-numeric text-base">{value}</span>
      {note && <span className="text-[0.68rem] text-muted-foreground">{note}</span>}
    </div>
  );
}

/** Fase 3: cadena pedido → recibido → facturado y «qué compramos», en bloques compactos. */
export function ComprasSection({
  data,
  part,
}: {
  data: ComprasData;
  part: "entregas" | "categoria" | "productos";
}) {
  const { totales: t, plazo } = data;
  const sinPedidos = t.numPedidos === 0;
  const pctTarde = plazo.numAlbaranes > 0 ? plazo.conRetraso / plazo.numAlbaranes : 0;

  const estados: BarItem[] = Object.entries(t.porEstado)
    .sort((a, b) => b[1] - a[1])
    .map(([estado, n]) => ({
      key: estado,
      label: ESTADO_PEDIDO_LABEL[estado] ?? estado,
      value: n,
      display: formatInt(n),
      color: TONE_COLOR[estadoPedidoTone(estado)],
    }));

  const categorias: BarItem[] = data.porCategoria.map((c) => ({
    key: c.categoria,
    label: c.categoria,
    value: c.gastoFacturadoEur,
    sub: `${formatInt(c.unidadesPedidas)} ud`,
    color: "var(--chart-2)",
  }));

  return (
    <>
      {part === "entregas" && (
      <Block
        eyebrow="Pedido → albarán → factura"
        tint="sky"
        title="Entregas y volumen"
        info={
          <InfoTip text="Cohorte = pedidos que cumplen los filtros (año de fecha_pedido). Pedidas: pedidos_lineas. Recibidas: albaranes_lineas. Facturadas: facturas_lineas de facturas no NC con pedido_id_ref en la cohorte. Pendiente = pedido − recibido en pedidos abiertos o parciales. Retraso: fecha_entrega del albarán frente a fecha_entrega_prevista." />
        }
      >
        {sinPedidos ? (
          <p className="text-sm text-muted-foreground">
            Sin pedidos para los filtros activos.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              <Stat
                label="Pedidos"
                value={formatInt(t.numPedidos)}
                note={`${formatInt(t.numSkus)} SKU`}
              />
              <Stat
                label="Uds pedidas"
                value={formatInt(t.pedidas)}
                note={`${formatInt(t.recibidas)} rec. · ${formatInt(t.facturadas)} fact.`}
              />
              <Stat
                label="Recepción"
                value={formatPct(t.tasaRecepcion)}
                note="recibido / pedido"
              />
              <Stat
                label="Por recibir"
                value={formatInt(t.pendienteRecibir)}
                note="uds en pedidos vivos"
              />
            </div>
            <div className="border-t border-border/50 pt-3">
              <BarList items={estados} labelWidth="9.5rem" />
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-numeric text-sm text-foreground">
                {formatPct(pctTarde)}
              </span>{" "}
              de los albaranes ({formatInt(plazo.conRetraso)} de{" "}
              {formatInt(plazo.numAlbaranes)}) llegan tarde
              {plazo.conRetraso > 0 &&
                `, de media ${plazo.diasRetrasoMedio.toLocaleString("es-ES", { maximumFractionDigits: 1 })} días`}
              .
            </p>
            {data.facturasSinPedido > 0 && (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <CircleAlert
                  aria-hidden
                  size={13}
                  className="mt-px shrink-0 text-[color:var(--pending)]"
                />
                {formatInt(data.facturasSinPedido)} facturas del periodo sin pedido
                referenciado quedan fuera de esta cadena.
              </p>
            )}
          </>
        )}
      </Block>
      )}

      {part === "categoria" && (
      <Block
        eyebrow="Qué compramos"
        tint="violet"
        title="Gasto por categoría"
        info={
          <InfoTip text="total_linea_eur (sin IVA) por productos.categoria, de facturas no NC con pedido en la cohorte; a la derecha, unidades pedidas. Líneas sin SKU van a «Sin categoría»." />
        }
      >
        {categorias.length > 0 ? (
          <BarList items={categorias} labelWidth="7.5rem" />
        ) : (
          <p className="text-sm text-muted-foreground">Sin datos.</p>
        )}
      </Block>
      )}

      {part === "productos" && (
      <Block
        eyebrow="Qué compramos"
        title="Productos con más gasto"
        info={<InfoTip text="Top 8 SKU por total_linea_eur (sin IVA) facturado en la cohorte." />}
      >
        {data.topSkus.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="thead-brand text-left">
                  <th className="px-3 py-2.5">Producto</th>
                  <th className="text-right px-3 py-2.5">Ped.</th>
                  <th className="text-right px-3 py-2.5">Fact.</th>
                  <th className="text-right px-3 py-2.5">Gasto</th>
                </tr>
              </thead>
              <tbody>
                {data.topSkus.map((s) => (
                  <tr key={s.sku} className="border-b border-border/30 last:border-0">
                    <td className="whitespace-normal py-1 pr-3 leading-tight">
                      <span className="font-medium">{s.descripcion}</span>
                      <span className="block text-[0.68rem] text-muted-foreground">
                        {s.categoria} · <span className="font-numeric">{s.sku}</span>
                      </span>
                    </td>
                    <td className="font-numeric py-1 pr-3 text-right">
                      {formatInt(s.unidadesPedidas)}
                    </td>
                    <td className="font-numeric py-1 pr-3 text-right">
                      {formatInt(s.unidadesFacturadas)}
                    </td>
                    <td className="font-numeric py-1 text-right">
                      {formatEUR(s.gastoFacturadoEur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin datos.</p>
        )}
        <Link
          href="/stock"
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          Reposición prevista en Stock e inventario →
        </Link>
      </Block>
      )}
    </>
  );
}
