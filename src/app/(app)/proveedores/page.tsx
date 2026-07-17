import { getProveedores } from "@/lib/queries/proveedores";
import { formatInt, formatEUR } from "@/lib/finance";
import { ProveedoresTable } from "@/components/proveedores/proveedores-table";
import { Landmark } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProveedoresPage() {
  const proveedores = await getProveedores();

  const activos = proveedores.filter((p) => p.activo).length;
  const conIban = proveedores.filter((p) => p.iban).length;
  const gastoTotalEur = proveedores.reduce((a, p) => a + p.gastoTotalEur, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Proveedores</span>
        <h1 className="font-display text-3xl tracking-tight sm:text-[2.1rem] leading-[1.1] pb-0.5">
          Ficha de <span className="gradient-text">proveedores</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {formatInt(proveedores.length)} proveedores · {activos} activos ·{" "}
          {conIban} con IBAN registrado
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card-wash hover-lift group relative flex flex-col gap-3 overflow-hidden rounded-2xl p-5 shadow-card">
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{ background: "var(--gradient-brand)" }}
          />
          <span className="gradient-brand-soft grid size-9 place-items-center rounded-xl text-primary">
            <Landmark aria-hidden size={17} strokeWidth={1.75} className="icon-anim" />
          </span>
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Gasto total EUR</span>
            <span className="font-numeric text-2xl leading-none">
              {formatEUR(gastoTotalEur)}
            </span>
            <span className="text-xs text-muted-foreground">
              acumulado, todas las facturas no anuladas
            </span>
          </div>
        </div>
        <div className="card-wash hover-lift group relative flex flex-col gap-3 overflow-hidden rounded-2xl p-5 shadow-card">
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{
              background:
                "linear-gradient(90deg, var(--ok), color-mix(in oklab, var(--ok), var(--chart-2) 55%))",
            }}
          />
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Proveedores activos</span>
            <span className="font-numeric text-2xl leading-none">
              {formatInt(activos)}
            </span>
            <span className="text-xs text-muted-foreground">
              de {formatInt(proveedores.length)} en el maestro
            </span>
          </div>
        </div>
        <div className="card-wash hover-lift group relative flex flex-col gap-3 overflow-hidden rounded-2xl p-5 shadow-card">
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{
              background:
                "linear-gradient(90deg, var(--credit), color-mix(in oklab, var(--credit), var(--chart-1) 55%))",
            }}
          />
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Con IBAN registrado</span>
            <span className="font-numeric text-2xl leading-none">
              {formatInt(conIban)}
            </span>
            <span className="text-xs text-muted-foreground">
              usado en factura y conciliación de pagos
            </span>
          </div>
        </div>
      </section>

      <div className="card-wash relative overflow-hidden rounded-2xl shadow-card">
        <ProveedoresTable rows={proveedores} />
      </div>
    </div>
  );
}
