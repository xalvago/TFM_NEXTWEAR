import {
  AlertOctagon,
  Database,
  FileWarning,
  GitBranch,
  Lightbulb,
  Package,
  Scale,
  Tags,
  Truck,
} from "lucide-react";
import {
  ESTADO_LABEL,
  formatEUR,
  formatEURCompact,
  formatInt,
  formatPct,
} from "@/lib/finance";
import type { ExecutiveData } from "@/lib/queries/executive";
import type { ComprasData } from "@/lib/queries/compras";
import type { Cobertura } from "@/lib/queries/cobertura";
import type { Insights } from "@/lib/insights";
import { InfoTip } from "@/components/info-tip";
import { Block } from "@/components/executive/dense";
import { TileModal } from "@/components/executive/tile-modal";
import { Reveal } from "@/components/reveal";
import { ControlSection } from "@/components/executive/control-section";
import { ComprasSection } from "@/components/executive/compras-section";
import { FxAudit } from "@/components/executive/fx-audit";
import { CoberturaDetalle } from "@/components/executive/cobertura-block";
import { InsightsBlock } from "@/components/executive/insights-block";

const ICON = { size: 18, strokeWidth: 1.9 } as const;

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <Reveal from="left"><h2 className="eyebrow">{titulo}</h2></Reveal>
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

/**
 * Análisis en tarjetas: cada tema aparece recogido (concepto + una cifra) y se abre
 * en una ventana emergente con el detalle completo. Mismos datos que antes, sin
 * mostrarlos todos a la vez.
 */
export function AnalisisTiles({
  data,
  compras,
  cobertura,
  insights,
}: {
  data: ExecutiveData;
  compras: ComprasData;
  cobertura: Cobertura;
  insights: Insights;
}) {
  const c = data.control;
  const t = compras.totales;
  const plazo = compras.plazo;

  const totalFacturas = c.embudo.reduce((a, e) => a + e.numFacturas, 0);
  const estadoTop = c.embudo[0];
  const pctHumano = c.totalCasos > 0 ? c.casosRequierenHumano / c.totalCasos : 0;
  const topExc = c.topExcepciones[0];
  const pctTarde = plazo.numAlbaranes > 0 ? plazo.conRetraso / plazo.numAlbaranes : 0;
  const catTop = compras.porCategoria[0];
  const skuTop = compras.topSkus[0];
  const fxFuera = data.auditoriaFx.reduce((a, f) => a + f.fueraDeRango, 0);
  const nAcciones = insights.acciones.filter(Boolean).length;
  const nRiesgos = insights.riesgos.filter(Boolean).length;
  const disponibles = cobertura.filas.filter((f) => f.estado === "disponible").length;

  return (
    <div className="flex flex-col gap-4">
      <Grupo titulo="Control de facturación">
        <Reveal from="left" delay={0}>
        <TileModal
          gradient={["#0a7d96", "#1fb5b8"]}
          icon={<GitBranch {...ICON} />}
          eyebrow="Estado del ciclo"
          title="Dónde está cada factura"
          value={`${formatInt(totalFacturas)} facturas`}
          caption={
            estadoTop
              ? `Mayoría: ${ESTADO_LABEL[estadoTop.estado] ?? estadoTop.estado} (${formatInt(estadoTop.numFacturas)})`
              : "Sin datos"
          }
        >
          <ControlSection control={c} part="estados" />
        </TileModal>
        </Reveal>

        <Reveal from="zoom" delay={90}>
        <TileModal
          gradient={["#ff6a3d", "#ffa550"]}
          icon={<AlertOctagon {...ICON} />}
          eyebrow="Excepciones"
          title="Excepciones por tipo"
          value={`${formatInt(c.totalCasos)} casos`}
          caption={
            c.totalCasos > 0
              ? `${formatPct(pctHumano)} requieren humano · ${formatInt(c.casosAbiertos)} sin resolver`
              : "Sin casos con los filtros activos"
          }
        >
          <ControlSection control={c} part="tipos" />
        </TileModal>
        </Reveal>

        <Reveal from="right" delay={180}>
        <TileModal
          gradient={["#dc2626", "#ff6a3d"]}
          icon={<FileWarning {...ICON} />}
          eyebrow="Importe en riesgo"
          title="Mayores importes en excepción"
          value={topExc ? formatEUR(topExc.importeEur) : "—"}
          caption={
            topExc
              ? `${topExc.numeroFactura ?? topExc.facturaId} · ${topExc.proveedor}`
              : "Ninguna factura en excepción"
          }
        >
          <ControlSection control={c} part="top" />
        </TileModal>
        </Reveal>
      </Grupo>

      <Grupo titulo="Compras">
        <Reveal from="left" delay={0}>
        <TileModal
          gradient={["#0080a0", "#1b3f73"]}
          icon={<Truck {...ICON} />}
          eyebrow="Pedido → albarán → factura"
          title="Entregas y volumen"
          value={t.numPedidos > 0 ? `${formatPct(t.tasaRecepcion)} recibido` : "—"}
          caption={
            plazo.numAlbaranes > 0
              ? `${formatPct(pctTarde)} de albaranes llegan tarde`
              : "Sin pedidos con los filtros activos"
          }
        >
          <ComprasSection data={compras} part="entregas" />
        </TileModal>
        </Reveal>

        <Reveal from="zoom" delay={90}>
        <TileModal
          gradient={["#1b3f73", "#0a8fab"]}
          icon={<Tags {...ICON} />}
          eyebrow="Qué compramos"
          title="Gasto por categoría"
          value={catTop ? formatEURCompact(catTop.gastoFacturadoEur) : "—"}
          caption={
            catTop
              ? `Líder: ${catTop.categoria} · ${compras.porCategoria.length} categorías`
              : "Sin datos"
          }
        >
          <ComprasSection data={compras} part="categoria" />
        </TileModal>
        </Reveal>

        <Reveal from="right" delay={180}>
        <TileModal
          gradient={["#059669", "#1fb5b8"]}
          wide
          icon={<Package {...ICON} />}
          eyebrow="Qué compramos"
          title="Productos con más gasto"
          value={skuTop ? formatEURCompact(skuTop.gastoFacturadoEur) : "—"}
          caption={skuTop ? skuTop.descripcion : "Sin datos"}
        >
          <ComprasSection data={compras} part="productos" />
        </TileModal>
        </Reveal>
      </Grupo>

      <Grupo titulo="Calidad y lectura de los datos">
        <Reveal from="left" delay={0}>
        <TileModal
          gradient={["#f5a03a", "#ff6a3d"]}
          icon={<Scale {...ICON} />}
          eyebrow="Tipo de cambio"
          title="Tasa aplicada frente a referencia"
          value={fxFuera > 0 ? `${formatInt(fxFuera)} fuera de rango` : "Sin alertas"}
          caption={
            data.auditoriaFx.length > 0
              ? `${data.auditoriaFx.map((f) => f.moneda).join(" · ")} auditadas`
              : "Sin facturas en divisa"
          }
        >
          <Block
            eyebrow="Tipo de cambio"
            title="Tasa aplicada frente a referencia"
            info={
              <InfoTip text="Unidades de divisa por 1 EUR. Compara facturas.tipo_cambio_aplicado con el rango mín–máx de tipos_cambio por moneda. Fuera de rango = posible error de conversión." />
            }
          >
            <FxAudit data={data.auditoriaFx} />
          </Block>
        </TileModal>
        </Reveal>

        <Reveal from="zoom" delay={90}>
        <TileModal
          gradient={["#0d9488", "#22c55e"]}
          wide
          icon={<Database {...ICON} />}
          eyebrow="Transparencia"
          title="Cobertura de datos"
          value={`${disponibles} de ${cobertura.filas.length}`}
          caption="métricas con completitud suficiente"
        >
          <CoberturaDetalle cobertura={cobertura} />
        </TileModal>
        </Reveal>

        <Reveal from="right" delay={180}>
        <TileModal
          gradient={["#ff6a3d", "#1b3f73"]}
          icon={<Lightbulb {...ICON} />}
          eyebrow="Lectura rápida"
          title="Qué dicen los datos"
          value={`${nAcciones} acciones`}
          caption={`${nRiesgos} riesgos · conclusiones del periodo`}
        >
          <InsightsBlock insights={insights} />
        </TileModal>
        </Reveal>
      </Grupo>
    </div>
  );
}
