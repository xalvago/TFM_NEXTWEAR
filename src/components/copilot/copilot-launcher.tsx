"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";

const FINFLOW_BOT_URL = "https://finflow-bot-vercel.vercel.app/";

/** Botón flotante que abre el copiloto FinFlow Bot (app propia en Vercel) en panel embebido. */
export function CopilotLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 flex h-[70vh] w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border/60 shadow-2xl"
          role="dialog"
          aria-label="Copiloto NextWear"
        >
          <div className="flex items-center justify-between border-b border-border/60 bg-background px-4 py-2.5">
            <span className="text-sm font-medium">Copiloto NextWear</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar copiloto"
              className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <iframe
            src={FINFLOW_BOT_URL}
            title="FinFlow Bot"
            className="h-full w-full flex-1 border-0"
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar copiloto" : "Abrir copiloto"}
        className="gradient-brand fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
