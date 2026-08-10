-- casos_excepcion es polimorfica (chk_una_referencia exige exactamente una
-- de factura_id/albaran_id/pedido_id rellena). Para entrega_incompleta el
-- caso referencia el albaran, pero conviene indicar tambien que factura
-- quedo afectada. Se anade una columna aparte (fuera del constraint) que
-- no compite con la referencia polimorfica.
alter table casos_excepcion
  add column if not exists factura_relacionada_id text references facturas(factura_id);

update casos_excepcion ce
set factura_relacionada_id = f.factura_id
from facturas f
where ce.tipo_excepcion = 'entrega_incompleta'
  and ce.albaran_id is not null
  and ce.factura_relacionada_id is null
  and f.albaran_ids_ref ~ ('(^|;)' || ce.albaran_id || '($|;)');
