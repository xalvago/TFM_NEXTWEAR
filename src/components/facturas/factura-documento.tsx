"use client";

import { Printer, TriangleAlert } from "lucide-react";
import {
  formatEUR,
  formatMoneda,
  formatDate,
  formatInt,
  TIPO_ID_FISCAL_LABEL,
  REGIMEN_IVA_LABEL,
} from "@/lib/finance";
import type { FacturaDetalle } from "@/lib/queries/facturas";

// Datos del cliente (Nextwear S.L. — retail ficticio, receptor de todas las facturas).
const CLIENTE = {
  nombre: "Nextwear S.L.",
  nif: "B-87654321",
  direccion: "Av. de la Moda 42 · 28010 Madrid · España",
};

type Factura = FacturaDetalle["factura"];
type Linea = FacturaDetalle["lineas"][number];

/**
 * "Factura tipo": representación con formato de documento de factura a partir de
 * los datos reales del registro. Papel siempre claro (colores fijos) para que
 * se lea como documento e imprima correctamente en cualquier tema.
 */
export function FacturaDocumento({
  factura: f,
  lineas,
}: {
  factura: Factura;
  lineas: Linea[];
}) {
  const moneda = f.moneda_original ?? "EUR";
  const esEUR = moneda === "EUR";
  const esNC = !!f.es_nota_credito;
  const ivaPct =
    f.base_imponible_original && f.cuota_iva_original
      ? Math.round((f.cuota_iva_original / f.base_imponible_original) * 100)
      : null;

  // Desglose de IVA por tipo: si todas las líneas comparten tipo, basta con el
  // total único de arriba; si hay tipos distintos (p.ej. 21% y 10% mezclados),
  // el documento necesita una tabla de IVA por tipo para ser correcto.
  const tiposIva = new Set(
    lineas.map((l) => l.tipo_iva_linea).filter((t): t is number => t != null)
  );
  const desgloseIva =
    tiposIva.size > 1
      ? Array.from(tiposIva)
          .sort((a, b) => a - b)
          .map((tipo) => {
            const lineasTipo = lineas.filter((l) => l.tipo_iva_linea === tipo);
            const base = lineasTipo.reduce(
              (acc, l) => acc + (l.total_linea_original ?? 0),
              0
            );
            return { tipo, base, cuota: base * (tipo / 100) };
          })
      : null;

  // Factura de exportación (proveedores asiáticos): campos nullable, vacíos en
  // nacional. regimen_iva gobierna si debe haber IVA — una exportación con
  // cuota de IVA es una contradicción detectable.
  const esExportacion = f.regimen_iva === "exportacion";
  const contradiccionIva = esExportacion && (f.cuota_iva_original ?? 0) > 0;
  const codigosHs = lineas.some((l) => l.codigo_hs);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full gradient-brand px-4 py-2 text-sm font-medium text-white shadow-[0_6px_18px_-6px_rgba(124,58,237,0.55)] transition-transform hover:-translate-y-0.5 active:scale-[0.97]"
        >
          <Printer size={16} strokeWidth={1.9} />
          Imprimir / Guardar PDF
        </button>
      </div>

      <article className="factura-print mx-auto w-full max-w-[820px] rounded-2xl border border-[#e5e2dc] bg-white p-8 text-[#26242b] shadow-card sm:p-10">
        {/* Cabecera del documento */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ece9e3] pb-6">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#9b968d]">
              {esNC ? "Nota de crédito" : "Factura"}
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">
              {f.numero_factura ?? f.factura_id}
            </p>
            {f.serie && (
              <p className="mt-0.5 text-xs text-[#807b72]">Serie {f.serie}</p>
            )}
          </div>
          <div className="flex flex-col items-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="NextWear"
              className="h-12 w-auto object-contain mix-blend-multiply"
            />
            <p className="mt-1 text-xs text-[#807b72]">
              Documento generado · Cuentas por pagar
            </p>
          </div>
        </div>

        {/* Emisor / Cliente */}
        <div className="grid gap-6 py-6 sm:grid-cols-2">
          <Party
            rol="Emisor"
            nombre={f.razon_social_proveedor ?? f.proveedor_id ?? "—"}
            lineas={[
              f.id_fiscal_extranjero
                ? `${TIPO_ID_FISCAL_LABEL[f.tipo_id_fiscal ?? "otro"]} ${f.id_fiscal_extranjero}`
                : f.nif_proveedor
                  ? `NIF ${f.nif_proveedor}`
                  : null,
              f.proveedor_id ? `Ref. ${f.proveedor_id}` : null,
            ]}
          />
          <Party
            rol="Cliente"
            nombre={f.razon_social_cliente ?? CLIENTE.nombre}
            lineas={[
              `NIF ${f.nif_cliente ?? CLIENTE.nif}`,
              f.direccion_cliente ?? CLIENTE.direccion,
            ]}
          />
        </div>

        {/* Metadatos */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl bg-[#faf9f6] px-5 py-4 text-sm sm:grid-cols-4">
          <Meta label="Expedición" value={formatDate(f.fecha_expedicion)} />
          <Meta label="Vencimiento" value={formatDate(f.fecha_vencimiento)} />
          {esExportacion ? (
            <Meta label="Incoterm" value={f.incoterm ?? "—"} />
          ) : (
            <Meta label="Forma de pago" value={f.forma_pago ?? "—"} />
          )}
          <Meta label="Moneda" value={moneda} />
        </div>

        {/* Comercio internacional (solo factura de exportación) */}
        {esExportacion && (
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-[#e5e2dc] px-5 py-4 text-sm sm:grid-cols-4">
            <Meta
              label="Régimen IVA"
              value={f.regimen_iva ? (REGIMEN_IVA_LABEL[f.regimen_iva] ?? f.regimen_iva) : "—"}
            />
            <Meta label="Origen mercancía" value={f.pais_origen_mercancia ?? "—"} />
            <Meta label="SWIFT/BIC" value={f.swift_bic ?? "—"} />
            <Meta label="Banco corresponsal" value={f.banco_corresponsal ?? "—"} />
          </div>
        )}

        {contradiccionIva && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#f0c46b] bg-[#fdf5e2] px-4 py-3 text-xs text-[#8a6a12]">
            <TriangleAlert size={15} strokeWidth={2} className="mt-0.5 shrink-0" />
            <p>
              Régimen de exportación con cuota de IVA distinta de cero — revisar
              antes de contabilizar (posible caso de excepción).
            </p>
          </div>
        )}

        {/* Líneas */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#ece9e3] text-[0.7rem] uppercase tracking-wide text-[#9b968d]">
                <th className="py-2 pr-3 text-left font-semibold">Descripción</th>
                {codigosHs && (
                  <th className="py-2 px-3 text-left font-semibold">Cód. HS</th>
                )}
                <th className="py-2 px-3 text-right font-semibold">Cant.</th>
                <th className="py-2 px-3 text-right font-semibold">
                  P. unit. ({moneda})
                </th>
                <th className="py-2 px-3 text-right font-semibold">Dto.</th>
                <th className="py-2 pl-3 text-right font-semibold">
                  Importe ({moneda})
                </th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l) => (
                <tr key={l.linea_id} className="border-b border-[#f1efea] align-top">
                  <td className="py-2.5 pr-3">
                    <span className="font-medium">{l.descripcion ?? "—"}</span>
                    {l.sku && (
                      <span className="ml-2 font-mono text-xs text-[#9b968d]">
                        {l.sku}
                      </span>
                    )}
                  </td>
                  {codigosHs && (
                    <td className="py-2.5 px-3 font-mono text-xs text-[#807b72]">
                      {l.codigo_hs ?? "—"}
                    </td>
                  )}
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {formatInt(l.cantidad)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {formatMoneda(l.precio_unitario_original, moneda)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#807b72]">
                    {l.descuento_pct ? `${formatInt(l.descuento_pct)} %` : "—"}
                  </td>
                  <td className="py-2.5 pl-3 text-right font-mono tabular-nums">
                    {formatMoneda(l.total_linea_original, moneda)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-[300px]">
            <TotalRow
              label="Base imponible"
              value={formatMoneda(f.base_imponible_original, moneda)}
            />
            {desgloseIva ? (
              desgloseIva.map((d) => (
                <TotalRow
                  key={d.tipo}
                  label={`IVA (${d.tipo} %)`}
                  value={formatMoneda(d.cuota, moneda)}
                />
              ))
            ) : (
              <TotalRow
                label={`IVA${ivaPct != null ? ` (${ivaPct} %)` : ""}`}
                value={formatMoneda(f.cuota_iva_original, moneda)}
              />
            )}
            <TotalRow
              label="Total"
              value={formatMoneda(f.total_factura_original, moneda)}
              emphasis
            />
            {!esEUR && (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-[#faf9f6] px-3 py-2 text-xs text-[#807b72]">
                <span>Equivalente en EUR</span>
                <span className="font-mono tabular-nums text-[#26242b]">
                  {formatEUR(f.total_factura_eur)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Pie */}
        <div className="mt-8 border-t border-[#ece9e3] pt-4 text-xs leading-relaxed text-[#9b968d]">
          {!esEUR && (
            <p>
              Tipo de cambio aplicado {f.tipo_cambio_aplicado ?? "—"} ·{" "}
              {formatDate(f.fecha_tipo_cambio)}. Importes normalizados a EUR para
              la contabilidad.
            </p>
          )}
          {esNC && f.factura_original_id && (
            <p>Nota de crédito que rectifica a la factura {f.factura_original_id}.</p>
          )}
          <p className="mt-1">
            Documento de solo lectura generado por NextWear a partir de los datos
            registrados. No constituye la factura fiscal original.
          </p>
        </div>
      </article>
    </div>
  );
}

function Party({
  rol,
  nombre,
  lineas,
}: {
  rol: string;
  nombre: string;
  lineas: (string | null)[];
}) {
  return (
    <div>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#9b968d]">
        {rol}
      </p>
      <p className="mt-1.5 font-medium">{nombre}</p>
      {lineas.filter(Boolean).map((l, i) => (
        <p key={i} className="text-sm text-[#807b72]">
          {l}
        </p>
      ))}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.7rem] uppercase tracking-wide text-[#9b968d]">
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function TotalRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={
        emphasis
          ? "mt-1 flex items-center justify-between border-t border-[#ded9d0] pt-2 text-base font-semibold"
          : "flex items-center justify-between py-1 text-sm text-[#57545c]"
      }
    >
      <span>{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}
