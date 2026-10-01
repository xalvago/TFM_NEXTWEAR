import Link from "next/link";
import { StateBadge } from "@/components/state-badge";
import { Panel } from "@/components/panel";
import {
  formatEUR,
  formatDate,
  ESTADO_LABEL,
  estadoTone,
  ESTADO_PEDIDO_LABEL,
  estadoPedidoTone,
  ESTADO_ALBARAN_LABEL,
  estadoAlbaranTone,
  TIPO_EXCEPCION_LABEL,
  ESTADO_RESOLUCION_LABEL,
  estadoResolucionTone,
} from "@/lib/finance";
import type {
  AlbaranRefLite,
  CasoRef,
  FacturaRef,
} from "@/lib/queries/documentos";
import { cn } from "@/lib/utils";

type Foco = "pedido" | "albaran";

/**
 * Cadena documental Pedido ↔ Albarán(es) ↔ Factura(s) con cada nodo enlazado.
 * `foco` resalta el documento de la página actual.
 */
export function CadenaDocumental({
  foco,
  pedido,
  albaranes,
  facturas,
}: {
  foco: Foco;
  pedido: { pedido_id: string; estado: string | null; fecha_pedido: string | null } | null;
  albaranes: AlbaranRefLite[];
  facturas: FacturaRef[];
}) {
  return (
    <Panel
      eyebrow="Conciliación a tres bandas"
      title="Pedido · Albaranes · Facturas"
      description="Trazabilidad completa; cada documento es navegable."
      tint="violet"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Columna titulo="Pedido">
          {pedido ? (
            <Nodo
              href={`/pedidos/${pedido.pedido_id}`}
              id={pedido.pedido_id}
              activo={foco === "pedido"}
              badge={
                <StateBadge tone={estadoPedidoTone(pedido.estado)} dot={false}>
                  {ESTADO_PEDIDO_LABEL[pedido.estado ?? ""] ?? pedido.estado ?? "—"}
                </StateBadge>
              }
              extra={`Pedido ${formatDate(pedido.fecha_pedido)}`}
            />
          ) : (
            <Faltante texto="Sin pedido referenciado" />
          )}
        </Columna>

        <Columna titulo={`Albaranes (${albaranes.length})`}>
          {albaranes.length > 0 ? (
            albaranes.map((a) => (
              <Nodo
                key={a.albaran_id}
                href={`/albaranes/${a.albaran_id}`}
                id={a.albaran_id}
                activo={foco === "albaran"}
                badge={
                  <StateBadge tone={estadoAlbaranTone(a.estado)} dot={false}>
                    {ESTADO_ALBARAN_LABEL[a.estado ?? ""] ?? a.estado ?? "—"}
                  </StateBadge>
                }
                extra={`Entrega ${formatDate(a.fecha_entrega)}`}
              />
            ))
          ) : (
            <Faltante texto="Sin albarán" />
          )}
        </Columna>

        <Columna titulo={`Facturas (${facturas.length})`}>
          {facturas.length > 0 ? (
            facturas.map((f) => (
              <Nodo
                key={f.factura_id}
                href={`/facturas/${f.factura_id}`}
                id={f.numero_factura ?? f.factura_id}
                badge={
                  <StateBadge tone={estadoTone(f.estado)} dot={false}>
                    {ESTADO_LABEL[f.estado ?? ""] ?? f.estado ?? "—"}
                  </StateBadge>
                }
                extra={`${formatDate(f.fecha_expedicion)} · ${formatEUR(f.total_factura_eur)}${f.es_nota_credito ? " · NC" : ""}`}
              />
            ))
          ) : (
            <Faltante texto="Aún sin factura" />
          )}
        </Columna>
      </div>
    </Panel>
  );
}

/** Lista de casos de excepción (reutilizable en pedido y albarán). */
export function CasosPanel({ casos }: { casos: CasoRef[] }) {
  if (casos.length === 0) return null;
  return (
    <Panel
      eyebrow="Requiere atención"
      title={`Casos de excepción (${casos.length})`}
      tint="rose"
    >
      <ul className="flex flex-col gap-3">
        {casos.map((c) => (
          <li key={c.caso_id} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <StateBadge
                tone={c.requiere_intervencion_humana ? "exception" : "neutral"}
                dot={false}
              >
                {TIPO_EXCEPCION_LABEL[c.tipo_excepcion ?? ""] ?? c.tipo_excepcion}
              </StateBadge>
              <StateBadge tone={estadoResolucionTone(c.estado_resolucion)} dot={false}>
                {ESTADO_RESOLUCION_LABEL[c.estado_resolucion ?? ""] ??
                  c.estado_resolucion ??
                  "—"}
              </StateBadge>
            </div>
            {c.descripcion && (
              <p className="text-sm leading-snug text-muted-foreground">
                {c.descripcion}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Columna({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="eyebrow">{titulo}</span>
      {children}
    </div>
  );
}

function Nodo({
  href,
  id,
  badge,
  extra,
  activo,
}: {
  href: string;
  id: string;
  badge: React.ReactNode;
  extra?: string;
  activo?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col gap-1.5 rounded-2xl p-3.5 transition-colors",
        activo ? "bg-primary/10 ring-1 ring-primary/30" : "bg-secondary/60 hover:bg-accent/60"
      )}
    >
      <span className="font-numeric text-sm hover:underline">{id} →</span>
      <span>{badge}</span>
      {extra && <span className="text-xs text-muted-foreground">{extra}</span>}
    </Link>
  );
}

function Faltante({ texto }: { texto: string }) {
  return (
    <div className="rounded-2xl bg-[color:var(--exception)]/8 p-3.5 text-xs text-[color:var(--exception)]">
      {texto}
    </div>
  );
}
