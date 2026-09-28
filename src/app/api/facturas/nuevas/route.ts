import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { BASELINE_FACTURA_SEQ } from "@/lib/constants";

// Datos en vivo: nunca prerenderizar/cachear esta ruta.
export const dynamic = "force-dynamic";

/**
 * Excepción documentada a la regla "dashboard de solo lectura" (ver CLAUDE.md):
 * permite localizar y borrar, con confirmación explícita, facturas nuevas
 * insertadas por el robot UiPath por encima del dataset base (340 facturas,
 * factura_id FAC-00001..FAC-00340, sin huecos). Solo esta ruta puede escribir
 * en la base; el resto del dashboard sigue siendo de solo lectura.
 */

interface FacturaNueva {
  factura_id: string;
  numero_factura: string | null;
  razon_social_proveedor: string | null;
  fecha_expedicion: string | null;
  total_factura_eur: number | null;
  estado: string | null;
  albaranes_vinculados: number;
  logs_vinculados: number;
}

// factura_id tiene forma "FAC-00340": secuencial, sin huecos, en orden de
// inserción. Es más fiable que numero_factura (que tiene años distintos,
// notas de crédito "NC-F-..." y huecos) para saber qué es "nuevo": cualquier
// factura_id con secuencia por encima del dataset base.
const FACTURA_ID_RE = /^FAC-(\d+)$/;

function parseFacturaSeq(facturaId: string): number | null {
  const m = facturaId.match(FACTURA_ID_RE);
  return m ? Number(m[1]) : null;
}

async function buscarFacturasNuevas(): Promise<FacturaNueva[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("facturas")
    .select(
      "factura_id, numero_factura, razon_social_proveedor, fecha_expedicion, total_factura_eur, estado"
    );
  if (error) throw error;

  const nuevas = (data ?? [])
    .filter((f) => {
      const seq = parseFacturaSeq(f.factura_id);
      // factura_id que no encaje en el patrón FAC-##### (ej. generado con otro
      // esquema) se trata como "nuevo" directamente: no puede ser del dataset
      // base, que se sabe que sigue ese patrón al completo.
      return seq === null || seq > BASELINE_FACTURA_SEQ;
    })
    .sort((a, b) => a.factura_id.localeCompare(b.factura_id));

  if (nuevas.length === 0) return [];

  // Vínculos en facturas_albaranes de esas facturas nuevas: se muestran en el
  // diálogo de confirmación para que quede claro qué más se va a borrar en
  // cascada, no solo la cabecera y las líneas.
  const { data: vinculos, error: errVinculos } = await supabase
    .from("facturas_albaranes")
    .select("factura_id")
    .in(
      "factura_id",
      nuevas.map((f) => f.factura_id)
    );
  if (errVinculos) throw errVinculos;

  const conteoVinculos = new Map<string, number>();
  for (const v of vinculos ?? []) {
    conteoVinculos.set(v.factura_id, (conteoVinculos.get(v.factura_id) ?? 0) + 1);
  }

  // log_agentes: logs del robot (agente = "captura") asociados a esas
  // facturas. Tienen FK a facturas, así que también hay que contarlos (y
  // borrarlos) antes de poder borrar la cabecera.
  const { data: logs, error: errLogs } = await supabase
    .from("log_agentes")
    .select("factura_id")
    .in(
      "factura_id",
      nuevas.map((f) => f.factura_id)
    );
  if (errLogs) throw errLogs;

  const conteoLogs = new Map<string, number>();
  for (const l of logs ?? []) {
    if (!l.factura_id) continue;
    conteoLogs.set(l.factura_id, (conteoLogs.get(l.factura_id) ?? 0) + 1);
  }

  return nuevas.map((f) => ({
    ...f,
    albaranes_vinculados: conteoVinculos.get(f.factura_id) ?? 0,
    logs_vinculados: conteoLogs.get(f.factura_id) ?? 0,
  }));
}

// GET /api/facturas/nuevas
// Devuelve las facturas insertadas por encima del dataset base de 340, para
// que el diálogo de confirmación muestre exactamente qué se va a borrar.
export async function GET() {
  try {
    const facturas = await buscarFacturasNuevas();
    return NextResponse.json({ ok: true, facturas });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// DELETE /api/facturas/nuevas
// Body: { factura_ids: string[] }
// Vuelve a resolver "qué es nuevo" en servidor y solo borra la intersección
// con factura_ids recibido: así el cliente no puede colar IDs fuera del
// conjunto que el usuario vio y confirmó en el diálogo.
export async function DELETE(request: Request) {
  let body: { factura_ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Cuerpo JSON inválido." },
      { status: 400 }
    );
  }

  const idsConfirmados = body.factura_ids;
  if (!Array.isArray(idsConfirmados) || idsConfirmados.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Falta 'factura_ids'." },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    // Re-verificar contra el servidor: solo se borra lo que sigue existiendo
    // y sigue siendo "nuevo" (por encima del dataset base de 340).
    const vigentes = await buscarFacturasNuevas();
    const idsVigentes = new Set(vigentes.map((f) => f.factura_id));
    const idsABorrar = idsConfirmados.filter((id) => idsVigentes.has(id));

    if (idsABorrar.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ninguna de las facturas confirmadas sigue siendo válida (puede que ya se hayan borrado). Vuelve a cargar la lista.",
        },
        { status: 409 }
      );
    }

    // Cascada manual (mismo orden que las FK): líneas y vínculos primero,
    // luego log_agentes (tiene FK a facturas Y a casos_excepcion, así que
    // debe borrarse ANTES que ambas o las dos siguientes fallan por FK),
    // casos de excepción vinculados, y la cabecera al final.
    const { error: errLineas } = await supabase
      .from("facturas_lineas")
      .delete()
      .in("factura_id", idsABorrar);
    if (errLineas) throw errLineas;

    const { error: errAlbaranes, count: albaranesBorrados } = await supabase
      .from("facturas_albaranes")
      .delete({ count: "exact" })
      .in("factura_id", idsABorrar);
    if (errAlbaranes) throw errAlbaranes;

    // Casos de excepción de estas facturas: hacen falta sus caso_id para
    // poder borrar también los log_agentes que solo referencian caso_id
    // (sin factura_id propio, p.ej. logs del Conciliador sobre el caso).
    const { data: casosVinculados, error: errCasosSelect } = await supabase
      .from("casos_excepcion")
      .select("caso_id")
      .in("factura_id", idsABorrar);
    if (errCasosSelect) throw errCasosSelect;
    const casoIds = (casosVinculados ?? []).map((c) => c.caso_id);

    const { error: errLogs, count: logsBorrados } = await supabase
      .from("log_agentes")
      .delete({ count: "exact" })
      .or(
        [
          `factura_id.in.(${idsABorrar.join(",")})`,
          casoIds.length > 0 ? `caso_id.in.(${casoIds.join(",")})` : null,
        ]
          .filter(Boolean)
          .join(",")
      );
    if (errLogs) throw errLogs;

    const { error: errCasos } = await supabase
      .from("casos_excepcion")
      .delete()
      .in("factura_id", idsABorrar);
    if (errCasos) throw errCasos;

    const { error: errFacturas, count } = await supabase
      .from("facturas")
      .delete({ count: "exact" })
      .in("factura_id", idsABorrar);
    if (errFacturas) throw errFacturas;

    return NextResponse.json({
      ok: true,
      borradas: count ?? idsABorrar.length,
      albaranesVinculosBorrados: albaranesBorrados ?? 0,
      logsAgentesBorrados: logsBorrados ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
