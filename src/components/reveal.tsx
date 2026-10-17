"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type RevealFrom = "up" | "left" | "right" | "zoom";

/**
 * Aparición al hacer scroll: el elemento entra desde el fondo (`zoom`, `up`) o desde
 * un lateral (`left`, `right`) y se "forma" (opacidad, desenfoque y escala) hasta su
 * sitio. Se dispara una sola vez, cuando entra en el viewport. Los estilos están en
 * globals.css (`[data-reveal]`) y se anulan con prefers-reduced-motion.
 */
export function Reveal({
  children,
  from = "up",
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  from?: RevealFrom;
  /** Retraso en ms, para escalonar elementos hermanos. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={from}
      data-shown={shown ? "" : undefined}
      style={{ transitionDelay: shown ? `${delay}ms` : undefined }}
      className={cn(className)}
    >
      {children}
    </div>
  );
}
