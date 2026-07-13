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
import { Wallet, TriangleAlert, PackageSearch } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{
    categoria?: string;
    centro?: string;
    umbral?: string;
  }>;
}) {
  const sp = await searchParams;
  const filtros: StockFiltros = {
    categoria: sp.categoria,
    centroId: sp.centro,
  };
  const umbral =
    Number(sp.umbral) > 0 ? Number(sp.umbral) : UMBRAL_STOCK_BAJO_DEFECTO;

  const [rows, categorias, centros, reposicion] = await Promise.all([
    getStockRows(filtros),
    getCategoriasOptions(),
    getCentrosOptions(),
    getReposicionPrevista(),
  ]);

  const valorTotalEur = round2(rows.reduce((a, r) => a + r.valorEur, 0));
  const numBajo = rows.filter((r) => r.cantidadDisponible <= umbral).length;
  const unidadesTotal = rows.reduce((a, r) => a + r.cantidadDisponible, 0);

  return (
    <div className="flex flex-col gap-6">
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

      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card-wash hover-lift group relative flex flex-col gap-3 overflow-hidden rounded-2xl p-5 shadow-card">
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{ background: "var(--gradient-brand)" }}
          />
          <span className="gradient-brand-soft grid size-9 place-items-center rounded-xl text-primary">
            <Wallet aria-hidden size={17} strokeWidth={1.75} className="icon-anim" />
          </span>
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Valoración de inventario (EUR)</span>
            <span className="font-numeric text-2xl leading-none">
              {formatEUR(valorTotalEur)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatInt(unidadesTotal)} unidades en stock
            </span>
          </div>
        </div>
        <div className="card-wash hover-lift group relative flex flex-col gap-3 overflow-hidden rounded-2xl p-5 shadow-card">
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{
              background:
                numBajo > 0
                  ? "linear-gradient(90deg, var(--exception), color-mix(in oklab, var(--exception), var(--pending) 55%))"
                  : "linear-gradient(90deg, var(--ok), color-mix(in oklab, var(--ok), var(--chart-2) 55%))",
            }}
          />
          <span
            className={
              "grid size-9 place-items-center rounded-xl " +
              (numBajo > 0
                ? "bg-[color:var(--exception)]/10 text-[color:var(--exception)]"
                : "bg-[color:var(--ok)]/10 text-[color:var(--ok)]")
            }
          >
            <TriangleAlert aria-hidden size={17} strokeWidth={1.75} className="icon-anim" />
          </span>
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Alertas de stock bajo</span>
            <span
              className="font-numeric text-2xl leading-none"
              style={{ color: numBajo > 0 ? "var(--exception)" : undefined }}
            >
              {formatInt(numBajo)}
            </span>
            <span className="text-xs text-muted-foreground">
              umbral {formatInt(umbral)} unidades
            </span>
          </div>
        </div>
        <div className="card-wash hover-lift group relative flex flex-col gap-3 overflow-hidden rounded-2xl p-5 shadow-card">
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{
              background:
                "linear-gradient(90deg, var(--credit), color-mix(in oklab, var(--credit), var(--chart-1) 55%))",
            }}
          />
          <span className="grid size-9 place-items-center rounded-xl bg-[color:var(--credit)]/10 text-[color:var(--credit)]">
            <PackageSearch aria-hidden size={17} strokeWidth={1.75} className="icon-anim" />
          </span>
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Reposición en camino</span>
            <span className="font-numeric text-2xl leading-none">
              {formatInt(reposicion.length)}
            </span>
            <span className="text-xs text-muted-foreground">
              líneas pendientes en pedidos abiertos/parciales
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3 xl:items-stretch">
        {/* Filtros integrados como cabecera de la tabla */}
        <div className="xl:col-span-2">
          <div className="card-wash relative overflow-hidden rounded-2xl shadow-card">
            <StockFilters categorias={categorias} centros={centros} embedded />
            <StockTable rows={rows} umbral={umbral} embedded />
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
