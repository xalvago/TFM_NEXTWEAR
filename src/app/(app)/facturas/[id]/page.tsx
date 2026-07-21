import Link from "next/link";
import { notFound } from "next/navigation";
import { getFacturaDetalle } from "@/lib/queries/facturas";
import {
  formatEUR,
  formatMoneda,
  formatDate,
  formatInt,
  ESTADO_LABEL,
  estadoTone,
  TIPO_EXCEPCION_LABEL,
  ESTADO_RESOLUCION_LABEL,
  estadoResolucionTone,
  TIPO_ASIENTO_LABEL,
  ESTADO_REGISTRO_LABEL,
  estadoRegistroTone,
} from "@/lib/finance";
import { StateBadge } from "@/components/state-badge";
import { Panel } from "@/components/panel";
import { FacturaDocumento } from "@/components/facturas/factura-documento";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FacturaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detalle = await getFacturaDetalle(id);
  if (!detalle) notFound();

  const { factura: f, lineas, pedido, albaranes, casos, asientos } = detalle;
  const esExtranjera = f.moneda_original && f.moneda_original !== "EUR";
  const lineasFlag = lineas.filter((l) => l.flag_revision).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Volver */}
      <Link
        href="/facturas"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span aria-hidden>←</span> Facturas y conciliación
      </Link>

      {/* Cabecera */}
      <header className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-card sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow">
              {f.serie ? `Serie ${f.serie} · ` : ""}
              {f.factura_id}
            </span>
            {f.es_nota_credito && (
              <StateBadge tone="credit" dot={false}>
                Nota de crédito
              </StateBadge>
            )}
          </div>
          <h1 className="font-display text-3xl tracking-tight leading-none">
            {f.numero_factura ?? f.factura_id}
          </h1>
          <p className="text-sm text-muted-foreground">
            {f.razon_social_proveedor ?? f.proveedor_id ?? "—"}
            {f.nif_proveedor ? ` · ${f.nif_proveedor}` : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            Expedición {formatDate(f.fecha_expedicion)} · Vencimiento{" "}
            {formatDate(f.fecha_vencimiento)}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <StateBadge tone={estadoTone(f.estado)}>
            {ESTADO_LABEL[f.estado ?? ""] ?? f.estado ?? "—"}
          </StateBadge>
          <span
            className={cn(
              "font-numeric text-3xl",
              (f.total_factura_eur ?? 0) < 0 && "text-[color:var(--credit)]"
            )}
          >
            {formatEUR(f.total_factura_eur)}
          </span>
          <span className="text-xs text-muted-foreground">
            Saldo pendiente {formatEUR(f.saldo_pendiente_eur)}
          </span>
        </div>
      </header>

      {/* Banner de excepción */}
      {(f.estado === "en_excepcion" || f.motivo_excepcion) && (
        <div className="flex items-start gap-3 rounded-2xl border border-[color:var(--exception)]/35 bg-[color:var(--exception)]/8 p-4">
          <span
            aria-hidden
            className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[color:var(--exception)] text-[10px] font-bold text-[color:var(--exception-foreground)]"
          >
            !
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-[color:var(--exception)]">
              Requiere revisión humana
            </span>
            {f.motivo_excepcion && (
              <p className="text-sm text-muted-foreground">
                {f.motivo_excepcion}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Nota de crédito → factura original */}
      {f.es_nota_credito && f.factura_original_id && (
        <div className="rounded-2xl border border-[color:var(--credit)]/30 bg-[color:var(--credit)]/8 px-4 py-3 text-sm">
          Rectifica a la factura{" "}
          <Link
            href={`/facturas/${f.factura_original_id}`}
            className="font-numeric text-[color:var(--credit)] hover:underline underline-offset-2"
          >
            {f.factura_original_id} →
          </Link>
        </div>
      )}

      {/* Factura tipo (documento con formato) */}
      <Panel
        eyebrow="Documento"
        title="Factura tipo"
        description="Representación con formato de factura a partir de los datos registrados."
        tint="violet"
      >
        <FacturaDocumento factura={f} lineas={lineas} />
      </Panel>

      {/* Conciliación a tres bandas */}
      <Panel
        eyebrow="Conciliación a tres bandas"
        title="Factura · Pedido · Albaranes"
        description="Trazabilidad del documento con su orden de compra y entregas."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <MatchCard
            label="Factura"
            id={f.factura_id}
            estado={ESTADO_LABEL[f.estado ?? ""] ?? f.estado}
            tone={estadoTone(f.estado)}
            emphasis
          />
          <MatchConnector />
          {pedido ? (
            <MatchCard
              label="Pedido"
              id={pedido.pedido_id}
              estado={pedido.estado ?? "—"}
              tone="neutral"
              extra={`Pedido ${formatDate(pedido.fecha_pedido)}`}
            />
          ) : (
            <MatchCard label="Pedido" id="Sin pedido" tone="exception" missing />
          )}
        </div>
        <div className="mt-3">
          {albaranes.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {albaranes.map((a) => (
                <MatchCard
                  key={a.albaran_id}
                  label="Albarán"
                  id={a.albaran_id}
                  estado={a.estado ?? "—"}
                  tone={a.estado === "discrepancia" ? "exception" : "neutral"}
                  extra={`Entrega ${formatDate(a.fecha_entrega)}`}
                />
              ))}
            </div>
          ) : (
            <MatchCard label="Albarán" id="Sin albarán" tone="exception" missing />
          )}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Líneas */}
        <div className="lg:col-span-2">
          <Panel
            eyebrow="Detalle"
            title="Líneas de factura"
            description={
              lineasFlag > 0
                ? `${formatInt(lineasFlag)} línea(s) marcadas para revisión.`
                : `${formatInt(lineas.length)} líneas.`
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[110px]">SKU</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-[70px] text-right">Cant.</TableHead>
                    <TableHead className="w-[130px] text-right">
                      P. unit. EUR
                    </TableHead>
                    <TableHead className="w-[130px] text-right">
                      Total EUR
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineas.map((l) => (
                    <TableRow
                      key={l.linea_id}
                      className={cn(
                        "hover:bg-transparent",
                        l.flag_revision &&
                          "bg-[color:var(--exception)]/6 hover:bg-[color:var(--exception)]/10"
                      )}
                    >
                      <TableCell className="font-numeric text-xs text-muted-foreground align-top">
                        {l.sku ?? "—"}
                      </TableCell>
                      <TableCell className="align-top">
                        <span>{l.descripcion ?? "—"}</span>
                        {l.flag_revision && (
                          <span className="mt-1 flex items-center gap-1.5">
                            <StateBadge tone="exception" dot={false}>
                              Revisión
                            </StateBadge>
                            {l.motivo_flag && (
                              <span className="text-xs text-muted-foreground">
                                {l.motivo_flag}
                              </span>
                            )}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-numeric align-top">
                        {formatInt(l.cantidad)}
                      </TableCell>
                      <TableCell className="text-right font-numeric align-top">
                        {formatEUR(l.precio_unitario_eur)}
                      </TableCell>
                      <TableCell className="text-right font-numeric align-top">
                        {formatEUR(l.total_linea_eur)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </div>

        {/* Rail: importes + casos */}
        <div className="flex flex-col gap-6">
          <Panel eyebrow="Importes" title="Doble moneda">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="pb-2 text-left font-medium">Concepto</th>
                  <th className="pb-2 text-right font-medium">
                    {f.moneda_original ?? "—"}
                  </th>
                  <th className="pb-2 text-right font-medium">EUR</th>
                </tr>
              </thead>
              <tbody className="font-numeric">
                <MoneyRow
                  label="Base"
                  original={formatMoneda(f.base_imponible_original, f.moneda_original)}
                  eur={formatEUR(f.base_imponible_eur)}
                />
                <MoneyRow
                  label="IVA"
                  original={formatMoneda(f.cuota_iva_original, f.moneda_original)}
                  eur={formatEUR(f.cuota_iva_eur)}
                />
                <MoneyRow
                  label="Total"
                  original={formatMoneda(f.total_factura_original, f.moneda_original)}
                  eur={formatEUR(f.total_factura_eur)}
                  emphasis
                />
              </tbody>
            </table>
            {esExtranjera && (
              <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                Tipo de cambio {f.tipo_cambio_aplicado ?? "—"} ·{" "}
                {formatDate(f.fecha_tipo_cambio)}. Importes normalizados a EUR
                para todos los cálculos.
              </p>
            )}
          </Panel>

          <Panel
            eyebrow="ERP"
            title="Registro contable"
            description={
              asientos.length > 0
                ? `${formatInt(asientos.length)} asiento(s) registrado(s).`
                : "Aún no contabilizada."
            }
          >
            {asientos.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {asientos.map((a) => (
                  <li
                    key={a.asiento_id}
                    className="rounded-xl border border-border/60 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StateBadge tone="neutral" dot={false}>
                          {TIPO_ASIENTO_LABEL[a.tipo_asiento ?? ""] ??
                            a.tipo_asiento}
                        </StateBadge>
                        <StateBadge
                          tone={estadoRegistroTone(a.estado_registro)}
                          dot={false}
                        >
                          {ESTADO_REGISTRO_LABEL[a.estado_registro ?? ""] ??
                            a.estado_registro ??
                            "—"}
                        </StateBadge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(a.fecha_asiento)}
                      </span>
                    </div>
                    {a.id_erp_externo && (
                      <p className="mt-1 font-numeric text-xs text-muted-foreground">
                        ID ERP {a.id_erp_externo}
                        {a.fecha_registro
                          ? ` · registrado ${formatDate(a.fecha_registro)}`
                          : ""}
                      </p>
                    )}
                    <table className="mt-2 w-full text-xs">
                      <tbody className="font-numeric">
                        {a.lineas.map((l) => (
                          <tr
                            key={l.linea_num}
                            className="border-t border-border/40"
                          >
                            <td className="py-1 text-left font-sans text-muted-foreground">
                              <span className="font-numeric">{l.cuenta}</span>{" "}
                              {l.cuenta_descripcion}
                            </td>
                            <td className="py-1 text-right">
                              {l.debe_eur ? formatEUR(l.debe_eur) : ""}
                            </td>
                            <td className="py-1 text-right">
                              {l.haber_eur ? formatEUR(l.haber_eur) : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {f.estado === "en_excepcion"
                  ? "Bloqueada para el ERP hasta resolver la excepción."
                  : "El agente contabilizador aún no ha generado el asiento."}
              </p>
            )}
          </Panel>

          {casos.length > 0 && (
            <Panel
              eyebrow="Requiere atención"
              title={`Casos de excepción (${casos.length})`}
            >
              <ul className="flex flex-col gap-3">
                {casos.map((c) => (
                  <li key={c.caso_id} className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StateBadge tone="exception" dot={false}>
                        {TIPO_EXCEPCION_LABEL[c.tipo_excepcion ?? ""] ??
                          c.tipo_excepcion}
                      </StateBadge>
                      <StateBadge
                        tone={estadoResolucionTone(c.estado_resolucion)}
                        dot={false}
                      >
                        {ESTADO_RESOLUCION_LABEL[c.estado_resolucion ?? ""] ??
                          c.estado_resolucion ??
                          "—"}
                      </StateBadge>
                    </div>
                    {c.descripcion && (
                      <p className="text-sm text-muted-foreground leading-snug">
                        {c.descripcion}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

// --- helpers de presentación --------------------------------------------------

function MatchCard({
  label,
  id,
  estado,
  tone = "neutral",
  extra,
  emphasis,
  missing,
}: {
  label: string;
  id: string;
  estado?: string | null;
  tone?: "ok" | "exception" | "pending" | "credit" | "neutral";
  extra?: string;
  emphasis?: boolean;
  missing?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl p-4",
        emphasis
          ? "bg-primary/8"
          : missing
            ? "bg-[color:var(--exception)]/8"
            : "bg-secondary/60"
      )}
    >
      <span className="eyebrow">{label}</span>
      <span className="font-numeric text-base">{id}</span>
      {estado && !missing && (
        <StateBadge tone={tone} dot={false}>
          {estado}
        </StateBadge>
      )}
      {missing && (
        <span className="text-xs text-[color:var(--exception)]">
          No referenciado
        </span>
      )}
      {extra && <span className="text-xs text-muted-foreground">{extra}</span>}
    </div>
  );
}

function MatchConnector() {
  return (
    <div className="hidden items-center justify-center md:flex">
      <span
        aria-hidden
        className="font-numeric text-lg text-muted-foreground/50"
      >
        ↔
      </span>
    </div>
  );
}

function MoneyRow({
  label,
  original,
  eur,
  emphasis,
}: {
  label: string;
  original: string;
  eur: string;
  emphasis?: boolean;
}) {
  return (
    <tr
      className={cn(
        "border-t border-border/50",
        emphasis && "font-medium text-foreground"
      )}
    >
      <td className="py-1.5 text-left font-sans text-muted-foreground">
        {label}
      </td>
      <td className="py-1.5 text-right">{original}</td>
      <td className="py-1.5 text-right">{eur}</td>
    </tr>
  );
}
