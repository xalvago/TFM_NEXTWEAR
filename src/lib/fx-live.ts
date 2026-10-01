import "server-only";

/**
 * Tipo de cambio en vivo (referencia BCE) vía Frankfurter, sin API key.
 * Devuelve unidades de `moneda` por 1 EUR (misma convención que
 * `tipos_cambio.tasa_cambio`). Cache de 10 min; si falla, devuelve null y el
 * llamador usa la última tasa de la BD.
 *
 * Solo alimenta el conversor informativo. Los importes EUR de facturas
 * siguen valorados con la tasa auditada de su fecha (`tipo_cambio_aplicado`).
 */
export interface TasaViva {
  tasa: number;
  fecha: string; // fecha de publicación BCE (YYYY-MM-DD)
}

const FRANKFURTER = "https://api.frankfurter.dev/v1/latest";

export async function getTasasVivas(
  monedas: string[]
): Promise<Record<string, TasaViva>> {
  if (monedas.length === 0) return {};
  try {
    const res = await fetch(
      `${FRANKFURTER}?base=EUR&symbols=${monedas.join(",")}`,
      { next: { revalidate: 600 }, signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return {};
    const json = (await res.json()) as {
      date?: string;
      rates?: Record<string, number>;
    };
    const out: Record<string, TasaViva> = {};
    for (const m of monedas) {
      const tasa = json.rates?.[m];
      if (typeof tasa === "number" && tasa > 0 && json.date) {
        out[m] = { tasa, fecha: json.date };
      }
    }
    return out;
  } catch {
    return {};
  }
}
