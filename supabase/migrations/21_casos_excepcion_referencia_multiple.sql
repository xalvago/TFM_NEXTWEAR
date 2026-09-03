-- casos_excepcion: relaja la polimorfia a "al menos una referencia" (antes
-- exigia exactamente una), traslada factura_relacionada_id -> factura_id
-- para entrega_incompleta, elimina entrega_parcial (redundante con
-- entrega_incompleta) y anade origen_deteccion para el Conciliador.

alter table casos_excepcion drop constraint if exists chk_una_referencia;

alter table casos_excepcion
  add constraint chk_al_menos_una_referencia check (
    (case when factura_id is not null then 1 else 0 end
    + case when albaran_id is not null then 1 else 0 end
    + case when pedido_id is not null then 1 else 0 end) >= 1
  );

update casos_excepcion
set factura_id = factura_relacionada_id
where tipo_excepcion = 'entrega_incompleta'
  and factura_id is null
  and factura_relacionada_id is not null;

alter table casos_excepcion drop column if exists factura_relacionada_id;

alter table casos_excepcion drop constraint if exists casos_excepcion_tipo_excepcion_check;
alter table casos_excepcion
  add constraint casos_excepcion_tipo_excepcion_check check (
    tipo_excepcion is null or tipo_excepcion = any (array[
      'duplicado', 'importe_distinto', 'sin_pedido', 'nota_credito',
      'salto_divisa', 'entrega_incompleta', 'iban_no_coincide'
    ])
  );

alter table casos_excepcion
  add column if not exists origen_deteccion text;
