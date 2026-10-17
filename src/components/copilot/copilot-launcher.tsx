"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopilotChat } from "@/components/copilot/copilot-chat";

/**
 * Botón flotante que abre el copiloto. El panel es un chat nativo (la lógica LLM
 * sigue en FinFlow Bot, vía rewrite en next.config.ts): vista inicial limpia, con
 * ejemplos e información tras botones de la barra, y modo ampliado.
 */
export function CopilotLauncher() {
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(false);

  // Esc cierra el panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Copiloto NextWear"
          className={cn(
            "card-wash fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border/60 shadow-[var(--shadow-lift)] animate-in fade-in-0 slide-in-from-bottom-2 duration-200",
            // Móvil: casi pantalla completa. Escritorio: panel alto anclado al botón.
            "inset-x-2 bottom-20 top-16 sm:inset-x-auto sm:right-6 sm:top-auto",
            wide
              ? "sm:bottom-24 sm:h-[calc(100vh-7.5rem)] sm:w-[min(920px,calc(100vw-3rem))]"
              : "sm:bottom-24 sm:h-[min(720px,calc(100vh-8rem))] sm:w-[420px]"
          )}
        >
          <CopilotChat
            onClose={() => setOpen(false)}
            wide={wide}
            onToggleWide={() => setWide((v) => !v)}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar copiloto" : "Abrir copiloto"}
        aria-expanded={open}
        className="gradient-brand fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-105 active:scale-95"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>
    </>
  );
}
