-- Bloque 05: tesoreria
create table public.pagos (
  pago_id             text primary key,
  factura_id          text not null references public.facturas(factura_id),
  asiento_id          text references public.asientos_contables(asiento_id),
  fecha_pago          date,
  fecha_vencimiento   date,
  importe_original    numeric,
  moneda              text check (moneda in ('EUR','USD','CNY')),
  importe_eur         numeric,
  es_pago_parcial     boolean default false,
  iban_origen         text,
  iban_destino        text,
  referencia_bancaria text,
  medio_pago          text check (medio_pago in ('transferencia','confirming','domiciliacion')),
  estado_pago         text check (estado_pago in ('programado','retenido','ejecutado','rechazado','anulado')),
  motivo_retencion    text
);
