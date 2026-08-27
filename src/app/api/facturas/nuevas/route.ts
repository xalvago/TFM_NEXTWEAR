import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// Datos en vivo: nunca prerenderizar/cachear esta ruta.
export const dynamic = "force-dynamic";

/**
 * Excepción documentada a la regla "dashboard de solo lectura" (ver CLAUDE.md):
 * permite localizar y borrar, con confirmación explícita, facturas nuevas
 * insertadas por el robot UiPath por encima de una referencia (numero_factura)
 * dada. Solo esta ruta puede escribir en la base; el resto del dashboard sigue
 * siendo de solo lectura.
 */

interface FacturaNueva {
  factura_id: string;
  numero_factura: string | null;
  razon_social_proveedor: string | null;
  fecha_expedicion: string | null;
  total_factura_eur: number | null;
  estado: string | null;
}

// numero_factura tiene forma "F-2026-00342" o, para notas de crédito,
// "NC-F-2026-00346". Comparar como texto ("NC-..." > "F-...") daría falsos
// positivos: toda nota de crédito "ganaría" a cualquier factura normal por
// empezar por N. Se parsea año+secuencia y solo se compara dentro del mismo
// año y mismo tipo (factura normal vs. nota de crédito) que la referencia.
const NUMERO_FACTURA_RE = /^(NC-)?F-(\d{4})-(\d+)$/;

function parseNumeroFactura(numero: string) {
  const m = numero.match(NUMERO_FACTURA_RE);
  if (!m) return null;
  return { esNotaCredito: Boolean(m[1]), anio: Number(m[2]), seq: Number(m[3]) };
}

async function buscarFacturasNuevas(
  referencia: string
): Promise<FacturaNueva[]> {
  const ref = parseNumeroFactura(referencia);
  if (!ref) {
    throw new Error(
      `Formato de número de factura no reconocido: "${referencia}". Se espera algo como "F-2026-00342".`
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("facturas")
    .select(
      "factura_id, numero_factura, razon_social_proveedor, fecha_expedicion, total_factura_eur, estado"
    );
  if (error) throw error;

  return (data ?? [])
    .filter((f) => {
      if (!f.numero_factura) return false;
      const candidato = parseNumeroFactura(f.numero_factura);
      if (!candidato) return false;
      return (
        candidato.esNotaCredito === ref.esNotaCredito &&
        candidato.anio === ref.anio &&
        candidato.seq > ref.seq
      );
    })
    .sort((a, b) => (a.numero_factura ?? "").localeCompare(b.numero_factura ?? ""));
}

// GET /api/facturas/nuevas?referencia=F-2026-00342
// Devuelve la lista de facturas con numero_factura > referencia, para que el
// diálogo de confirmación muestre exactamente qué se va a borrar.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const referencia = searchParams.get("referencia")?.trim();

  if (!referencia) {
    return NextResponse.json(
      { ok: false, error: "Falta el parámetro 'referencia'." },
      { status: 400 }
    );
  }

  try {
    const facturas = await buscarFacturasNuevas(referencia);
    return NextResponse.json({ ok: true, facturas });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// DELETE /api/facturas/nuevas
// Body: { referencia: string, factura_ids: string[] }
// Vuelve a resolver "referencia" en servidor y solo borra la intersección con
// factura_ids recibido: así el cliente no puede colar IDs fuera del conjunto
// que el usuario vio y confirmó en el diálogo.
export async function DELETE(request: Request) {
  let body: { referencia?: string; factura_ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Cuerpo JSON inválido." },
      { status: 400 }
    );
  }

  const referencia = body.referencia?.trim();
  const idsConfirmados = body.factura_ids;

  if (!referencia || !Array.isArray(idsConfirmados) || idsConfirmados.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Faltan 'referencia' o 'factura_ids'." },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    // Re-verificar contra el servidor: solo se borra lo que sigue existiendo
    // y sigue siendo "nuevo" respecto a la referencia dada.
    const vigentes = await buscarFacturasNuevas(referencia);
    const idsVigentes = new Set(vigentes.map((f) => f.factura_id));
    const idsABorrar = idsConfirmados.filter((id) => idsVigentes.has(id));

    if (idsABorrar.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ninguna de las facturas confirmadas sigue siendo válida (puede que ya se hayan borrado o hayan dejado de cumplir la referencia). Vuelve a cargar la lista.",
        },
        { status: 409 }
      );
    }

    // Cascada manual (mismo orden que las FK): líneas y vínculos primero,
    // casos de excepción vinculados, y la cabecera al final.
    const { error: errLineas } = await supabase
      .from("facturas_lineas")
      .delete()
      .in("factura_id", idsABorrar);
    if (errLineas) throw errLineas;

    const { error: errAlbaranes } = await supabase
      .from("facturas_albaranes")
      .delete()
      .in("factura_id", idsABorrar);
    if (errAlbaranes) throw errAlbaranes;

    const { error: errCasos } = await supabase
      .from("casos_excepcion")
      .delete()
      .in("factura_id", idsABorrar);
    if (errCasos) throw errCasos;

    const { error: errCasosRel } = await supabase
      .from("casos_excepcion")
      .delete()
      .in("factura_relacionada_id", idsABorrar);
    if (errCasosRel) throw errCasosRel;

    const { error: errFacturas, count } = await supabase
      .from("facturas")
      .delete({ count: "exact" })
      .in("factura_id", idsABorrar);
    if (errFacturas) throw errFacturas;

    return NextResponse.json({ ok: true, borradas: count ?? idsABorrar.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
