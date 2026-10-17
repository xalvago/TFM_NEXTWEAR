"use client";

import { Popover } from "@base-ui/react/popover";
import { Info } from "lucide-react";

/**
 * «ⓘ» con la fórmula / origen del dato. Se abre al hacer CLIC (y con teclado),
 * se queda abierto hasta pulsar fuera o Esc, y funciona igual en táctil.
 */
export function InfoTip({
  text,
  title = "Cómo se calcula",
}: {
  text: string;
  title?: string;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={`${title}: ver detalle`}
        className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground/80 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[popup-open]:bg-primary/10 data-[popup-open]:text-primary"
      >
        <Info aria-hidden size={13} strokeWidth={1.85} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} className="isolate z-[60]">
          <Popover.Popup className="card-wash w-72 max-w-[calc(100vw-2rem)] origin-(--transform-origin) rounded-xl border border-border/70 p-3 shadow-[var(--shadow-lift)] outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <Popover.Title className="eyebrow mb-1">{title}</Popover.Title>
            <Popover.Description className="text-xs leading-relaxed text-foreground/85">
              {text}
            </Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
