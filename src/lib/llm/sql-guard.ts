/**
 * Allow-list de solo lectura para el SQL que generaría el copiloto.
 *
 * Reglas (CLAUDE.md §Copiloto): debe empezar por SELECT, rechazar
 * insert/update/delete/drop/alter (y cualquier DDL/DML de escritura),
 * prohibir sentencias múltiples, y forzar un LIMIT si no lo trae.
 *
 * Se usa hoy solo para validar el SQL ilustrativo del MockLLMProvider
 * (que no se ejecuta contra la base). Cuando se conecte un proveedor real,
 * este mismo validador debe correr ANTES de ejecutar cualquier SQL generado.
 */

// Palabras clave de escritura/DDL: se comprueban con límite de palabra.
const FORBIDDEN_KEYWORDS = [
  "insert",
  "update",
  "delete",
  "drop",
  "alter",
  "truncate",
  "grant",
  "revoke",
  "create",
  "replace",
  "execute",
  "call",
  "copy",
  "merge",
  "vacuum",
];

// Marcadores de comentario: se comprueban como substring literal (no son
// palabras y contienen caracteres especiales de regex).
const FORBIDDEN_SUBSTRINGS = ["--", "/*"];

const DEFAULT_LIMIT = 200;

export interface SqlValidationResult {
  ok: boolean;
  error?: string;
  /** SQL normalizado (con LIMIT añadido si faltaba), solo si ok=true. */
  sql?: string;
}

export function validateReadOnlySql(rawSql: string): SqlValidationResult {
  const sql = rawSql.trim();

  if (!sql) {
    return { ok: false, error: "SQL vacío." };
  }

  // Solo una sentencia: sin punto y coma salvo uno final opcional.
  const withoutTrailingSemicolon = sql.replace(/;\s*$/, "");
  if (withoutTrailingSemicolon.includes(";")) {
    return { ok: false, error: "Solo se permite una sentencia por consulta." };
  }

  const lower = withoutTrailingSemicolon.toLowerCase();

  if (!lower.startsWith("select") && !lower.startsWith("with")) {
    return { ok: false, error: "Solo se permiten consultas SELECT." };
  }

  for (const symbol of FORBIDDEN_SUBSTRINGS) {
    if (lower.includes(symbol)) {
      return {
        ok: false,
        error: `Secuencia no permitida en modo solo lectura: "${symbol}".`,
      };
    }
  }

  for (const word of FORBIDDEN_KEYWORDS) {
    const pattern = new RegExp(`(^|[^a-z_])${word}([^a-z_]|$)`, "i");
    if (pattern.test(lower)) {
      return {
        ok: false,
        error: `Palabra no permitida en modo solo lectura: "${word}".`,
      };
    }
  }

  const hasLimit = /\blimit\s+\d+/i.test(lower);
  const normalized = hasLimit
    ? withoutTrailingSemicolon
    : `${withoutTrailingSemicolon} LIMIT ${DEFAULT_LIMIT}`;

  return { ok: true, sql: normalized };
}
