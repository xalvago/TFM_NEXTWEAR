import { getExecutiveData, type PeriodoAnio } from "@/lib/queries/executive";
import { ANIOS_DATASET } from "@/lib/finance";
import { KpiCards } from "@/components/executive/kpi-cards";
import { PeriodSelector } from "@/components/executive/period-selector";
import { Panel } from "@/components/panel";
import {
  InteranualChart,
  CentroChart,
  ProveedorChart,
  MonedaChart,
} from "@/components/executive/charts";

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
  searchParams: Promise<{ anio?: string }>;
}) {
  const { anio: anioRaw } = await searchParams;
  const anio = parseAnio(anioRaw);
  const data = await getExecutiveData(anio);

  const periodoTexto =
    anio === "todos" ? "abril–junio · 2024 a 2026" : `abril–junio · ${anio}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Vista ejecutiva</span>
          <h1 className="font-display text-3xl tracking-tight sm:text-[2.1rem] leading-[1.1] pb-0.5">
            Panorama de <span className="gradient-text">Cuentas por Pagar</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Gasto normalizado a EUR · {periodoTexto}
          </p>
        </div>
        <PeriodSelector current={anio === "todos" ? "todos" : String(anio)} />
      </div>

      {/* Fila 1 — evolución (hero, reducido) + moneda de origen */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div
          className="lg:col-span-2 animate-in fade-in-0 slide-in-from-bottom-1 duration-500"
          style={{ animationFillMode: "backwards" }}
        >
          <Panel
            eyebrow="Evolución"
            title="Gasto mensual, comparación interanual"
            description="Total facturado (neto de abonos) por mes en abril, mayo y junio."
            className="h-full"
            tint="violet"
          >
            <InteranualChart data={data.interanual} />
          </Panel>
        </div>
        <div
          className="animate-in fade-in-0 slide-in-from-bottom-1 duration-500"
          style={{ animationDelay: "60ms", animationFillMode: "backwards" }}
        >
          <Panel
            eyebrow="Divisa de origen"
            title="Gasto por moneda"
            description="Documentos EUR, USD y CNY, valorados en EUR."
            className="h-full"
            tint="sky"
          >
            {data.porMoneda.length > 0 ? (
              <MonedaChart data={data.porMoneda} />
            ) : (
              <EmptyState />
            )}
          </Panel>
        </div>
      </div>

      {/* Fila 2 — indicadores clave (ya no fijos en la parte superior) */}
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-1 duration-500"
        style={{ animationDelay: "120ms", animationFillMode: "backwards" }}
      >
        <KpiCards kpis={data.kpis} />
      </div>

      {/* Fila 3 — proveedor (top 10) + centro de coste */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div
          className="lg:col-span-2 animate-in fade-in-0 slide-in-from-bottom-1 duration-500"
          style={{ animationDelay: "180ms", animationFillMode: "backwards" }}
        >
          <Panel
            eyebrow="Concentración"
            title="Gasto por proveedor (top 10)"
            description="Ordenado por gasto EUR del periodo."
            className="h-full"
          >
            {data.porProveedor.length > 0 ? (
              <ProveedorChart data={data.porProveedor} />
            ) : (
              <EmptyState />
            )}
          </Panel>
        </div>
        <div
          className="animate-in fade-in-0 slide-in-from-bottom-1 duration-500"
          style={{ animationDelay: "240ms", animationFillMode: "backwards" }}
        >
          <Panel
            eyebrow="Distribución"
            title="Gasto por centro de coste"
            description="Tiendas, ecommerce y almacén (nivel de línea de factura)."
            className="h-full"
          >
            {data.porCentro.length > 0 ? (
              <CentroChart data={data.porCentro} />
            ) : (
              <EmptyState />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center py-12 text-sm text-muted-foreground">
      Sin datos para el periodo seleccionado.
    </div>
  );
}
