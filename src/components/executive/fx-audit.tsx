import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatEUR, formatInt } from "@/lib/finance";
import type { AuditoriaFx } from "@/lib/queries/executive";

const tasa = (n: number) =>
  new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(n);

/**
 * Auditoría del tipo de cambio: tasa aplicada en facturas (`tipo_cambio_aplicado`)
 * frente al rango de la tabla de referencia (`tipos_cambio`). Unidades de divisa por 1 EUR.
 */
export function FxAudit({ data }: { data: AuditoriaFx[] }) {
  if (data.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        Sin facturas en divisa para los filtros activos.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4 animate-in fade-in-0 duration-700">
      {data.map((a) => {
        const alerta = a.fueraDeRango > 0;
        return (
          <div
            key={a.moneda}
            className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/50 p-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{a.moneda} → EUR</span>
              <span className="font-numeric text-xs text-muted-foreground">
                {formatInt(a.numFacturas)} facturas · {formatEUR(a.gastoEur)}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <dt className="text-muted-foreground">Aplicada (mín · media · máx)</dt>
              <dd className="font-numeric text-right">
                {tasa(a.aplicadaMin)} · {tasa(a.aplicadaMedia)} · {tasa(a.aplicadaMax)}
              </dd>
              <dt className="text-muted-foreground">Referencia (mín · máx)</dt>
              <dd className="font-numeric text-right">
                {tasa(a.refMin)} · {tasa(a.refMax)}
              </dd>
            </dl>
            {alerta ? (
              <p className="flex items-start gap-1.5 text-xs text-[color:var(--exception)]">
                <AlertTriangle aria-hidden size={13} className="mt-px shrink-0" />
                <span>
                  Posible error de conversión: {a.fueraDeRango} factura
                  {a.fueraDeRango > 1 ? "s" : ""} con tasa fuera del rango de
                  referencia (
                  {a.facturasFueraDeRango.map((id, i) => (
                    <span key={id}>
                      {i > 0 && ", "}
                      <Link
                        href={`/facturas/${id}`}
                        className="underline underline-offset-2"
                      >
                        {id}
                      </Link>
                    </span>
                  ))}
                  ). Verificar antes de dar por buenas las cifras de {a.moneda}.
                </span>
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-[color:var(--ok)]">
                <CheckCircle2 aria-hidden size={13} />
                Todas las tasas aplicadas están dentro del rango de referencia.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
