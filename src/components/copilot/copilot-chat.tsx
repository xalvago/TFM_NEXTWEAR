"use client";

import { useEffect, useRef, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import {
  ArrowUp,
  Bot,
  Info,
  Lightbulb,
  Paperclip,
  RotateCcw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Chat nativo del copiloto. El «cerebro» sigue siendo FinFlow Bot (Gemini +
 * Supabase) a través del rewrite `/copilot-proxy/chat`; aquí solo se pinta.
 * Vista inicial limpia: solo el campo de escritura. Preguntas de ejemplo e
 * información están detrás de dos botones de la barra superior.
 */

const ENDPOINT = "/copilot-proxy/chat";
const MAX_BYTES = 3 * 1024 * 1024;

const SUGERENCIAS = [
  "¿Cuántas facturas hay en total?",
  "¿Qué facturas superan los 5.000 €?",
  "¿Hay facturas con salto de divisa?",
  "¿Hay notas de crédito?",
  "¿Cuál es el mapa de relaciones?",
  "¿Hay enlaces rotos?",
];

type Trace = { tool: string; args?: Record<string, unknown>; resultCount?: number };
type Msg =
  | { id: number; role: "user"; text: string; file?: string }
  | { id: number; role: "bot"; text: string; trace?: Trace[]; error?: boolean };
type Attachment = { mimeType: string; data: string; name: string };

export function CopilotChat({ onClose, wide, onToggleWide }: {
  onClose: () => void;
  wide: boolean;
  onToggleWide: () => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [history, setHistory] = useState<unknown[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<Attachment | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);
  const nextId = () => ++idRef.current;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  async function send(question: string) {
    const q = question.trim();
    if ((!q && !file) || busy) return;
    const attachment = file;
    setText("");
    setFile(null);
    setMsgs((m) => [...m, { id: nextId(), role: "user", text: q || "(archivo adjunto)", file: attachment?.name }]);
    setBusy(true);
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: q || "Analiza el archivo adjunto.",
          history,
          attachment,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMsgs((m) => [...m, { id: nextId(), role: "bot", text: String(data.error), error: true }]);
      } else {
        setMsgs((m) => [...m, { id: nextId(), role: "bot", text: data.reply ?? "", trace: data.trace }]);
        if (data.history) setHistory(data.history);
      }
    } catch (e) {
      setMsgs((m) => [
        ...m,
        { id: nextId(), role: "bot", text: `Error de conexión: ${(e as Error).message}`, error: true },
      ]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function reset() {
    setMsgs([]);
    setHistory([]);
    setFile(null);
    setText("");
    inputRef.current?.focus();
  }

  function onPickFile(f: File | undefined) {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setMsgs((m) => [
        ...m,
        { id: nextId(), role: "bot", text: "El archivo supera los 3 MB permitidos.", error: true },
      ]);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1] ?? "";
      setFile({ mimeType: f.type, data: base64, name: f.name });
    };
    reader.readAsDataURL(f);
  }

  return (
    <>
      {/* Barra mínima: solo lo imprescindible */}
      <div className="gradient-brand-soft flex h-9 shrink-0 items-center justify-between border-b border-border/50 pl-3 pr-1">
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <Bot aria-hidden size={14} className="text-primary" />
          Copiloto
        </span>
        <div className="flex items-center gap-0.5">
          <Pop
            label="Preguntas de ejemplo"
            icon={<Lightbulb size={14} />}
            width="w-72"
          >
            {(close) => (
              <ul className="flex flex-col gap-0.5">
                {SUGERENCIAS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        void send(s);
                      }}
                      className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Pop>
          <Pop label="Información del copiloto" icon={<Info size={14} />} width="w-72">
            {() => (
              <div className="flex flex-col gap-1.5 text-xs leading-relaxed">
                <p className="font-medium">FinFlow Bot · asistente de contabilidad</p>
                <p className="text-muted-foreground">
                  Razona con Gemini y consulta Supabase en tiempo real: decide solo
                  qué tabla, filtro o relación necesita.
                </p>
                <p className="text-muted-foreground">
                  Puedes adjuntar una imagen o PDF (p. ej. una factura, máx. 3 MB)
                  para que lo analice.
                </p>
                <p className="text-[0.68rem] text-muted-foreground">
                  Fuente: EBIS_TFM_RETAIL_NEXTWEAR
                </p>
              </div>
            )}
          </Pop>
          <IconBtn label="Nueva conversación" onClick={reset} disabled={msgs.length === 0}>
            <RotateCcw size={14} />
          </IconBtn>
          <IconBtn label={wide ? "Reducir" : "Ampliar"} onClick={onToggleWide} className="hidden sm:grid">
            {wide ? <ShrinkIcon /> : <ExpandIcon />}
          </IconBtn>
          <IconBtn label="Cerrar copiloto" onClick={onClose}>
            <X size={14} />
          </IconBtn>
        </div>
      </div>

      {/* Conversación */}
      <div className="relative min-h-0 flex-1 overflow-y-auto bg-background/60 px-3 py-3">
        {msgs.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-xs text-muted-foreground">
            <span>Pregunta sobre facturas, excepciones o proveedores</span>
          </div>
        ) : (
          <ol className="flex flex-col gap-3">
            {msgs.map((m) => (
              <li
                key={m.id}
                className={cn("flex flex-col gap-1", m.role === "user" ? "items-end" : "items-start")}
              >
                {m.role === "bot" && m.trace && m.trace.length > 0 && <TraceList trace={m.trace} />}
                <div
                  className={cn(
                    "max-w-[90%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[0.8rem] leading-relaxed",
                    m.role === "user"
                      ? "gradient-brand rounded-br-md text-white"
                      : m.error
                        ? "rounded-bl-md border border-[color:var(--exception)]/30 bg-[color:var(--exception)]/8 text-[color:var(--exception)]"
                        : "card-wash rounded-bl-md border border-border/60"
                  )}
                >
                  {m.role === "user" && m.file && (
                    <span className="mb-0.5 flex items-center gap-1 text-[0.7rem] opacity-85">
                      <Paperclip size={11} /> {m.file}
                    </span>
                  )}
                  {m.text}
                </div>
              </li>
            ))}
            {busy && (
              <li className="flex gap-1 px-1 py-2" aria-label="Pensando">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-1.5 animate-pulse rounded-full bg-primary/60"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </li>
            )}
          </ol>
        )}
        <div ref={endRef} />
      </div>

      {/* Entrada */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
        className="shrink-0 border-t border-border/50 bg-card/70 p-2.5"
      >
        {file && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1 text-xs text-primary">
            <Paperclip size={12} />
            <span className="min-w-0 flex-1 truncate">{file.name}</span>
            <button type="button" onClick={() => setFile(null)} aria-label="Quitar adjunto">
              <X size={12} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-1.5">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              onPickFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <IconBtn label="Adjuntar imagen o PDF" onClick={() => fileRef.current?.click()} className="size-9 shrink-0">
            <Paperclip size={16} />
          </IconBtn>
          <textarea
            ref={inputRef}
            value={text}
            rows={1}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(text);
              }
            }}
            placeholder="Escribe tu consulta…"
            aria-label="Mensaje para el copiloto"
            className="max-h-28 min-h-9 flex-1 resize-none rounded-2xl border border-input bg-background/80 px-3.5 py-2 text-[0.8rem] leading-snug outline-none transition-colors focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20"
          />
          <button
            type="submit"
            disabled={busy || (!text.trim() && !file)}
            aria-label="Enviar"
            className="gradient-brand grid size-9 shrink-0 place-items-center rounded-full text-white transition active:scale-95 disabled:opacity-40"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </form>
    </>
  );
}

function TraceList({ trace }: { trace: Trace[] }) {
  return (
    <details className="max-w-[90%] text-[0.68rem] text-muted-foreground">
      <summary className="cursor-pointer select-none rounded-full px-2 py-0.5 hover:bg-secondary/70">
        {trace.length} consulta{trace.length > 1 ? "s" : ""} a la base de datos
      </summary>
      <ul className="mt-1 flex flex-col gap-0.5 rounded-lg bg-secondary/50 p-2 font-mono">
        {trace.map((t, i) => (
          <li key={i} className="break-words">
            <span className="text-[color:var(--pending)]">{t.tool}</span>{" "}
            {Object.entries(t.args ?? {})
              .map(([k, v]) => `${k}=${String(v)}`)
              .join(" · ")}
            {t.resultCount !== undefined && ` · ${t.resultCount} resultado(s)`}
          </li>
        ))}
      </ul>
    </details>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground disabled:opacity-35 disabled:hover:bg-transparent",
        className
      )}
    >
      {children}
    </button>
  );
}

/** Botón de la barra que abre un popover con contenido bajo demanda. */
function Pop({
  label,
  icon,
  width,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  width: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={label}
        title={label}
        className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground data-[popup-open]:bg-primary/10 data-[popup-open]:text-primary"
      >
        {icon}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="end" className="isolate z-[70]">
          <Popover.Popup
            className={cn(
              "card-wash max-w-[calc(100vw-2rem)] origin-(--transform-origin) rounded-xl border border-border/70 p-2 shadow-[var(--shadow-lift)] outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0",
              width
            )}
          >
            {children(() => setOpen(false))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

const ExpandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
);
const ShrinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
  </svg>
);
