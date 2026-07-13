import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Cliente Supabase de SOLO backend, con la service role key.
 *
 * - `server-only` hace que el bundler falle si este módulo se importa desde un
 *   componente cliente: la service role key NUNCA llega al navegador.
 * - La service role key salta RLS; por eso solo se usa aquí, en route handlers
 *   y componentes de servidor. El dashboard es de solo lectura: no exponemos
 *   mutaciones aunque la key técnicamente lo permitiría.
 */

// Singleton reutilizado entre peticiones en el runtime del servidor.
let cached: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdmin() {
  if (cached) return cached;

  // Validación en tiempo de ejecución (no de import): así el build no falla
  // aunque falten variables, y el error solo aparece al primer uso real.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_URL. Copia .env.example a .env.local y rellénalo."
    );
  }
  if (!serviceRoleKey) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY. Pega la service role key en .env.local (Supabase → Project Settings → API)."
    );
  }

  cached = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
