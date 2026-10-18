"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CreditCard,
  Mail,
  MapPin,
  Search,
  Tags,
  X,
} from "lucide-react";
import { StateBadge } from "@/components/state-badge";
import { CANAL_LABEL, MONEDA_LABEL, formatDate, formatEUR, formatInt, formatPct } from "@/lib/finance";
import type { ProveedorRow } from "@/lib/queries/proveedores";
import { cn } from "@/lib/utils";
import { CANAL_ICON, MonedaIcon, PaisFlag } from "@/components/dim-icon";
import { Block } from "@/components/executive/dense";
import { GloboProveedores } from "./globo-proveedores";

// Misma paleta por moneda que la vista ejecutiva, el mapa y las barras.
const MONEDA_COLOR: Record<string, string> = {
  EUR: "var(--chart-1)",
  USD: "var(--chart-3)",
  CNY: "var(--chart-2)",
};
const MONEDA_TINT: Record<string, string> = {
  EUR: "tint-violet",
  USD: "tint-amber",
  CNY: "tint-sky",
};

type Orden = "gasto" | "saldo" | "nombre";

/**
 * Tarjetas de proveedor: toda la ficha (quién es, de dónde, cómo factura y cómo
 * se le paga) y su actividad (gasto, saldo, pedidos, excepciones) en un mismo
 * bloque. Buscador instantáneo, filtro de moneda y orden; dataset pequeño → cliente.
 */
export function ProveedoresCards({
  rows,
  titulo,
  kpis,
}: {
  rows: ProveedorRow[];
  /** Cabecera de la página (eyebrow, h1, resumen). */
  titulo: React.ReactNode;
  /** Rejilla de KPIs, a la derecha de la cabecera. */
  kpis: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const [moneda, setMoneda] = useState<string>("todas");
  const [orden, setOrden] = useState<Orden>("gasto");

  const gastoMax = Math.max(...rows.map((p) => p.gastoTotalEur), 1);
  const gastoTotal = rows.reduce((a, p) => a + p.gastoTotalEur, 0);
  const monedas = useMemo(
    () => [...new Set(rows.map((p) => p.moneda_facturacion))].sort(),
    [rows]
  );

  const visibles = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtradas = rows.filter((p) => {
      if (moneda !== "todas" && p.moneda_facturacion !== moneda) return false;
      if (!needle) return true;
      return [
        p.proveedor_id,
        p.razon_social,
        p.nif,
        p.pais,
        p.direccion_sede,
        p.moneda_facturacion,
        p.canal_recepcion ? (CANAL_LABEL[p.canal_recepcion] ?? p.canal_recepcion) : null,
        p.email_recepcion_facturas,
        p.categorias_habituales,
        p.forma_pago,
        p.iban,
        p.activo ? "activo" : "inactivo",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
    return filtradas.sort((a, b) =>
      orden === "nombre"
        ? a.razon_social.localeCompare(b.razon_social)
        : orden === "saldo"
          ? b.saldoPendienteEur - a.saldoPendienteEur
          : b.gastoTotalEur - a.gastoTotalEur
    );
  }, [rows, q, moneda, orden]);

  const controles = (
    <div className="flex w-full min-w-0 flex-col gap-2 lg:max-w-sm lg:flex-1">
      <div className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            size={14}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre, NIF, país, IBAN…"
            aria-label="Buscar proveedores"
            className="h-8 w-full rounded-full border border-input bg-background/70 pl-8 pr-8 text-xs outline-none transition-colors focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Borrar búsqueda"
              className="absolute right-1.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X size={12} strokeWidth={2} />
            </button>
          )}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatInt(visibles.length)} de {formatInt(rows.length)}
        </span>
      </div>

      <Seg label="Moneda">
        <Chip active={moneda === "todas"} onClick={() => setMoneda("todas")}>
          Todas
        </Chip>
        {monedas.map((m) => (
          <Chip key={m} active={moneda === m} onClick={() => setMoneda(m)}>
            <MonedaIcon moneda={m} size={12} />
            {m}
          </Chip>
        ))}
      </Seg>

      <Seg label="Ordenar">
        <Chip active={orden === "gasto"} onClick={() => setOrden("gasto")}>
          Gasto
        </Chip>
        <Chip active={orden === "saldo"} onClick={() => setOrden("saldo")}>
          Saldo
        </Chip>
        <Chip active={orden === "nombre"} onClick={() => setOrden("nombre")}>
          Nombre
        </Chip>
      </Seg>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Cabecera | buscador y filtros apilados | KPIs 2×2 */}
      <Block
        tint="logo"
        className="gap-0"
        heading={
          <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <Fragment key="titulo">{titulo}</Fragment>
            {controles}
            <Fragment key="kpis">{kpis}</Fragment>
          </div>
        }
      >
        {null}
      </Block>

      <div className="grid items-start gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        {/* Globo: se acerca a las sedes de las tarjetas visibles; fijo mientras se recorren */}
        <section className="card-wash tint-sky relative overflow-hidden rounded-2xl shadow-card xl:sticky xl:top-24">
          <header className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="gradient-brand-soft grid size-7 place-items-center rounded-lg text-primary">
                <MapPin aria-hidden size={14} strokeWidth={1.75} />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="eyebrow">Sedes</span>
                <span className="text-xs text-muted-foreground">
                  {visibles.length === rows.length
                    ? "Todos los proveedores y ruta al almacén"
                    : `${formatInt(visibles.length)} de ${formatInt(rows.length)} proveedores`}
                </span>
              </div>
            </div>
            <ul className="flex items-center gap-2.5 text-[0.68rem] text-muted-foreground">
              {(
                [
                  ["EUR", "var(--chart-1)"],
                  ["USD", "var(--chart-3)"],
                  ["CNY", "var(--chart-2)"],
                ] as const
              ).map(([m, c]) => (
                <li key={m} className="flex items-center gap-1">
                  <span aria-hidden className="size-2 rounded-full" style={{ background: c }} />
                  {m}
                </li>
              ))}
            </ul>
          </header>
          <div className="px-3 pb-4">
            <GloboProveedores proveedores={rows} visibles={visibles} />
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-3">
      {visibles.length === 0 ? (
        <div className="card-wash grid place-items-center rounded-2xl py-14 text-sm text-muted-foreground shadow-card">
          {rows.length === 0
            ? "No hay proveedores registrados."
            : "Ningún proveedor coincide con los filtros."}
        </div>
      ) : (
        <div className="grid items-start gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,21rem),1fr))]">
          {visibles.map((p) => (
            <ProveedorCard
              key={p.proveedor_id}
              p={p}
              pctGasto={gastoTotal > 0 ? p.gastoTotalEur / gastoTotal : 0}
              anchoBarra={Math.max(2, (p.gastoTotalEur / gastoMax) * 100)}
            />
          ))}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

function ProveedorCard({
  p,
  pctGasto,
  anchoBarra,
}: {
  p: ProveedorRow;
  pctGasto: number;
  anchoBarra: number;
}) {
  const color = MONEDA_COLOR[p.moneda_facturacion] ?? "var(--chart-5)";
  return (
    <article
      className={cn(
        "card-wash hover-lift relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl px-4 pb-3.5 pt-4 shadow-card",
        MONEDA_TINT[p.moneda_facturacion] ?? "tint-violet",
        !p.activo && "opacity-75"
      )}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{
          background: `linear-gradient(90deg, ${color}, color-mix(in oklab, ${color}, transparent 70%))`,
        }}
      />

      {/* Identidad */}
      <header className="flex flex-col items-center gap-1.5 text-center">
        <div className="flex min-w-0 max-w-full flex-col items-center leading-tight">
          <Link
            href={`/facturas?proveedor=${p.proveedor_id}`}
            className="max-w-full truncate font-display text-base underline-offset-2 hover:underline"
            title={p.razon_social}
          >
            {p.razon_social}
          </Link>
          <span className="font-numeric text-[0.7rem] text-muted-foreground">
            {p.nif ?? p.proveedor_id}
            {p.pais && (
              <>
                {" · "}
                <PaisFlag pais={p.pais} size={14} className="inline-block align-[-2px]" /> {p.pais}
              </>
            )}
          </span>
        </div>
        <div className="flex shrink-0 items-center justify-center gap-1.5">
          {!p.activo && (
            <StateBadge tone="neutral" dot={false}>
              Inactivo
            </StateBadge>
          )}
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold text-white"
            style={{ background: color }}
            title={MONEDA_LABEL[p.moneda_facturacion] ?? p.moneda_facturacion}
          >
            <MonedaIcon moneda={p.moneda_facturacion} size={11} />
            {p.moneda_facturacion}
          </span>
        </div>
      </header>

      {/* Cifras: gasto con peso relativo, saldo y actividad */}
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="font-numeric text-xl leading-none">
            {formatEUR(p.gastoTotalEur)}
          </span>
          <span className="font-numeric text-xs text-muted-foreground">
            {formatPct(pctGasto)} del gasto
          </span>
        </div>
        <span className="h-1.5 rounded-full bg-secondary/70">
          <span
            className="fill-bar block h-full rounded-full"
            style={{ width: `${anchoBarra}%`, "--bar": color } as React.CSSProperties}
          />
        </span>
        <dl className="mt-1 grid grid-cols-3 gap-2 text-center">
          <Dato label="Facturas" value={formatInt(p.numFacturas)} />
          <Dato
            label="Saldo"
            value={formatEUR(p.saldoPendienteEur)}
            tone={p.saldoPendienteEur > 0 ? "pending" : undefined}
          />
          <Dato
            label="Pedidos"
            value={formatInt(p.numPedidos)}
            note={p.pedidosVivos > 0 ? `${formatInt(p.pedidosVivos)} sin cerrar` : undefined}
          />
        </dl>
        {p.numEnExcepcion > 0 && (
          <Link
            href={`/facturas?proveedor=${p.proveedor_id}&estado=en_excepcion`}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-[color:var(--exception)]/10 px-2 py-1 text-xs text-[color:var(--exception)] transition-colors hover:bg-[color:var(--exception)]/15"
          >
            <AlertTriangle aria-hidden size={13} />
            {formatInt(p.numEnExcepcion)} en excepción ·{" "}
            <span className="font-numeric">{formatEUR(p.importeExcepcionEur)}</span>
          </Link>
        )}
      </div>

      {/* Ficha */}
      <ul className="flex flex-col gap-1 border-t border-border/50 pt-2.5 text-xs">
        {p.direccion_sede && (
          <Fila icon={MapPin}>{p.direccion_sede}</Fila>
        )}
        <Fila icon={CANAL_ICON[p.canal_recepcion ?? ""] ?? Mail}>
          {p.canal_recepcion ? (CANAL_LABEL[p.canal_recepcion] ?? p.canal_recepcion) : "—"}
          {p.email_recepcion_facturas && (
            <span className="text-muted-foreground"> · {p.email_recepcion_facturas}</span>
          )}
        </Fila>
        <Fila icon={CreditCard}>
          {p.forma_pago ?? "—"}
          {p.iban && (
            <span className="font-mono text-[0.7rem] text-muted-foreground">
              {" "}
              · {p.iban}
            </span>
          )}
          {p.iban_fecha_actualizacion && (
            <span className="block text-[0.68rem] text-muted-foreground">
              IBAN actualizado {formatDate(p.iban_fecha_actualizacion)}
            </span>
          )}
        </Fila>
        {p.categorias_habituales && (
          <Fila icon={Tags}>{p.categorias_habituales.split(";").join(" · ")}</Fila>
        )}
      </ul>

      <Link
        href={`/facturas?proveedor=${p.proveedor_id}`}
        className="inline-flex items-center gap-1 self-center text-xs font-medium text-primary underline-offset-2 hover:underline"
      >
        <Building2 aria-hidden size={13} />
        Ver sus facturas
        <ArrowUpRight aria-hidden size={12} />
      </Link>
    </article>
  );
}

function Dato({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "pending";
}) {
  return (
    <div className="flex min-w-0 flex-col items-center rounded-lg bg-background/50 px-1.5 py-1 leading-tight">
      <dt className="eyebrow text-[0.6rem]">{label}</dt>
      <dd
        className={cn(
          "font-numeric truncate text-[0.8rem]",
          tone === "pending" && "text-[color:var(--pending)]"
        )}
      >
        {value}
      </dd>
      {note && <span className="truncate text-[0.62rem] text-muted-foreground">{note}</span>}
    </div>
  );
}

function Fila({
  icon: Icon,
  children,
}: {
  icon: typeof MapPin;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2">
      <Icon aria-hidden size={13} strokeWidth={1.75} className="mt-0.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 break-words leading-snug">{children}</span>
    </li>
  );
}

function Seg({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="eyebrow w-14 shrink-0">{label}</span>
      <div className="flex h-8 items-center gap-0.5 rounded-full border border-input bg-background/60 p-0.5">
        {children}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 text-xs font-medium leading-7 transition-colors [transition-timing-function:var(--ease-out)]",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
