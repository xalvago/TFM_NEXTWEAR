import {
  getFacturas,
  getProveedoresOptions,
  getCasosExcepcion,
  getCasosPorTipo,
  type FacturasFiltros,
} from "@/lib/queries/facturas";
import { getPagos } from "@/lib/queries/pagos";
import { formatInt } from "@/lib/finance";
import { FacturasFilters } from "@/components/facturas/filters";
import { FacturasTable } from "@/components/facturas/facturas-table";
import { ExcepcionesPanel } from "@/components/facturas/excepciones-panel";
import { PagosSection } from "@/components/pagos/pagos-section";
import { Panel } from "@/components/panel";

export const dynamic = "force-dynamic";

export default async function FacturasPage({
  searchParams,
}: {
  searchParams: Promise<{
    estado?: string;
    proveedor?: string;
    moneda?: string;
    desde?: string;
    hasta?: string;
    q?: string;
    exc?: string;
    pagoEstado?: string;
  }>;
}) {
  const sp = await searchParams;
  const filtros: FacturasFiltros = {
    estado: sp.estado,
    proveedorId: sp.proveedor,
    moneda: sp.moneda,
    desde: sp.desde,
    hasta: sp.hasta,
    q: sp.q,
  };

  const [facturas, proveedores, casos, counts, pagos] = await Promise.all([
    getFacturas(filtros),
    getProveedoresOptions(),
    getCasosExcepcion(sp.exc),
    getCasosPorTipo(),
    getPagos({ estadoPago: sp.pagoEstado }),
  ]);

  const totalCasos = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Facturas y conciliación</span>
        <h1 className="font-display text-3xl tracking-tight sm:text-[2.1rem] leading-[1.1] pb-0.5">
          Facturas y <span className="gradient-text">conciliación</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {formatInt(facturas.length)} facturas · conciliación a tres bandas
          (factura ↔ pedido ↔ albarán)
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3 xl:items-stretch">
        {/* Filtros integrados como cabecera de la tabla (un solo contenedor) */}
        <div className="xl:col-span-2">
          <div className="card-wash relative overflow-hidden rounded-2xl shadow-card">
            <FacturasFilters proveedores={proveedores} embedded />
            <FacturasTable rows={facturas} embedded />
          </div>
        </div>

        {/* Requiere atención: se ajusta a la altura de la tabla y hace scroll interno */}
        <div className="relative xl:col-span-1">
          <div className="flex flex-col xl:absolute xl:inset-0">
            <ExcepcionesPanel
              casos={casos}
              counts={counts}
              activeTipo={sp.exc}
              total={totalCasos}
            />
          </div>
        </div>
      </div>

      <Panel
        eyebrow="Tesorería"
        title="Pagos"
        description={`${formatInt(pagos.length)} pagos registrados.`}
      >
        <PagosSection pagos={pagos} activeEstado={sp.pagoEstado} />
      </Panel>
    </div>
  );
}
