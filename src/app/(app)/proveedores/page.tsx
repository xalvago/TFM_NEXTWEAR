import { getProveedores } from "@/lib/queries/proveedores";
import { formatInt, formatEUR } from "@/lib/finance";
import { ProveedoresCards } from "@/components/proveedores/proveedores-cards";
import { MapaProveedores } from "@/components/proveedores/mapa-proveedores";
import { Landmark, MapPin, Scale, Building2, Wallet } from "lucide-react";
import { StatGrid, StatTile } from "@/components/stat-tile";
import { Block } from "@/components/executive/dense";

export const dynamic = "force-dynamic";

export default async function ProveedoresPage() {
  const proveedores = await getProveedores();

  const activos = proveedores.filter((p) => p.activo).length;
  const conIban = proveedores.filter((p) => p.iban).length;
  const gastoTotalEur = proveedores.reduce((a, p) => a + p.gastoTotalEur, 0);
  const saldoTotalEur = proveedores.reduce((a, p) => a + p.saldoPendienteEur, 0);
  const conSaldo = proveedores.filter((p) => p.saldoPendienteEur > 0).length;

  return (
    <div className="flex flex-col gap-4">
      <Block
        tint="logo"
        heading={
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
        }
      >
        <StatGrid label="Indicadores de proveedores">
          <StatTile
            label="Gasto total"
            value={formatEUR(gastoTotalEur)}
            note="acumulado, facturas no anuladas"
            info="Suma de total_factura_eur de todas las facturas del proveedor, excluyendo anuladas y cargas en curso del robot."
            icon={Landmark}
          />
          <StatTile
            label="Saldo pendiente"
            value={formatEUR(saldoTotalEur)}
            note={`${formatInt(conSaldo)} proveedores con deuda`}
            info="Suma de saldo_pendiente_eur por proveedor."
            tone="pending"
            icon={Scale}
          />
          <StatTile
            label="Proveedores activos"
            value={formatInt(activos)}
            note={`de ${formatInt(proveedores.length)} en el maestro`}
            tone="ok"
            icon={Building2}
          />
          <StatTile
            label="Con IBAN registrado"
            value={formatInt(conIban)}
            note="usado en conciliación de pagos"
            tone="credit"
            icon={Wallet}
          />
        </StatGrid>
      </Block>

      <div className="grid items-start gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        {/* Mapa reducido: contexto geográfico, fijo mientras se recorren las tarjetas */}
        <section className="card-wash tint-sky relative overflow-hidden rounded-2xl shadow-card xl:sticky xl:top-24">
          <header className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="gradient-brand-soft grid size-7 place-items-center rounded-lg text-primary">
                <MapPin aria-hidden size={14} strokeWidth={1.75} />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="eyebrow">Mapa</span>
                <span className="text-xs text-muted-foreground">
                  Sede y ruta al almacén central
                </span>
              </div>
            </div>
            <ul className="flex items-center gap-2.5 text-[0.68rem] text-muted-foreground">
              {[
                ["EUR", "var(--chart-1)"],
                ["USD", "var(--chart-3)"],
                ["CNY", "var(--chart-2)"],
              ].map(([m, c]) => (
                <li key={m} className="flex items-center gap-1">
                  <span aria-hidden className="size-2 rounded-full" style={{ background: c }} />
                  {m}
                </li>
              ))}
            </ul>
          </header>
          <MapaProveedores proveedores={proveedores} />
        </section>

        <ProveedoresCards rows={proveedores} />
      </div>
    </div>
  );
}
