import {
  getStockRows,
  getCategoriasOptions,
  getCentrosOptions,
  getReposicionPrevista,
  type StockFiltros,
} from "@/lib/queries/stock";
import { UMBRAL_STOCK_BAJO_DEFECTO } from "@/lib/constants";
import { formatEUR, formatInt } from "@/lib/finance";
import { StockFilters } from "@/components/stock/filters";
import { StockTable } from "@/components/stock/stock-table";
import { ReposicionPanel } from "@/components/stock/reposicion-panel";
import { Panel } from "@/components/panel";
import { Wallet, TriangleAlert, PackageSearch, Timer } from "lucide-react";
import { IsoKpi } from "@/components/stock/iso-kpi";
import { Block } from "@/components/executive/dense";
import { IsoColumns, IsoHBars, type IsoItem } from "@/components/stock/iso-charts";
import { InfoTip } from "@/components/info-tip";

export const dynamic = "force-dynamic";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{
    categoria?: string;
    centro?: string;
    umbral?: string;
    tipo?: string;
    nivel?: string;
    q?: string;
  }>;
}) {
  const sp = await searchParams;
  const filtros: StockFiltros = {
    categoria: sp.categoria,
    centroId: sp.centro,
    tipoCentro: sp.tipo,
    q: sp.q,
  };
  const umbral =
    Number(sp.umbral) > 0 ? Number(sp.umbral) : UMBRAL_STOCK_BAJO_DEFECTO;

  const [rows, categorias, centros, reposicion] = await Promise.all([
    getStockRows(filtros),
    getCategoriasOptions(),
    getCentrosOptions(),
    getReposicionPrevista(),
  ]);

  // El nivel (bajo / suficiente) filtra solo la tabla: los KPIs siguen viendo todo el conjunto.
  const filasTabla =
    sp.nivel === "bajo"
      ? rows.filter((r) => r.cantidadDisponible <= umbral)
      : sp.nivel === "ok"
        ? rows.filter((r) => r.cantidadDisponible > umbral)
        : rows;

  const valorTotalEur = round2(rows.reduce((a, r) => a + r.valorEur, 0));
  const numBajo = rows.filter((r) => r.cantidadDisponible <= umbral).length;
  const unidadesTotal = rows.reduce((a, r) => a + r.cantidadDisponible, 0);

  const agrupar = (clave: (r: (typeof rows)[number]) => string): IsoItem[] => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(clave(r), (m.get(clave(r)) ?? 0) + r.valorEur);
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ key: k, label: k, value: v }));
  };
  const porCentro = agrupar((r) => r.centroNombre);
  const porCategoria = agrupar((r) => r.categoria ?? "Sin categoría");

  return (
    <div className="flex flex-col gap-4">
      <Block
        tint="logo"
        heading={
          <div className="flex flex-col gap-2">
            <span className="eyebrow">Stock e inventario</span>
            <h1 className="font-display text-3xl tracking-tight sm:text-[2.1rem] leading-[1.1] pb-0.5">
              Stock e <span className="gradient-text">inventario</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {formatInt(rows.length)} combinaciones SKU × centro · valorado con el
              coste unitario del catálogo
            </p>
          </div>
        }
        info={<InfoTip text="Valor = cantidad disponible × coste unitario de catálogo (EUR), con los filtros de categoría y centro activos." />}
      >
        <section
          aria-label="Indicadores de stock"
          className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4"
        >
          <IsoKpi
            compact
            label="Valoración"
            value={formatEUR(valorTotalEur)}
            note={`${formatInt(unidadesTotal)} unidades en stock`}
            info="Cantidad disponible × productos.coste_unitario (coste de catálogo, EUR). El valor_unitario_eur de los movimientos daría otra cifra."
            icon={Wallet}
          />
          <IsoKpi
            compact
            label="Alertas de stock bajo"
            value={formatInt(numBajo)}
            note={`umbral ${formatInt(umbral)} unidades`}
            info="Combinaciones SKU × centro con cantidad disponible igual o menor que el umbral configurable."
            tone={numBajo > 0 ? "exception" : "ok"}
            icon={TriangleAlert}
          />
          <IsoKpi
            compact
            label="Reposición en camino"
            value={formatInt(reposicion.length)}
            note="líneas pendientes de pedidos vivos"
            info="Líneas de pedidos abiertos o parcialmente recibidos con unidades pendientes (pedido menos entregado en albaranes)."
            tone="credit"
            icon={PackageSearch}
          />
          <IsoKpi
            compact
            label="Rotación y cobertura"
            value="No disponible"
            note="solo hay movimientos de entrada"
            info="stock_movimientos solo contiene entradas (797 de 797): sin salidas no se puede calcular rotación ni días de cobertura. Se mostrará cuando se registren salidas."
            tone="pending"
            icon={Timer}
          />
        </section>

        <div className="-mt-2 grid items-start gap-x-6 gap-y-4 lg:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Por centro de coste</span>
            <div className="h-[22rem] [&>svg]:!h-full [&>svg]:!max-h-full">
              <IsoColumns
                items={porCentro}
                from="var(--chart-2)"
                to="var(--chart-3)"
                titulo="Valor del inventario por centro de coste"
                ejeY="Valor del inventario (EUR)"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="eyebrow">Por categoría</span>
            <div className="h-[22rem] [&>svg]:!h-full [&>svg]:!max-h-full">
              <IsoHBars
                items={porCategoria}
                from="var(--chart-1)"
                to="var(--chart-4)"
                titulo="Valor del inventario por categoría"
                idPrefix="sc"
                showPct
              />
            </div>
          </div>
        </div>
      </Block>

      <div className="grid gap-6 xl:grid-cols-3 xl:items-stretch">
        {/* Filtros integrados como cabecera de la tabla */}
        <div className="xl:col-span-2">
          <div className="card-wash relative overflow-hidden rounded-2xl shadow-card">
            <StockFilters categorias={categorias} centros={centros} embedded />
            <StockTable rows={filasTabla} umbral={umbral} embedded />
          </div>
        </div>

        {/* Previsión: ajustada a la altura de la tabla, scroll interno */}
        <div className="relative xl:col-span-1">
          <div className="flex flex-col xl:absolute xl:inset-0">
            <Panel
              eyebrow="Previsión"
              title="Reposición entrante"
              description="Cruce con pedidos abiertos/parciales, neto de lo ya entregado."
              className="h-full"
              tint="sky"
            >
              <ReposicionPanel rows={reposicion} />
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
