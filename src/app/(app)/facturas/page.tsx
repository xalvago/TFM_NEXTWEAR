import {
  getFacturas,
  getProveedoresOptions,
  getCasosExcepcion,
  getCasosPorTipo,
  type FacturasFiltros,
} from "@/lib/queries/facturas";
import { getPagos } from "@/lib/queries/pagos";
import {
  ESTADOS_EXCLUIDOS_GASTO,
  formatEUR,
  formatInt,
  TIPOS_EXCEPCION_AUTOMATICOS,
} from "@/lib/finance";
import { StatTile } from "@/components/stat-tile";
import { AlertTriangle, FileText, Scale, Wallet } from "lucide-react";
import { FacturasWorkspace } from "@/components/facturas/facturas-workspace";
import { PagosSection } from "@/components/pagos/pagos-section";
import { Panel } from "@/components/panel";
import { BorrarNuevasDialog } from "@/components/facturas/borrar-nuevas-dialog";

export const dynamic = "force-dynamic";

function num(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

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
    pais?: string;
    canal?: string;
    min?: string;
    max?: string;
    humano?: string;
    saldo?: string;
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
    pais: sp.pais,
    canal: sp.canal,
    minEur: num(sp.min),
    maxEur: num(sp.max),
    soloHumano: sp.humano === "1",
    conSaldo: sp.saldo === "1",
  };

  const [facturas, proveedores, casos, counts, pagos] = await Promise.all([
    getFacturas(filtros),
    getProveedoresOptions(),
    getCasosExcepcion(sp.exc),
    getCasosPorTipo(),
    getPagos({ estadoPago: sp.pagoEstado }),
  ]);

  const totalCasos = Object.values(counts).reduce((a, b) => a + b, 0);
  const totalIntervencion = Object.entries(counts).reduce(
    (a, [tipo, n]) => a + (TIPOS_EXCEPCION_AUTOMATICOS.has(tipo) ? 0 : n),
    0,
  );
  const totalAutomatico = totalCasos - totalIntervencion;

  // Resumen de la lista filtrada (importes sin anuladas ni cargas en curso).
  const financieras = facturas.filter(
    (f) => !ESTADOS_EXCLUIDOS_GASTO.includes(f.estado ?? ""),
  );
  const totalListaEur = financieras.reduce(
    (a, f) => a + (f.total_factura_eur ?? 0),
    0,
  );
  const saldoListaEur = financieras.reduce(
    (a, f) => a + (f.saldo_pendiente_eur ?? 0),
    0,
  );
  const enExcepcion = financieras.filter((f) => f.estado === "en_excepcion");
  const importeExcepcion = enExcepcion.reduce(
    (a, f) => a + (f.total_factura_eur ?? 0),
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
        <BorrarNuevasDialog />
      </div>

      {/* Filtros + panel de alertas plegable + tabla en un solo contenedor */}
      <FacturasWorkspace
        rows={facturas}
        proveedores={proveedores}
        casos={casos}
        counts={counts}
        activeTipo={sp.exc}
        totalIntervencion={totalIntervencion}
        totalAutomatico={totalAutomatico}
        kpis={[
          <StatTile
            key="listadas"
            label="Facturas listadas"
            value={formatInt(facturas.length)}
            note={`${formatInt(financieras.length)} con importe contable`}
            info="Resultado de los filtros activos. Las anuladas y cargas en curso del robot se listan, pero no suman importes."
            icon={FileText}
          />,
          <StatTile
            key="total"
            label="Total listado"
            value={formatEUR(totalListaEur)}
            note="con IVA, neto de abonos"
            info="Suma de total_factura_eur de la lista, sin anuladas ni cargas en curso."
            tone="credit"
            icon={Wallet}
          />,
          <StatTile
            key="saldo"
            label="Saldo pendiente"
            value={formatEUR(saldoListaEur)}
            note="de las facturas listadas"
            info="Suma de saldo_pendiente_eur de la lista."
            tone="pending"
            icon={Scale}
          />,
          <StatTile
            key="excepcion"
            label="En excepción"
            value={formatInt(enExcepcion.length)}
            note={formatEUR(importeExcepcion)}
            info="Facturas listadas en estado en_excepcion y su total."
            tone={enExcepcion.length > 0 ? "exception" : "ok"}
            icon={AlertTriangle}
          />,
        ]}
      />

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
