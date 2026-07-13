import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { validateReadOnlySql } from "@/lib/llm/sql-guard";
import { formatEUR, formatInt } from "@/lib/finance";
import type { AskResult, LLMProvider } from "@/lib/llm/types";

/**
 * Proveedor simulado del copiloto.
 *
 * No llama a ningún LLM: reconoce por palabras clave un pequeño set de
 * preguntas de ejemplo (ver CLAUDE.md) y responde con datos REALES leídos de
 * Supabase, para poder probar toda la UI y el pipeline (validación de SQL,
 * tabla de resultados, redacción) sin proveedor real conectado.
 *
 * El campo `sql` de cada escenario es ILUSTRATIVO: representa el SELECT que
 * un proveedor real generaría para esta pregunta. Pasa por el mismo validador
 * de solo lectura (`validateReadOnlySql`) que correría en producción, pero no
 * se ejecuta tal cual — los datos vienen de consultas tipadas al query builder
 * de Supabase, más simples de auditar en este modo demo.
 */
export class MockLLMProvider implements LLMProvider {
  readonly name = "mock";
  readonly isMock = true;

  async ask(question: string): Promise<AskResult> {
    const q = normalize(question);

    if (/proveedor(es)?\s+chin|china/.test(q)) return this.gastoProveedoresChinos();
    if (/duplicad/.test(q)) return this.facturasDuplicadas();
    if (/sudadera/.test(q) && /madrid/.test(q)) return this.stockSudaderasMadrid();
    if (/saldo/.test(q) && /textil\s*norte/.test(q)) return this.saldoTextilNorte();

    return this.noReconocida(question);
  }

  // --- Escenario 1: gasto en proveedores chinos (trimestre más reciente) -----
  private async gastoProveedoresChinos(): Promise<AskResult> {
    const sql = `
select p.razon_social, sum(f.total_factura_eur) as gasto_eur
from facturas f
join maestro_proveedores p on p.proveedor_id = f.proveedor_id
where p.pais = 'China'
  and f.estado <> 'anulada'
  and f.fecha_expedicion >= '2026-04-01' and f.fecha_expedicion <= '2026-06-30'
group by p.razon_social
order by gasto_eur desc`.trim();

    const supabase = getSupabaseAdmin();
    const { data: proveedores, error: provError } = await supabase
      .from("maestro_proveedores")
      .select("proveedor_id, razon_social")
      .eq("pais", "China");
    if (provError) throw provError;

    const ids = proveedores.map((p) => p.proveedor_id);
    const { data: facturas, error } = await supabase
      .from("facturas")
      .select("proveedor_id, total_factura_eur")
      .in("proveedor_id", ids)
      .neq("estado", "anulada")
      .gte("fecha_expedicion", "2026-04-01")
      .lte("fecha_expedicion", "2026-06-30");
    if (error) throw error;

    const porProveedor = new Map<string, number>();
    for (const f of facturas) {
      porProveedor.set(
        f.proveedor_id!,
        (porProveedor.get(f.proveedor_id!) ?? 0) + (f.total_factura_eur ?? 0)
      );
    }
    const rows = proveedores
      .map((p) => ({
        razon_social: p.razon_social,
        gasto_eur: round2(porProveedor.get(p.proveedor_id) ?? 0),
      }))
      .sort((a, b) => b.gasto_eur - a.gasto_eur);
    const total = round2(rows.reduce((a, r) => a + r.gasto_eur, 0));

    return {
      sql,
      sqlValidation: toValidation(sql),
      answer: `En abril–junio de 2026 se ha gastado ${formatEUR(total)} en proveedores chinos (${rows.map((r) => r.razon_social).join(" y ")}). Importes normalizados a EUR.`,
      rows,
      columns: ["razon_social", "gasto_eur"],
    };
  }

  // --- Escenario 2: facturas en excepción por duplicado -----------------------
  private async facturasDuplicadas(): Promise<AskResult> {
    const sql = `
select f.numero_factura, f.factura_id, c.descripcion
from casos_excepcion c
join facturas f on f.factura_id = c.factura_id
where c.tipo_excepcion = 'duplicado'
order by f.numero_factura`.trim();

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("casos_excepcion")
      .select("caso_id, descripcion, factura_id, facturas(numero_factura)")
      .eq("tipo_excepcion", "duplicado");
    if (error) throw error;

    const rows = data.map((c) => {
      const fac = c.facturas as unknown as { numero_factura: string | null } | null;
      return {
        numero_factura: fac?.numero_factura ?? c.factura_id,
        descripcion: c.descripcion,
      };
    });

    return {
      sql,
      sqlValidation: toValidation(sql),
      answer:
        rows.length > 0
          ? `Hay ${formatInt(rows.length)} factura(s) marcadas como posible duplicado: ${rows.map((r) => r.numero_factura).join(", ")}.`
          : "No hay facturas marcadas como duplicado en este momento.",
      rows,
      columns: ["numero_factura", "descripcion"],
    };
  }

  // --- Escenario 3: stock de sudaderas en tienda Madrid -----------------------
  private async stockSudaderasMadrid(): Promise<AskResult> {
    const sql = `
select p.descripcion, p.sku, s.cantidad_disponible
from stock_actual s
join productos p on p.sku = s.sku
where p.categoria = 'sudadera' and s.centro_coste_id = 'CC-MAD'
order by p.descripcion`.trim();

    const supabase = getSupabaseAdmin();
    const { data: productos, error: prodError } = await supabase
      .from("productos")
      .select("sku, descripcion")
      .eq("categoria", "sudadera");
    if (prodError) throw prodError;

    const skus = productos.map((p) => p.sku);
    const { data: stock, error } = await supabase
      .from("stock_actual")
      .select("sku, cantidad_disponible")
      .eq("centro_coste_id", "CC-MAD")
      .in("sku", skus);
    if (error) throw error;

    const descBySku = new Map(productos.map((p) => [p.sku, p.descripcion]));
    const rows = stock
      .map((s) => ({
        descripcion: descBySku.get(s.sku!) ?? s.sku,
        sku: s.sku,
        cantidad_disponible: s.cantidad_disponible,
      }))
      .sort((a, b) => (a.descripcion ?? "").localeCompare(b.descripcion ?? ""));
    const total = rows.reduce((a, r) => a + (r.cantidad_disponible ?? 0), 0);

    return {
      sql,
      sqlValidation: toValidation(sql),
      answer: `En Tienda Madrid Centro quedan ${formatInt(total)} unidades de sudaderas en total, repartidas en ${formatInt(rows.length)} referencias.`,
      rows,
      columns: ["descripcion", "sku", "cantidad_disponible"],
    };
  }

  // --- Escenario 4: saldo pendiente con Textil Norte --------------------------
  private async saldoTextilNorte(): Promise<AskResult> {
    const sql = `
select razon_social, sum(saldo_pendiente_eur) as saldo_pendiente_eur
from facturas f
join maestro_proveedores p on p.proveedor_id = f.proveedor_id
where p.razon_social = 'Textil Norte S.L.' and f.estado <> 'anulada'
group by razon_social`.trim();

    const supabase = getSupabaseAdmin();
    const { data: proveedor, error: provError } = await supabase
      .from("maestro_proveedores")
      .select("proveedor_id, razon_social")
      .ilike("razon_social", "%Textil Norte%")
      .maybeSingle();
    if (provError) throw provError;
    if (!proveedor) {
      return {
        sql,
        sqlValidation: toValidation(sql),
        answer: "No encuentro un proveedor llamado «Textil Norte» en el maestro.",
      };
    }

    const { data: facturas, error } = await supabase
      .from("facturas")
      .select("saldo_pendiente_eur")
      .eq("proveedor_id", proveedor.proveedor_id)
      .neq("estado", "anulada");
    if (error) throw error;

    const saldo = round2(
      facturas.reduce((a, f) => a + (f.saldo_pendiente_eur ?? 0), 0)
    );

    return {
      sql,
      sqlValidation: toValidation(sql),
      answer: `El saldo pendiente con ${proveedor.razon_social} es de ${formatEUR(saldo)}.`,
      rows: [{ razon_social: proveedor.razon_social, saldo_pendiente_eur: saldo }],
      columns: ["razon_social", "saldo_pendiente_eur"],
    };
  }

  // --- Fallback: pregunta no reconocida por el mock ---------------------------
  private noReconocida(question: string): AskResult {
    const sql = "-- pregunta no reconocida en modo demo --";
    return {
      sql,
      sqlValidation: { ok: false, error: "No se generó SQL: pregunta fuera del set de demo." },
      answer: `Estoy en modo demo (sin LLM conectado) y solo reconozco un pequeño set de preguntas de ejemplo. No tengo mapeada: "${question}". Prueba con una de las sugerencias.`,
    };
  }
}

function toValidation(sql: string) {
  const r = validateReadOnlySql(sql);
  return { ok: r.ok, error: r.error };
}

const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(DIACRITICS, "");
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
