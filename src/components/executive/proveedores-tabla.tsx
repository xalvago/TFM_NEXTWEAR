import Link from "next/link";
import { CanalIcon, MonedaIcon, PaisFlag } from "@/components/dim-icon";
import { CANAL_LABEL, formatEUR, formatInt, formatPct } from "@/lib/finance";
import type { GastoPorProveedor } from "@/lib/queries/executive";
import type { CadenaProveedor } from "@/lib/queries/compras";
import { InfoTip } from "@/components/info-tip";
import { Block } from "@/components/executive/dense";

const MONEDA_COLOR: Record<string, string> = {
  EUR: "var(--chart-1)",
  USD: "var(--chart-3)",
  CNY: "var(--chart-2)",
};

/**
 * Una fila por proveedor con todo su contexto: cuánto gasto concentra (barra),
 * de dónde viene, cuánto se le pide / recibe / factura y cuánto está en excepción.
 * Sustituye a dos gráficos (gasto por proveedor y pedido-recibido-facturado).
 */
export function ProveedoresTabla({
  gasto,
  cadena,
}: {
  gasto: GastoPorProveedor[];
  cadena: CadenaProveedor[];
}) {
  const cadenaById = new Map(cadena.map((c) => [c.proveedorId, c]));
  const max = Math.max(...gasto.map((g) => g.gastoEur), 1);

  return (
    <Block
      tint="logo"
      eyebrow="Proveedores"
      title="Gasto, volumen y control por proveedor"
      info={
        <InfoTip text="Gasto: total_factura_eur del periodo. Unidades: pedidas (pedidos_lineas), recibidas (albaranes_lineas) y facturadas (facturas_lineas) de los mismos pedidos. Recepción = recibidas / pedidas. En excepción: facturas en estado en_excepcion." />
      }
    >
      {gasto.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Sin datos para los filtros activos.
        </p>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="thead-brand text-left">
                <th className="py-2.5 px-3">Proveedor</th>
                <th className="w-[22%] py-2.5 px-3">Gasto (EUR)</th>
                <th className="py-2.5 px-3 text-right">%</th>
                <th className="py-2.5 px-3 text-right">Fact.</th>
                <th className="py-2.5 px-3 text-right">Pedidas</th>
                <th className="py-2.5 px-3 text-right">Recibidas</th>
                <th className="py-2.5 px-3 text-right">Facturadas</th>
                <th className="py-2.5 px-3 text-right">Recep.</th>
                <th className="py-2.5 text-right px-3">En excepción</th>
              </tr>
            </thead>
            <tbody>
              {gasto.map((g) => {
                const c = cadenaById.get(g.proveedorId);
                return (
                  <tr key={g.proveedorId} className="border-b border-border/30 last:border-0">
                    <td className="py-1.5 pr-3">
                      <div className="flex flex-col leading-tight">
                        <Link
                          href={`/facturas?proveedor=${g.proveedorId}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          {g.razonSocial}
                        </Link>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[0.7rem] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <PaisFlag pais={g.pais} size={14} />
                            {g.pais}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MonedaIcon moneda={g.monedaFacturacion} size={11} />
                            {g.monedaFacturacion}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CanalIcon canal={g.canal} size={11} />
                            {CANAL_LABEL[g.canal] ?? g.canal}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2 flex-1 rounded-full bg-secondary/70">
                          <span
                            className="fill-bar block h-full rounded-full"
                            style={
                              {
                                width: `${Math.max(2, (g.gastoEur / max) * 100)}%`,
                                "--bar":
                                  MONEDA_COLOR[g.monedaFacturacion] ?? "var(--chart-5)",
                              } as React.CSSProperties
                            }
                          />
                        </span>
                        <span className="font-numeric w-24 text-right text-[0.8rem]">
                          {formatEUR(g.gastoEur)}
                        </span>
                      </div>
                    </td>
                    <td className="font-numeric py-1.5 pr-3 text-right text-muted-foreground">
                      {formatPct(g.pctSobreTotal)}
                    </td>
                    <td className="font-numeric py-1.5 pr-3 text-right">
                      {formatInt(g.numFacturas)}
                    </td>
                    <td className="font-numeric py-1.5 pr-3 text-right">
                      {c ? formatInt(c.pedidas) : "—"}
                    </td>
                    <td className="font-numeric py-1.5 pr-3 text-right">
                      {c ? formatInt(c.recibidas) : "—"}
                    </td>
                    <td className="font-numeric py-1.5 pr-3 text-right">
                      {c ? formatInt(c.facturadas) : "—"}
                    </td>
                    <td
                      className="font-numeric py-1.5 pr-3 text-right"
                      title={c ? `${c.pedidosVivos} pedidos sin cerrar` : undefined}
                    >
                      {c ? formatPct(c.tasaRecepcion) : "—"}
                    </td>
                    <td className="font-numeric py-1.5 text-right">
                      {g.numEnExcepcion > 0 ? (
                        <span className="text-[color:var(--exception)]">
                          {formatInt(g.numEnExcepcion)} · {formatEUR(g.importeExcepcionEur)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/50 pt-2 text-xs text-muted-foreground">
            {Object.entries(MONEDA_COLOR).map(([m, color]) => (
              <li key={m} className="flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-full" style={{ background: color }} />
                Factura en {m}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Block>
  );
}
