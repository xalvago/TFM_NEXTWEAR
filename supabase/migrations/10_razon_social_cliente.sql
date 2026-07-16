-- Bloque 10: razon social del cliente (receptor) en facturas
-- nif_cliente y direccion_cliente ya existian; faltaba el nombre del receptor
-- para que el documento sea legalmente completo. Nextwear S.L. es siempre el
-- mismo receptor, asi que se backfillea con valor fijo.
alter table public.facturas
  add column if not exists razon_social_cliente text;

update public.facturas
  set razon_social_cliente = 'Nextwear S.L.'
  where razon_social_cliente is null;
