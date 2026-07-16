-- Bloque 11: campos de factura de exportacion (proveedores asiaticos)
-- Todos nullable: una factura nacional los deja vacios. codigo_hs va en lineas
-- (arancelario, por producto); el resto son atributos de cabecera de facturas.
-- regimen_iva es el campo clave: gobierna si debe haber IVA o no; una factura
-- 'exportacion' con cuota de IVA es una contradiccion detectable en conciliacion.
alter table public.facturas
  add column if not exists id_fiscal_extranjero    text,
  add column if not exists tipo_id_fiscal          text,
  add column if not exists swift_bic               text,
  add column if not exists banco_corresponsal      text,
  add column if not exists incoterm                text,
  add column if not exists pais_origen_mercancia   text,
  add column if not exists regimen_iva             text;

alter table public.facturas
  add constraint facturas_tipo_id_fiscal_check
  check (tipo_id_fiscal is null or tipo_id_fiscal in ('nif','uscc','vat','otro'));

alter table public.facturas
  add constraint facturas_regimen_iva_check
  check (regimen_iva is null or regimen_iva in ('nacional','exportacion','intracomunitario'));

alter table public.facturas
  add constraint facturas_incoterm_check
  check (incoterm is null or incoterm in ('EXW','FOB','CIF','CFR','DDP','DAP','FCA'));

alter table public.facturas_lineas
  add column if not exists codigo_hs text;
