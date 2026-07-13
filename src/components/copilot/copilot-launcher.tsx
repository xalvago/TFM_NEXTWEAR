"use client";

import { useState } from "react";
import { CopilotPanel } from "@/components/copilot/copilot-panel";

/** Botón flotante que abre el copiloto, disponible en todas las pestañas. */
export function CopilotLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir copiloto NextWear"
        className="gradient-brand group fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-white shadow-[0_8px_24px_-6px_rgba(124,58,237,0.55)] transition-transform duration-150 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-6px_rgba(124,58,237,0.6)] active:scale-[0.96]"
      >
        <span aria-hidden className="icon-anim font-display text-base leading-none">
          ✦
        </span>
        Copiloto
      </button>
      <CopilotPanel open={open} onOpenChange={setOpen} />
    </>
  );
}
