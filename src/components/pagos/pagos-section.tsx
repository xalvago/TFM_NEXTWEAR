"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { PAGO_ESTADO_LABEL } from "@/lib/finance";
import type { PagoListItem } from "@/lib/queries/pagos";
import { PagosTable } from "./pagos-table";
import { cn } from "@/lib/utils";

const ALL = "__all__";

export function PagosSection({
  pagos,
  activeEstado,
}: {
  pagos: PagoListItem[];
  activeEstado?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setEstado(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) params.delete("pagoEstado");
    else params.set("pagoEstado", value);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  const estado = activeEstado ?? ALL;

  return (
    <div data-pending={pending ? "" : undefined}>
      <div className="mb-4 flex flex-wrap items-center gap-0.5 rounded-full border border-input bg-background/60 p-0.5">
        <SegChip active={estado === ALL} onClick={() => setEstado(ALL)}>
          Todos
        </SegChip>
        {Object.entries(PAGO_ESTADO_LABEL).map(([value, label]) => (
          <SegChip
            key={value}
            active={estado === value}
            onClick={() => setEstado(value)}
          >
            {label}
          </SegChip>
        ))}
      </div>
      <PagosTable rows={pagos} />
    </div>
  );
}

function SegChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-2.5 text-xs font-medium leading-8 transition-colors [transition-timing-function:var(--ease-out)]",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
