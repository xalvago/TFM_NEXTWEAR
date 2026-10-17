"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  formatEUR,
  formatEURCompact,
  formatPct,
  CANAL_LABEL,
  MONEDA_LABEL,
  ANIOS_DATASET,
} from "@/lib/finance";
import type {
  PuntoInteranual,
  GastoPorCentro,
  GastoPorProveedor,
  GastoPorMoneda,
  GastoPorPais,
} from "@/lib/queries/executive";
import type { CadenaProveedor, CompraCategoria } from "@/lib/queries/compras";

// Animación de construcción: los gráficos crecen fluidamente hasta su valor.
const ANIM = {
  isAnimationActive: true,
  animationDuration: 1100,
  animationEasing: "ease-out",
} as const;

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };
// Etiquetas de categoría (nombres largos de proveedor/centro): fuente algo menor
// para reducir el recorte por el ancho fijo del eje.
const AXIS_TICK_CAT = { fill: "var(--muted-foreground)", fontSize: 11 };
const GRID = "var(--border)";

// Colores por año: el año más reciente en verde ledger (énfasis).
const ANIO_COLOR: Record<string, string> = {
  "2024": "var(--chart-5)",
  "2025": "var(--chart-4)",
  "2026": "var(--chart-1)",
};

// Color por tipo de centro de coste.
const TIPO_COLOR: Record<string, string> = {
  tienda_fisica: "var(--chart-1)",
  ecommerce: "var(--chart-3)",
  almacen_central: "var(--chart-4)",
};

const MONEDA_COLOR: Record<string, string> = {
  EUR: "var(--chart-1)",
  USD: "var(--chart-3)",
  CNY: "var(--chart-2)",
};

function TooltipBox({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; color?: string }[];
}) {
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="flex flex-col gap-0.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2 text-sm">
            {r.color && (
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ background: r.color }}
              />
            )}
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-numeric ml-auto pl-3">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// --- Gasto mensual interanual -------------------------------------------------
export function InteranualChart({ data }: { data: PuntoInteranual[] }) {
  // Mes de la fecha de corte sin cerrar: se marca con asterisco en el eje.
  const parcial = data.find((d) => d.parcial);
  const chartData = data.map((d) => ({
    ...d,
    mesEje: d.parcial ? `${d.mes}*` : d.mes,
  }));
  return (
    <div className="w-full animate-in fade-in-0 duration-700">
      <div className="h-[210px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="grad-area-2026" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ANIO_COLOR["2026"]} stopOpacity={0.28} />
              <stop offset="100%" stopColor={ANIO_COLOR["2026"]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
          <Area
            type="monotone"
            dataKey="2026"
            stroke="none"
            fill="url(#grad-area-2026)"
            connectNulls={false}
            tooltipType="none"
            legendType="none"
            {...ANIM}
          />
          <XAxis
            dataKey="mesEje"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: GRID }}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(v) => formatEURCompact(Number(v))}
          />
          <Tooltip
            cursor={{ stroke: GRID }}
            content={({ active, payload, label }: any) => {
              if (!active || !payload?.length) return null;
              return (
                <TooltipBox
                  title={String(label)}
                  rows={payload.map((p: any) => ({
                    label: String(p.dataKey),
                    value: p.value == null ? "sin datos" : formatEUR(Number(p.value)),
                    color: p.color,
                  }))}
                />
              );
            }}
          />
          {ANIOS_DATASET.map((y) => (
            <Line
              key={y}
              type="monotone"
              dataKey={String(y)}
              stroke={ANIO_COLOR[String(y)]}
              strokeWidth={String(y) === "2026" ? 2.5 : 1.75}
              dot={{ r: 3, strokeWidth: 0, fill: ANIO_COLOR[String(y)] }}
              activeDot={{ r: 5 }}
              connectNulls={false}
              {...ANIM}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      </div>
      <ChartLegend
        items={ANIOS_DATASET.map((y) => ({
          label: String(y),
          color: ANIO_COLOR[String(y)],
        }))}
      />
      {parcial && (
        <p className="mt-2 text-xs text-muted-foreground">
          * {parcial.mes}: mes sin cerrar (la carga llega solo hasta la fecha de
          corte); no comparar con meses completos.
        </p>
      )}
    </div>
  );
}

// --- Gasto por centro de coste ------------------------------------------------
export function CentroChart({ data }: { data: GastoPorCentro[] }) {
  const height = Math.max(180, data.length * 42 + 24);
  return (
    <div className="w-full animate-in fade-in-0 duration-700">
      <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
          barCategoryGap={10}
        >
          <CartesianGrid stroke={GRID} strokeDasharray="2 4" horizontal={false} />
          <XAxis
            type="number"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatEURCompact(Number(v))}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            tick={AXIS_TICK_CAT}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            width={150}
          />
          <Tooltip
            cursor={{ fill: "var(--accent)", opacity: 0.4 }}
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as GastoPorCentro;
              return (
                <TooltipBox
                  title={d.nombre}
                  rows={[
                    { label: tipoLabel(d.tipo), value: formatEUR(d.gastoEur) },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="gastoEur" radius={[0, 4, 4, 0]} {...ANIM}>
            {data.map((d) => (
              <Cell
                key={d.centroId}
                fill={TIPO_COLOR[d.tipo] ?? "var(--chart-5)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
      <ChartLegend
        items={[
          { label: "Tienda física", color: TIPO_COLOR.tienda_fisica },
          { label: "Ecommerce", color: TIPO_COLOR.ecommerce },
          { label: "Almacén central", color: TIPO_COLOR.almacen_central },
        ]}
      />
    </div>
  );
}

// --- Gasto por proveedor (ranking completo, color por moneda de facturación) ---
export function ProveedorChart({ data }: { data: GastoPorProveedor[] }) {
  const height = Math.max(220, data.length * 36 + 24);
  const monedas = [...new Set(data.map((d) => d.monedaFacturacion))];
  return (
    <div className="w-full animate-in fade-in-0 duration-700">
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
            barCategoryGap={8}
          >
            <CartesianGrid stroke={GRID} strokeDasharray="2 4" horizontal={false} />
            <XAxis
              type="number"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatEURCompact(Number(v))}
            />
            <YAxis
              type="category"
              dataKey="razonSocial"
              tick={AXIS_TICK_CAT}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              width={170}
            />
            <Tooltip
              cursor={{ fill: "var(--accent)", opacity: 0.4 }}
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as GastoPorProveedor;
                return (
                  <TooltipBox
                    title={d.razonSocial}
                    rows={[
                      { label: "Gasto", value: formatEUR(d.gastoEur) },
                      { label: "% del gasto", value: formatPct(d.pctSobreTotal) },
                      { label: "Facturas", value: String(d.numFacturas) },
                      { label: "País", value: d.pais },
                      { label: "Factura en", value: d.monedaFacturacion },
                      { label: "Canal", value: CANAL_LABEL[d.canal] ?? d.canal },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="gastoEur" radius={[0, 4, 4, 0]} {...ANIM}>
              {data.map((d) => (
                <Cell
                  key={d.proveedorId}
                  fill={MONEDA_COLOR[d.monedaFacturacion] ?? "var(--chart-5)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        items={monedas.map((m) => ({
          label: `Factura en ${m}`,
          color: MONEDA_COLOR[m] ?? "var(--chart-5)",
        }))}
      />
    </div>
  );
}

// --- Gasto por país del proveedor ---------------------------------------------
export function PaisChart({ data }: { data: GastoPorPais[] }) {
  const total = data.reduce((a, d) => a + d.gastoEur, 0);
  const height = Math.max(150, data.length * 40 + 24);
  return (
    <div className="w-full animate-in fade-in-0 duration-700">
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
            barCategoryGap={10}
          >
            <CartesianGrid stroke={GRID} strokeDasharray="2 4" horizontal={false} />
            <XAxis
              type="number"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatEURCompact(Number(v))}
            />
            <YAxis
              type="category"
              dataKey="pais"
              tick={AXIS_TICK_CAT}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              width={110}
            />
            <Tooltip
              cursor={{ fill: "var(--accent)", opacity: 0.4 }}
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as GastoPorPais;
                return (
                  <TooltipBox
                    title={d.pais}
                    rows={[
                      { label: "Gasto", value: formatEUR(d.gastoEur) },
                      {
                        label: "% del gasto",
                        value: formatPct(total ? d.gastoEur / total : 0),
                      },
                      { label: "Proveedores", value: String(d.numProveedores) },
                    ]}
                  />
                );
              }}
            />
            <Bar
              dataKey="gastoEur"
              radius={[0, 4, 4, 0]}
              fill="var(--chart-1)"
              {...ANIM}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// --- Gasto por moneda de origen (donut) ---------------------------------------
export function MonedaChart({ data }: { data: GastoPorMoneda[] }) {
  const total = data.reduce((a, d) => a + d.gastoEur, 0);
  return (
    <div className="flex flex-col items-center gap-4 animate-in fade-in-0 duration-700 sm:flex-row sm:justify-center">
      <div className="relative h-[200px] w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="gastoEur"
              nameKey="moneda"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
              {...ANIM}
            >
              {data.map((d) => (
                <Cell
                  key={d.moneda}
                  fill={MONEDA_COLOR[d.moneda] ?? "var(--chart-5)"}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as GastoPorMoneda;
                return (
                  <TooltipBox
                    title={`${d.moneda} · ${MONEDA_LABEL[d.moneda] ?? ""}`}
                    rows={[{ label: "Gasto EUR", value: formatEUR(d.gastoEur) }]}
                  />
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="eyebrow">Total</span>
          <span className="font-numeric text-base">
            {formatEURCompact(total)}
          </span>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {data.map((d) => (
          <li key={d.moneda} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ background: MONEDA_COLOR[d.moneda] ?? "var(--chart-5)" }}
            />
            <span className="w-10 font-medium">{d.moneda}</span>
            <span className="font-numeric ml-auto pl-4">
              {formatEUR(d.gastoEur)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- helpers ------------------------------------------------------------------
function ChartLegend({
  items,
}: {
  items: { label: string; color: string }[];
}) {
  return (
    <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/50 pt-3">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ background: it.color }}
          />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

function tipoLabel(tipo: string): string {
  return (
    {
      tienda_fisica: "Tienda física",
      ecommerce: "Ecommerce",
      almacen_central: "Almacén central",
    }[tipo] ?? tipo
  );
}

// --- Pedido → recibido → facturado por proveedor (unidades) -------------------
const CADENA_COLOR = {
  pedidas: "var(--chart-5)",
  recibidas: "var(--chart-4)",
  facturadas: "var(--chart-1)",
} as const;

export function CadenaChart({ data }: { data: CadenaProveedor[] }) {
  const height = Math.max(240, data.length * 56 + 24);
  const intFmt = (v: number) => new Intl.NumberFormat("es-ES").format(v);
  return (
    <div className="w-full animate-in fade-in-0 duration-700">
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
            barCategoryGap={10}
            barGap={2}
          >
            <CartesianGrid stroke={GRID} strokeDasharray="2 4" horizontal={false} />
            <XAxis
              type="number"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => intFmt(Number(v))}
            />
            <YAxis
              type="category"
              dataKey="razonSocial"
              tick={AXIS_TICK_CAT}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              width={170}
            />
            <Tooltip
              cursor={{ fill: "var(--accent)", opacity: 0.4 }}
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as CadenaProveedor;
                return (
                  <TooltipBox
                    title={d.razonSocial}
                    rows={[
                      { label: "Pedidas", value: `${intFmt(d.pedidas)} uds`, color: CADENA_COLOR.pedidas },
                      { label: "Recibidas", value: `${intFmt(d.recibidas)} uds`, color: CADENA_COLOR.recibidas },
                      { label: "Facturadas", value: `${intFmt(d.facturadas)} uds`, color: CADENA_COLOR.facturadas },
                      { label: "Tasa de recepción", value: formatPct(d.tasaRecepcion) },
                      { label: "Pedidos sin cerrar", value: String(d.pedidosVivos) },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="pedidas" fill={CADENA_COLOR.pedidas} radius={[0, 3, 3, 0]} {...ANIM} />
            <Bar dataKey="recibidas" fill={CADENA_COLOR.recibidas} radius={[0, 3, 3, 0]} {...ANIM} />
            <Bar dataKey="facturadas" fill={CADENA_COLOR.facturadas} radius={[0, 3, 3, 0]} {...ANIM} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        items={[
          { label: "Pedidas", color: CADENA_COLOR.pedidas },
          { label: "Recibidas (albarán)", color: CADENA_COLOR.recibidas },
          { label: "Facturadas", color: CADENA_COLOR.facturadas },
        ]}
      />
    </div>
  );
}

// --- Gasto facturado por categoría de producto --------------------------------
export function CategoriaChart({ data }: { data: CompraCategoria[] }) {
  const height = Math.max(150, data.length * 40 + 24);
  return (
    <div className="w-full animate-in fade-in-0 duration-700" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
          barCategoryGap={10}
        >
          <CartesianGrid stroke={GRID} strokeDasharray="2 4" horizontal={false} />
          <XAxis
            type="number"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatEURCompact(Number(v))}
          />
          <YAxis
            type="category"
            dataKey="categoria"
            tick={AXIS_TICK_CAT}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            width={120}
          />
          <Tooltip
            cursor={{ fill: "var(--accent)", opacity: 0.4 }}
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as CompraCategoria;
              return (
                <TooltipBox
                  title={d.categoria}
                  rows={[
                    { label: "Gasto facturado (sin IVA)", value: formatEUR(d.gastoFacturadoEur) },
                    {
                      label: "Unidades pedidas",
                      value: new Intl.NumberFormat("es-ES").format(d.unidadesPedidas),
                    },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="gastoFacturadoEur" radius={[0, 4, 4, 0]} fill="var(--chart-2)" {...ANIM} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
