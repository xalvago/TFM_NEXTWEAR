"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MONEDA_SIMBOLO, formatDate } from "@/lib/finance";
import type { TipoCambioActual } from "@/lib/queries/executive";

/**
 * Conversor de divisas del dataset (USD/CNY → EUR y viceversa) usando la
 * tasa BCE en vivo (con la última de `tipos_cambio` como respaldo).
 * `tasa` son unidades de moneda por 1 EUR (p. ej. ~7.7 CNY/EUR):
 * eur = importe_original / tasa.
 */
export function ConversorDivisas({ tasas }: { tasas: TipoCambioActual[] }) {
  const [monedaId, setMonedaId] = useState(tasas[0]?.moneda ?? "USD");
  const [direccion, setDireccion] = useState<"aEur" | "deEur">("aEur");
  const [amount, setAmount] = useState(1000);

  const activa = tasas.find((t) => t.moneda === monedaId) ?? tasas[0];
  const resultado = activa
    ? direccion === "aEur"
      ? amount / activa.tasa
      : amount * activa.tasa
    : 0;

  if (!activa) return null;

  return (
    <div className="flex flex-col gap-4 animate-in fade-in-0 duration-700">
      <div className="flex items-center gap-0.5 rounded-full border border-input bg-background/60 p-0.5 self-start">
        {tasas.map((t) => (
          <button
            key={t.moneda}
            type="button"
            onClick={() => setMonedaId(t.moneda)}
            aria-pressed={monedaId === t.moneda}
            className={cn(
              "rounded-full px-3 text-xs font-medium leading-8 transition-colors [transition-timing-function:var(--ease-out)]",
              monedaId === t.moneda
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.moneda}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <label className="flex-1">
          <span className="eyebrow mb-1 block">
            {direccion === "aEur" ? monedaId : "EUR"}
          </span>
          <input
            type="number"
            min={0}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
            className="font-numeric w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-lg tabular-nums outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
          />
        </label>

        <button
          type="button"
          onClick={() => setDireccion((d) => (d === "aEur" ? "deEur" : "aEur"))}
          aria-label="Invertir dirección de conversión"
          className="icon-anim group mt-5 grid size-9 shrink-0 place-items-center rounded-full gradient-brand-soft text-primary transition-transform hover:-rotate-180 active:scale-90"
        >
          <ArrowLeftRight size={16} strokeWidth={1.9} className="icon-anim" />
        </button>

        <div className="flex-1">
          <span className="eyebrow mb-1 block">
            {direccion === "aEur" ? "EUR" : monedaId}
          </span>
          <AnimatedAmount
            value={resultado}
            simbolo={
              direccion === "aEur" ? "€" : MONEDA_SIMBOLO[monedaId] ?? monedaId
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          {activa.fuente === "bce_en_vivo" && (
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-[color:var(--ok)]"
            />
          )}
          1 EUR = {activa.tasa.toFixed(4)} {monedaId} ·{" "}
          {activa.fuente === "bce_en_vivo"
            ? `BCE en vivo, ${formatDate(activa.fecha)}`
            : `tasa del dataset, ${formatDate(activa.fecha)} (sin conexión al BCE)`}
        </p>
        <p>
          Las facturas se valoran a su tasa de fecha (última registrada:{" "}
          {activa.tasaDataset.toFixed(4)}, {formatDate(activa.fechaDataset)}).
        </p>
      </div>
    </div>
  );
}

/** Número que hace count-up suave hacia el nuevo valor (respeta reduced-motion). */
function AnimatedAmount({
  value,
  simbolo,
}: {
  value: number;
  simbolo: string;
}) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const from = prevRef.current;
    const to = value;
    const duration = reduceMotion ? 0 : 400;
    const start = performance.now();

    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    function tick(now: number) {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value]);

  return (
    <span className="font-numeric flex items-baseline gap-1 rounded-xl border border-transparent px-3 py-2 text-lg tabular-nums">
      <span aria-hidden className="text-muted-foreground">
        {simbolo}
      </span>
      {display.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </span>
  );
}
