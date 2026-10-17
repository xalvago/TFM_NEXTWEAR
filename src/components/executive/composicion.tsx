"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CANAL_LABEL, MONEDA_LABEL, formatEUR } from "@/lib/finance";
import type { ExecutiveData } from "@/lib/queries/executive";
import { IsoHBars, type IsoItem } from "@/components/stock/iso-charts";
import { CANAL_ICON, DESTINO_ICON, FlagAt, MONEDA_FLAG } from "@/components/dim-icon";
import type { LucideIcon } from "lucide-react";

function flag(f: string): IsoItem["icon"] {
  return function FlagIcon(x, y) {
    return <FlagAt flag={f} x={x} y={y} width={20} />;
  };
}

function glyph(Icon: LucideIcon | undefined): IsoItem["icon"] {
  return function GlyphIcon(x, y) {
    return Icon ? (
      <Icon x={x + 1} y={y - 2} width={18} height={18} strokeWidth={1.9} className="text-primary" aria-hidden />
    ) : null;
  };
}

const TIPO_CENTRO: Record<string, string> = {
  tienda_fisica: "Tiendas físicas",
  ecommerce: "Ecommerce",
  almacen_central: "Almacén central",
};

/**
 * Cuatro cortes del mismo gasto (moneda, país, canal, destino) como barras
 * isométricas; un selector de pestañas elige la dimensión visible. Importes en EUR.
 */
export function ComposicionGasto({ data }: { data: ExecutiveData }) {
  const moneda: IsoItem[] = data.porMoneda
    .filter((m) => m.gastoEur > 0)
    .map((m) => ({
      key: m.moneda,
      label: MONEDA_LABEL[m.moneda] ?? m.moneda,
      value: m.gastoEur,
      icon: flag(MONEDA_FLAG[m.moneda] ?? ""),
    }));
  const pais: IsoItem[] = data.porPais
    .filter((p) => p.gastoEur > 0)
    .map((p) => ({ key: p.pais, label: p.pais, value: p.gastoEur, icon: flag(p.pais) }));

  const canalMap = new Map<string, number>();
  for (const p of data.porProveedor) {
    canalMap.set(p.canal, (canalMap.get(p.canal) ?? 0) + p.gastoEur);
  }
  const canal: IsoItem[] = [...canalMap.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([c, v]) => ({ key: c, label: CANAL_LABEL[c] ?? c, value: v, icon: glyph(CANAL_ICON[c]) }));

  const centroMap = new Map<string, number>();
  for (const c of data.porCentro) {
    centroMap.set(c.tipo, (centroMap.get(c.tipo) ?? 0) + c.gastoEur);
  }
  const centro: IsoItem[] = [...centroMap.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([t, v]) => ({ key: t, label: TIPO_CENTRO[t] ?? t, value: v, icon: glyph(DESTINO_ICON[t]) }));

  const cortes: {
    id: string;
    short: string;
    title: string;
    note?: string;
    items: IsoItem[];
    from: string;
    to: string;
  }[] = [
    { id: "cm", short: "Moneda", title: "Moneda de origen", items: moneda, from: "var(--chart-1)", to: "var(--chart-4)" },
    { id: "cp", short: "País", title: "País del proveedor", items: pais, from: "var(--chart-1)", to: "var(--chart-4)" },
    { id: "cc", short: "Canal", title: "Canal de recepción", items: canal, from: "var(--chart-2)", to: "var(--chart-3)" },
    {
      id: "cd",
      short: "Destino",
      title: "Destino de la compra",
      note: "base sin IVA, por línea",
      items: centro,
      from: "var(--chart-2)",
      to: "var(--chart-3)",
    },
  ];

  const [activo, setActivo] = useState(cortes[0].id);
  const c = cortes.find((x) => x.id === activo) ?? cortes[0];
  const total = c.items.reduce((a, i) => a + i.value, 0);

  return (
    <div className="flex flex-col gap-2">
      <div
        role="tablist"
        aria-label="Dimensión del gasto"
        className="flex flex-wrap items-center gap-0.5 self-start rounded-full border border-input bg-background/60 p-0.5"
      >
        {cortes.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={x.id === activo}
            onClick={() => setActivo(x.id)}
            className={cn(
              "rounded-full px-3 text-xs font-medium leading-8 transition-colors [transition-timing-function:var(--ease-out)]",
              x.id === activo
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {x.short}
          </button>
        ))}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="eyebrow">{c.title}</span>
        <span className="text-[0.68rem] text-muted-foreground">
          {c.note ? `${c.note} · ` : ""}total {formatEUR(total)}
        </span>
      </div>
      {/* Altura fija: cambiar de pestaña no desplaza el resto de la página */}
      <div className="h-[19rem] [&>svg]:!h-full [&>svg]:!max-h-full" key={c.id}>
        {c.items.length > 0 ? (
          <IsoHBars
            items={c.items}
            from={c.from}
            to={c.to}
            titulo={c.title}
            idPrefix={c.id}
            showPct
          />
        ) : (
          <span className="text-xs text-muted-foreground">Sin datos.</span>
        )}
      </div>
    </div>
  );
}
