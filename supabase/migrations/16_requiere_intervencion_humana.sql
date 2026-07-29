-- Distingue casos_excepcion que requieren revision humana de los que el
-- sistema ya trata solo (nota de credito cruzada automaticamente, entrega
-- parcial/incompleta gestionada por reposicion). El KPI de la vista
-- ejecutiva (facturas.estado = 'en_excepcion', 51/340 = 15%) no cambia; esto
-- solo aclara el listado de casos_excepcion, que antes mezclaba ambos tipos
-- bajo un unico total (70).

alter table casos_excepcion
  add column requiere_intervencion_humana boolean not null default true;

update casos_excepcion
  set requiere_intervencion_humana = false
  where tipo_excepcion in ('nota_credito', 'entrega_parcial', 'entrega_incompleta');

comment on column casos_excepcion.requiere_intervencion_humana is
  'true = requiere revision humana (duplicado, importe_distinto, sin_pedido, salto_divisa, iban_no_coincide). false = documento normal que el sistema ya trata solo (nota_credito, entrega_parcial/entrega_incompleta).';
