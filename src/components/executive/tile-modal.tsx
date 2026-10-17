"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Tarjeta compacta de resumen: concepto + una cifra con contexto. Al pulsarla abre
 * el detalle completo en una ventana por encima (el detalle llega ya renderizado
 * desde el servidor como `children`). Así la página arranca recogida y cada dato
 * se consulta bajo demanda. Cada tarjeta lleva su propio degradado.
 */
export function TileModal({
  icon,
  eyebrow,
  title,
  value,
  caption,
  gradient,
  wide = false,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  value: string;
  caption: string;
  /** Par de colores del degradado propio de la tarjeta. */
  gradient: [string, string];
  /** Ventana más ancha para detalles con tablas. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [c1, c2] = gradient;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="hover-lift group relative flex w-full min-w-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl px-4 py-3.5 text-center shadow-card outline-none transition-transform focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.985]"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklab, ${c1} 20%, var(--card)) 0%, color-mix(in oklab, ${c2} 8%, var(--card)) 100%)`,
          border: `1px solid color-mix(in oklab, ${c1} 24%, transparent)`,
        }}
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: `linear-gradient(90deg, ${c1}, ${c2})` }}
        />
        <ChevronRight
          aria-hidden
          size={15}
          className="absolute right-2.5 top-3 text-muted-foreground/60 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
        />
        <span
          className="icon-anim grid size-9 shrink-0 place-items-center rounded-lg text-white shadow-sm"
          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
        >
          {icon}
        </span>

        <span className="flex min-w-0 max-w-full flex-col items-center leading-tight">
          <span className="eyebrow truncate text-[0.58rem]">{eyebrow}</span>
          <span className="max-w-full truncate font-display text-[0.9rem] leading-snug">{title}</span>
          <span
            className="font-numeric mt-0.5 text-[0.95rem] font-semibold"
            style={{ color: `color-mix(in oklab, ${c1}, var(--foreground) 20%)` }}
          >
            {value}
          </span>
          <span className="max-w-full text-balance text-[0.68rem] text-muted-foreground">
            {caption}
          </span>
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "max-h-[85vh] overflow-y-auto p-5 sm:p-6",
            wide ? "sm:max-w-5xl" : "sm:max-w-3xl",
            // El bloque de detalle ya trae su cabecera: se quita su "tarjeta" para no duplicar marco.
            "[&_.card-wash]:![background:none] [&_.card-wash]:!p-0 [&_.card-wash]:!shadow-none [&_.card-wash]:!rounded-none [&_.card-wash]:!overflow-visible [&_.card-wash]:before:hidden",
            "[&_header]:pr-8"
          )}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {children}
        </DialogContent>
      </Dialog>
    </>
  );
}
