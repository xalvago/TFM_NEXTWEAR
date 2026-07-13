"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { ANIOS_DATASET } from "@/lib/finance";

const OPCIONES = ["todos", ...ANIOS_DATASET.map(String)] as const;
const LABEL: Record<string, string> = {
  todos: "Todos",
  "2024": "2024",
  "2025": "2025",
  "2026": "2026",
};

export function PeriodSelector({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "todos") params.delete("anio");
    else params.set("anio", value);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  return (
    <div
      role="group"
      aria-label="Periodo"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full bg-card p-1 shadow-card",
        pending && "opacity-70"
      )}
    >
      {OPCIONES.map((opt) => {
        const active = current === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => select(opt)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 [transition-timing-function:var(--ease-out)]",
              "active:scale-[0.97] [transition-property:transform,background-color,color]",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
            )}
          >
            {LABEL[opt]}
          </button>
        );
      })}
    </div>
  );
}
