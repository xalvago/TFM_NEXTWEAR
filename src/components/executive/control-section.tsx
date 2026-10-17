import Link from "next/link";
import {
  ESTADO_LABEL,
  TIPO_EXCEPCION_LABEL,
  estadoTone,
  formatEUR,
  formatInt,
  formatPct,
  type StateTone,
} from "@/lib/finance";
import type { ControlFacturacion } from "@/lib/queries/executive";
import { InfoTip } from "@/components/info-tip";
import { BarList, Block, type BarItem } from "@/components/executive/dense";

const TONE_COLOR: Record<StateTone, string> = {
  ok: "var(--ok)",
  exception: "var(--exception)",
  pending: "var(--pending)",
  credit: "var(--credit)",
  neutral: "var(--chart-5)",
};

/** Fase 4: ¿funciona el control de facturación? Embudo, excepciones e importe en riesgo. */
export function ControlSection({
  control: c,
  part,
}: {
  control: ControlFacturacion;
  /** Sin `part` se pintan los tres bloques. */
  part?: "estados" | "tipos" | "top";
}) {
  const show = (p: "estados" | "tipos" | "top") => !part || part === p;
  const embudo: BarItem[] = c.embudo.map((e) => ({
    key: e.estado,
    label: ESTADO_LABEL[e.estado] ?? e.estado,
    value: e.numFacturas,
    display: formatInt(e.numFacturas),
    sub: undefined,
    color: TONE_COLOR[estadoTone(e.estado)],
  }));

  const tipos: BarItem[] = c.porTipo.map((t) => ({
    key: t.tipo,
    label: TIPO_EXCEPCION_LABEL[t.tipo] ?? t.tipo,
    value: t.numCasos,
    display: formatInt(t.numCasos),
    sub: t.numRequierenHumano > 0 ? `${t.numRequierenHumano} hum.` : undefined,
    color:
      t.numRequierenHumano > 0 ? "var(--exception)" : "var(--credit)",
  }));

  const pctHumano = c.totalCasos > 0 ? c.casosRequierenHumano / c.totalCasos : 0;

  return (
    <>
      {show("estados") && (
      <Block
        eyebrow="Control de facturación"
        tint="violet"
        title="Dónde está cada factura"
        info={
          <InfoTip text="Nº de facturas del periodo por facturas.estado. Ojo: el estado va por detrás del proceso real (hay asientos registrados de facturas aún en «pendiente de conciliación»), así que no es una verdad absoluta del ciclo." />
        }
      >
        {embudo.length > 0 ? (
          <>
            <BarList items={embudo} labelWidth="10rem" />
            <p className="text-xs text-muted-foreground">
              {formatInt(c.numConciliadasOk)} conciliadas sin intervención ·{" "}
              {formatInt(c.numEnExcepcion)} en excepción (
              {formatEUR(c.importeEnExcepcionEur)})
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Sin datos.</p>
        )}
      </Block>
      )}

      {show("tipos") && (
      <Block
        eyebrow="Control de facturación"
        tint="rose"
        title="Excepciones por tipo"
        info={
          <InfoTip text="Casos de casos_excepcion ligados a una factura del periodo, por tipo_excepcion. «hum.» = requiere intervención humana. Los casos que solo referencian un albarán o pedido no se cuentan aquí." />
        }
      >
        {tipos.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <span>
                <span className="font-numeric text-base">{formatInt(c.totalCasos)}</span>{" "}
                <span className="text-muted-foreground">casos</span>
              </span>
              <span>
                <span className="font-numeric text-base">{formatPct(pctHumano)}</span>{" "}
                <span className="text-muted-foreground">requieren humano</span>
              </span>
              <span>
                <span className="font-numeric text-base">{formatInt(c.casosAbiertos)}</span>{" "}
                <span className="text-muted-foreground">sin resolver</span>
              </span>
            </div>
            <BarList items={tipos} labelWidth="8.5rem" />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sin casos de excepción para los filtros activos.
          </p>
        )}
      </Block>
      )}

      {show("top") && (
      <Block
        eyebrow="Control de facturación"
        tint="exception"
        title="Mayores importes en excepción"
        info={
          <InfoTip text="Las 6 facturas en_excepcion de mayor total_factura_eur del periodo, con su motivo y los tipos de caso asociados. Cada una enlaza a su detalle." />
        }
      >
        {c.topExcepciones.length > 0 ? (
          <ul className="flex flex-col divide-y divide-border/40">
            {c.topExcepciones.map((e) => (
              <li key={e.facturaId} className="flex items-start justify-between gap-3 py-1.5 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-col leading-tight">
                  <Link
                    href={`/facturas/${e.facturaId}`}
                    className="truncate text-sm font-medium underline-offset-2 hover:underline"
                  >
                    {e.numeroFactura ?? e.facturaId}
                  </Link>
                  <span className="truncate text-xs text-muted-foreground">
                    {e.proveedor}
                  </span>
                  <span
                    className="truncate text-[0.7rem] text-muted-foreground"
                    title={e.motivo ?? undefined}
                  >
                    {e.tipos.length > 0
                      ? e.tipos.map((t) => TIPO_EXCEPCION_LABEL[t] ?? t).join(" · ")
                      : (e.motivo ?? "—")}
                  </span>
                </div>
                <span className="font-numeric whitespace-nowrap text-sm text-[color:var(--exception)]">
                  {formatEUR(e.importeEur)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ninguna factura en excepción para los filtros activos.
          </p>
        )}
        <Link
          href="/facturas?estado=en_excepcion"
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          Ver todas en Facturas y conciliación →
        </Link>
      </Block>
      )}
    </>
  );
}
