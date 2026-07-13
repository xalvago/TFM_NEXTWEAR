import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// Datos en vivo: nunca prerenderizar/cachear esta ruta.
export const dynamic = "force-dynamic";

/**
 * Health-check de la conexión a Supabase.
 * Hace un SELECT mínimo a `facturas` y devuelve un conteo + muestra.
 * Sirve para verificar en FASE 0 que el backend habla con la base.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { count, error: countError } = await supabase
      .from("facturas")
      .select("*", { count: "exact", head: true });
    if (countError) throw countError;

    const { data, error } = await supabase
      .from("facturas")
      .select(
        "factura_id, numero_factura, fecha_expedicion, moneda_original, total_factura_eur, saldo_pendiente_eur, es_nota_credito, estado"
      )
      .order("fecha_expedicion", { ascending: false })
      .limit(5);
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      tabla: "facturas",
      total_filas: count,
      muestra: data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
