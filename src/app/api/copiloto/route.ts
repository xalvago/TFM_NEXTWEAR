import { NextResponse } from "next/server";
import { getLLMProvider } from "@/lib/llm";
import { buildSchemaContext } from "@/lib/llm/schema-context";

export const dynamic = "force-dynamic";

const MAX_QUESTION_LENGTH = 500;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const question =
    typeof (body as { question?: unknown })?.question === "string"
      ? ((body as { question: string }).question).trim()
      : "";

  if (!question) {
    return NextResponse.json({ error: "Falta la pregunta." }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `Pregunta demasiado larga (máx. ${MAX_QUESTION_LENGTH} caracteres).` },
      { status: 400 }
    );
  }

  const provider = getLLMProvider();

  try {
    const result = await provider.ask(question, buildSchemaContext());
    return NextResponse.json({
      provider: provider.name,
      isMock: provider.isMock,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Error del copiloto: ${message}` },
      { status: 500 }
    );
  }
}
