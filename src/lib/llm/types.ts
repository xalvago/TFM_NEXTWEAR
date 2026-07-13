/**
 * Capa de abstracción del copiloto — agnóstica de proveedor.
 *
 * Cualquier proveedor real (Claude/OpenAI/Gemini/otro) implementa `LLMProvider`.
 * Mientras no haya uno configurado, `MockLLMProvider` (ver mock-provider.ts)
 * satisface la misma interfaz con datos reales de Supabase y una redacción
 * canned, para poder probar toda la UI y el pipeline sin proveedor real.
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AskResult {
  /** SQL de solo lectura que un proveedor real generaría para esta pregunta. */
  sql: string;
  /** Resultado de pasar `sql` por el validador de solo lectura (ver sql-guard.ts). */
  sqlValidation: { ok: boolean; error?: string };
  /** Respuesta en lenguaje natural, redactada a partir del resultado. */
  answer: string;
  /** Filas de resultado (si las hay) para pintar en tabla. */
  rows?: Record<string, unknown>[];
  columns?: string[];
}

export interface LLMProvider {
  readonly name: string;
  readonly isMock: boolean;
  ask(question: string, schemaContext: string): Promise<AskResult>;
}
