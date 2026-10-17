import { formatEUR, formatInt, formatPct } from "@/lib/finance";
import type { ExecutiveData } from "@/lib/queries/executive";
import type { ComprasData } from "@/lib/queries/compras";

/**
 * Insights deterministas (3 conclusiones + 2 riesgos + 2 acciones) calculados en
 * servidor a partir de los datos YA filtrados. Sin texto fijo ni LLM: cada insight
 * lleva la cifra que lo sustenta y un atajo a la vista correspondiente. Si los datos
 * no bastan, el hueco devuelve `null` y la interfaz muestra «datos insuficientes».
 */

/** Umbrales configurables de las reglas. */
export const UMBRALES = {
  minProveedoresConcentracion: 3, // top-N para medir concentración
  dependenciaProveedor: 0.35, // un proveedor > 35 % del gasto = dependencia
  retrasoEntregas: 0.3, // > 30 % de albaranes tarde = riesgo operativo
  minAlbaranes: 10, // muestra mínima para hablar de retraso
} as const;

export interface Insight {
  id: string;
  titulo: string;
  cifra: string; // la cifra que lo sustenta
  texto: string;
  href?: string;
  responsable?: string; // solo acciones
}

export interface Insights {
  conclusiones: (Insight | null)[]; // longitud 3
  riesgos: (Insight | null)[]; // longitud 2
  acciones: (Insight | null)[]; // longitud 2
}

export function buildInsights(data: ExecutiveData, compras: ComprasData): Insights {
  const { kpis, porProveedor, porPais, interanual, auditoriaFx, control } = data;

  // --- Conclusión 1: concentración del gasto -------------------------------------
  let c1: Insight | null = null;
  const n = Math.min(UMBRALES.minProveedoresConcentracion, porProveedor.length);
  if (porProveedor.length >= UMBRALES.minProveedoresConcentracion && kpis.gastoNetoEur > 0) {
    const top = porProveedor.slice(0, n);
    const pct = top.reduce((a, p) => a + p.pctSobreTotal, 0);
    c1 = {
      id: "concentracion",
      titulo: "Gasto concentrado en pocos proveedores",
      cifra: formatPct(pct),
      texto: `${n} de ${porProveedor.length} proveedores (${top.map((p) => p.razonSocial).join(", ")}) concentran el ${formatPct(pct)} del gasto.`,
      href: `/facturas?proveedor=${top[0].proveedorId}`,
    };
  }

  // --- Conclusión 2: evolución interanual en meses comparables --------------------
  let c2: Insight | null = null;
  const comparables = interanual.filter(
    (p) => !p.parcial && p["2025"] != null && p["2026"] != null
  );
  if (comparables.length > 0) {
    const a25 = comparables.reduce((a, p) => a + Number(p["2025"]), 0);
    const a26 = comparables.reduce((a, p) => a + Number(p["2026"]), 0);
    if (a25 > 0) {
      const delta = (a26 - a25) / a25;
      const meses = comparables.map((p) => p.mes).join(", ");
      c2 = {
        id: "interanual",
        titulo: delta >= 0 ? "El gasto crece frente a 2025" : "El gasto baja frente a 2025",
        cifra: `${delta >= 0 ? "+" : ""}${formatPct(delta)}`,
        texto: `En los meses completos comparables (${meses}) el gasto pasa de ${formatEUR(a25)} en 2025 a ${formatEUR(a26)} en 2026.`,
        href: "/?anio=2026",
      };
    }
  }

  // --- Conclusión 3: peso de la divisa y país dominante ---------------------------
  let c3: Insight | null = null;
  if (kpis.gastoExtranjeroEur > 0 || kpis.pctExtranjero > 0) {
    const fuera = porPais.filter((p) => p.pais !== "España");
    const topFuera = fuera[0];
    c3 = {
      id: "divisa",
      titulo: "Peso del gasto en divisa",
      cifra: formatPct(kpis.pctExtranjero),
      texto: `${formatEUR(kpis.gastoExtranjeroEur)} se facturan en USD o CNY${
        topFuera ? `; el país extranjero con más gasto es ${topFuera.pais} (${formatEUR(topFuera.gastoEur)})` : ""
      }.`,
      href: "/?moneda=USD",
    };
  }

  // --- Riesgo 1: importe en excepción ---------------------------------------------
  let r1: Insight | null = null;
  if (kpis.numEnExcepcion > 0) {
    const humano =
      control.totalCasos > 0 ? control.casosRequierenHumano / control.totalCasos : 0;
    r1 = {
      id: "excepcion",
      titulo: "Importe retenido en excepciones",
      cifra: formatEUR(kpis.importeExcepcionEur),
      texto: `${formatInt(kpis.numEnExcepcion)} facturas (${formatPct(kpis.pctExcepcion)} del total) están en excepción; el ${formatPct(humano)} de sus casos requiere intervención humana y ${formatInt(control.casosAbiertos)} siguen sin resolver.`,
      href: "/facturas?estado=en_excepcion",
    };
  }

  // --- Riesgo 2: el más grave entre FX, entregas tarde y dependencia --------------
  const fxMala = auditoriaFx.find((a) => a.fueraDeRango > 0);
  const pctTarde =
    compras.plazo.numAlbaranes >= UMBRALES.minAlbaranes
      ? compras.plazo.conRetraso / compras.plazo.numAlbaranes
      : 0;
  const topProv = porProveedor[0];
  let r2: Insight | null = null;
  if (fxMala) {
    r2 = {
      id: "fx",
      titulo: "Posible error de tipo de cambio",
      cifra: `${fxMala.fueraDeRango} factura${fxMala.fueraDeRango > 1 ? "s" : ""}`,
      texto: `Hay facturas en ${fxMala.moneda} con tasa aplicada fuera del rango de referencia (${fxMala.facturasFueraDeRango.join(", ")}). Es una sospecha: conviene verificarla antes de dar por buenas las cifras en ${fxMala.moneda}.`,
      href: `/facturas/${fxMala.facturasFueraDeRango[0]}`,
    };
  } else if (pctTarde >= UMBRALES.retrasoEntregas) {
    r2 = {
      id: "retraso",
      titulo: "Entregas fuera de plazo",
      cifra: formatPct(pctTarde),
      texto: `${formatInt(compras.plazo.conRetraso)} de ${formatInt(compras.plazo.numAlbaranes)} albaranes llegan después de la fecha prevista (de media ${compras.plazo.diasRetrasoMedio.toLocaleString("es-ES", { maximumFractionDigits: 1 })} días).`,
    };
  } else if (topProv && topProv.pctSobreTotal >= UMBRALES.dependenciaProveedor) {
    r2 = {
      id: "dependencia",
      titulo: "Dependencia de un proveedor",
      cifra: formatPct(topProv.pctSobreTotal),
      texto: `${topProv.razonSocial} concentra el ${formatPct(topProv.pctSobreTotal)} del gasto.`,
      href: `/facturas?proveedor=${topProv.proveedorId}`,
    };
  }

  // --- Acción 1: resolver las excepciones de mayor importe ------------------------
  let a1: Insight | null = null;
  const top = control.topExcepciones;
  if (top.length > 0) {
    const suma = top.slice(0, 3).reduce((a, e) => a + e.importeEur, 0);
    a1 = {
      id: "resolver",
      titulo: "Resolver las excepciones de mayor importe",
      cifra: formatEUR(suma),
      texto: `Empezar por ${top
        .slice(0, 3)
        .map((e) => e.numeroFactura ?? e.facturaId)
        .join(", ")}: son las tres mayores y suman ${formatEUR(suma)}.`,
      href: `/facturas/${top[0].facturaId}`,
      responsable: "Cuentas por Pagar",
    };
  }

  // --- Acción 2: depende del riesgo 2 ----------------------------------------------
  let a2: Insight | null = null;
  if (r2?.id === "fx" && fxMala) {
    a2 = {
      id: "verificar-fx",
      titulo: "Verificar el tipo de cambio aplicado",
      cifra: fxMala.facturasFueraDeRango[0],
      texto: `Contrastar la tasa de ${fxMala.facturasFueraDeRango.join(", ")} con la tabla de referencia y corregir la factura si la conversión es errónea.`,
      href: `/facturas/${fxMala.facturasFueraDeRango[0]}`,
      responsable: "Contabilidad / Tesorería",
    };
  } else {
    const deficit = compras.porProveedor
      .map((p) => ({ ...p, falta: p.pedidas - p.recibidas }))
      .filter((p) => p.falta > 0)
      .sort((a, b) => b.falta - a.falta)[0];
    if (deficit) {
      a2 = {
        id: "reclamar",
        titulo: "Reclamar las entregas pendientes",
        cifra: `${formatInt(deficit.falta)} uds`,
        texto: `${deficit.razonSocial} es el proveedor con más unidades pedidas sin recibir (${formatInt(deficit.falta)}, recepción ${formatPct(deficit.tasaRecepcion)}).`,
        href: `/facturas?proveedor=${deficit.proveedorId}`,
        responsable: "Compras",
      };
    }
  }

  return {
    conclusiones: [c1, c2, c3],
    riesgos: [r1, r2],
    acciones: [a1, a2],
  };
}
