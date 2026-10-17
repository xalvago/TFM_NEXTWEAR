import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StateTone } from "@/lib/finance";
import { IsoKpi } from "@/components/stock/iso-kpi";

export interface StatTileProps {
  label: string;
  value: string;
  note?: string;
  info?: string; // «cómo se calcula»
  tone?: StateTone;
  icon: LucideIcon;
}

/** KPI de Facturas y Proveedores: mismo diseño que la Vista ejecutiva (IsoKpi compacto). */
export function StatTile(props: StatTileProps) {
  return <IsoKpi compact {...props} />;
}

/** Rejilla de tarjetas: tantas columnas como tarjetas caben, sin huecos fijos. */
export function StatGrid({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        "grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,13.5rem),1fr))]",
        className
      )}
    >
      {children}
    </section>
  );
}
