"use client";

import { useRef, useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const PREGUNTAS_SUGERIDAS = [
  "¿Cuánto hemos gastado en proveedores chinos este trimestre?",
  "¿Qué facturas están en excepción por duplicado?",
  "¿Qué stock de sudaderas queda en la tienda de Madrid?",
  "¿Cuál es el saldo pendiente con Textil Norte?",
];

interface AskResponse {
  provider: string;
  isMock: boolean;
  sql: string;
  sqlValidation: { ok: boolean; error?: string };
  answer: string;
  rows?: Record<string, unknown>[];
  columns?: string[];
  error?: string;
}

interface Turn {
  question: string;
  response?: AskResponse;
  error?: string;
}

export function CopilotPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, loading]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    setInput("");
    setTurns((prev) => [...prev, { question: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/copiloto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data: AskResponse = await res.json();
      setTurns((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          question: q,
          ...(res.ok ? { response: data } : { error: data.error ?? "Error desconocido." }),
        };
        return copy;
      });
    } catch {
      setTurns((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          question: q,
          error: "No se pudo contactar con el copiloto.",
        };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="border-b border-border/70">
          <div className="flex items-center gap-2">
            <SheetTitle>Copiloto NextWear</SheetTitle>
            <span className="rounded-full border border-[color:var(--pending)]/40 bg-[color:var(--pending)]/12 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[color:color-mix(in_oklab,var(--pending),black_18%)]">
              Modo demo · LLM no conectado
            </span>
          </div>
          <SheetDescription>
            Pregunta en lenguaje natural sobre facturas, proveedores y stock.
          </SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2">
          {turns.length === 0 ? (
            <EmptyState onPick={ask} />
          ) : (
            <ul className="flex flex-col gap-4 pb-2">
              {turns.map((t, i) => (
                <li key={i} className="flex flex-col gap-2">
                  <UserBubble text={t.question} />
                  {t.error ? (
                    <ErrorBubble text={t.error} />
                  ) : t.response ? (
                    <AssistantBubble response={t.response} />
                  ) : (
                    <ThinkingBubble />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex items-end gap-2 border-t border-border/70 p-4"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            placeholder="Escribe tu pregunta…"
            rows={1}
            className="min-h-9 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={cn(
              "h-9 shrink-0 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform active:scale-[0.97]",
              (loading || !input.trim()) && "opacity-50"
            )}
          >
            Enviar
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex flex-col gap-4 py-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Este copiloto está en <strong className="text-foreground">modo demo</strong>:
        reconoce un pequeño set de preguntas de ejemplo y responde con datos
        reales de Supabase. El proveedor de IA real se conectará más adelante.
      </p>
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Prueba a preguntar</span>
        {PREGUNTAS_SUGERIDAS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPick(p)}
            className="rounded-xl bg-secondary/60 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50 active:scale-[0.99]"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="ml-8 rounded-lg rounded-br-sm bg-primary/90 px-3 py-2 text-sm text-primary-foreground self-end">
      {text}
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="mr-8 flex items-center gap-1.5 rounded-xl rounded-bl-sm bg-secondary/60 px-3 py-2.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

function ErrorBubble({ text }: { text: string }) {
  return (
    <div className="mr-8 rounded-xl rounded-bl-sm bg-[color:var(--exception)]/10 px-3 py-2 text-sm text-[color:var(--exception)]">
      {text}
    </div>
  );
}

function AssistantBubble({ response }: { response: AskResponse }) {
  const [showSql, setShowSql] = useState(false);
  const hasRows = response.rows && response.rows.length > 0;

  return (
    <div className="mr-8 flex flex-col gap-2 rounded-xl rounded-bl-sm bg-secondary/60 px-3 py-2.5">
      <p className="text-sm leading-relaxed">{response.answer}</p>

      {hasRows && response.columns && (
        <div className="overflow-x-auto rounded-md border border-border/70">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/70 bg-muted/50">
                {response.columns.map((c) => (
                  <th key={c} className="px-2 py-1 text-left font-medium text-muted-foreground">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-numeric">
              {response.rows!.slice(0, 10).map((row, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0">
                  {response.columns!.map((c) => (
                    <td key={c} className="px-2 py-1">
                      {String(row[c] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowSql((v) => !v)}
        className="w-fit text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        {showSql ? "Ocultar SQL" : "Ver SQL generado"}
      </button>

      {showSql && (
        <div className="flex flex-col gap-1.5">
          <pre className="overflow-x-auto rounded-md bg-[color:var(--foreground)]/[0.04] p-2 font-numeric text-[11px] leading-relaxed">
            {response.sql}
          </pre>
          <span
            className={cn(
              "w-fit rounded-full px-2 py-0.5 text-[10px] font-medium",
              response.sqlValidation.ok
                ? "bg-[color:var(--ok)]/12 text-[color:var(--ok)]"
                : "bg-[color:var(--exception)]/12 text-[color:var(--exception)]"
            )}
          >
            {response.sqlValidation.ok
              ? "Validado como solo lectura"
              : response.sqlValidation.error}
          </span>
        </div>
      )}
    </div>
  );
}
