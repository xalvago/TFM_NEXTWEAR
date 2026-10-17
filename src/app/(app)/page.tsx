import { getComprasData } from "@/lib/queries/compras";
import { getCobertura } from "@/lib/queries/cobertura";
import { buildInsights } from "@/lib/insights";
import { Reveal } from "@/components/reveal";
import { AnalisisTiles } from "@/components/executive/analisis-tiles";
import {
  getExecutiveData,
  type ExecFiltros,
  type PeriodoAnio,
} from "@/lib/queries/executive";
import { ANIOS_DATASET, formatDate } from "@/lib/finance";
import { KpiStrip } from "@/components/executive/kpi-cards";
import { PeriodSelector } from "@/components/executive/period-selector";
import { ExecFilters } from "@/components/executive/exec-filters";
import { ComposicionGasto } from "@/components/executive/composicion";
import { ProveedoresTabla } from "@/components/executive/proveedores-tabla";
import { ConversorDivisas } from "@/components/executive/conversor-divisas";
import { Block } from "@/components/executive/dense";
import { InfoTip } from "@/components/info-tip";
import { EvolucionIso } from "@/components/executive/evolucion-iso";

// Datos en vivo: renderizado dinámico en cada petición.
export const dynamic = "force-dynamic";

function parseAnio(raw: string | undefined): PeriodoAnio {
  if (!raw) return "todos";
  const n = Number(raw);
  return (ANIOS_DATASET as readonly number[]).includes(n) ? n : "todos";
}

export default async function VistaEjecutivaPage({
  searchParams,
}: {
  searchParams: Promise<{
    anio?: string;
    proveedor?: string;
    pais?: string;
    moneda?: string;
    canal?: string;
  }>;
}) {
  const sp = await searchParams;
  const anio = parseAnio(sp.anio);
  const filtros: ExecFiltros = {
    anio,
    proveedorId: sp.proveedor,
    pais: sp.pais,
    moneda: sp.moneda,
    canal: sp.canal,
  };
  const [data, compras, cobertura] = await Promise.all([
    getExecutiveData(filtros),
    getComprasData(filtros),
    getCobertura(),
  ]);
  const insights = buildInsights(data, compras);
  const { calidad } = data;

  const periodoTexto =
    anio === "todos" ? "abril–julio · 2024 a 2026" : `abril–julio · ${anio}`;
  const hayFiltros = !!(sp.proveedor || sp.pais || sp.moneda || sp.canal);
  const sinDatos = data.kpis.numFacturas === 0 && data.kpis.numNotasCredito === 0;

  return (
    <div className="flex flex-col gap-4">
      <Block
        tint="logo"
        heading={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1.5">
              <span className="eyebrow">Vista ejecutiva</span>
              <h1 className="font-display text-2xl tracking-tight sm:text-[1.7rem] leading-[1.1] pb-0.5">
                Control de <span className="gradient-text">Cuentas por Pagar</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Gasto normalizado a EUR · {periodoTexto}
                {calidad.fechaCorte && (
                  <> · datos hasta {formatDate(calidad.fechaCorte)}</>
                )}
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <PeriodSelector current={anio === "todos" ? "todos" : String(anio)} />
              {data.tiposCambio.length > 0 && (
                <ConversorDivisas tasas={data.tiposCambio} variante="barra" />
              )}
            </div>
          </div>
        }
      >
        <ExecFilters opciones={data.opciones} embedded />

        {sinDatos && hayFiltros && (
          <p className="rounded-xl border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
            Ninguna factura cumple la combinación de filtros activa. Quita algún
            filtro para volver a ver datos.
          </p>
        )}

        <KpiStrip kpis={data.kpis} />

        <div className="grid items-start gap-x-6 gap-y-4 lg:grid-cols-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="eyebrow">Evolución · gasto mensual frente a años anteriores</span>
              <InfoTip text="Suma de total_factura_eur (con IVA, neto de abonos) por mes de fecha_expedicion. Respeta proveedor, país, moneda y canal; ignora el selector de año. Los meses sin facturas no se dibujan." />
            </div>
            <EvolucionIso data={data.interanual} />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="eyebrow">Composición del gasto · cómo se reparte</span>
              <InfoTip text="Moneda, país y canal: total_factura_eur (con IVA) por moneda_original y por proveedor (país y canal del maestro). Destino: total_linea_eur (sin IVA) por tipo de centro de coste de la línea, por eso no suma lo mismo." />
            </div>
            <ComposicionGasto data={data} />
          </div>
        </div>
      </Block>

      <Reveal from="zoom">
        <ProveedoresTabla gasto={data.porProveedor} cadena={compras.porProveedor} />
      </Reveal>

      {/* Análisis recogido en tarjetas: el detalle se abre en una ventana emergente */}
      <AnalisisTiles
        data={data}
        compras={compras}
        cobertura={cobertura}
        insights={insights}
      />
    </div>
  );
}
