import "server-only";
import { MockLLMProvider } from "@/lib/llm/mock-provider";
import type { LLMProvider } from "@/lib/llm/types";

/**
 * Punto único de resolución del proveedor del copiloto.
 *
 * Mientras no exista `LLM_PROVIDER` en el entorno, se usa el mock. El
 * proveedor real (Claude/OpenAI/Gemini/otro) se decide más adelante.
 */
export function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER;

  if (!provider) {
    return new MockLLMProvider();
  }

  // TODO: conectar proveedor LLM real aquí (ej. instanciar un ClaudeProvider,
  // OpenAIProvider, etc. que implemente LLMProvider, según LLM_PROVIDER).
  return new MockLLMProvider();
}
