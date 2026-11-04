-- Historial Supabase: 20261022143230_casos_excepcion_tipo_multifactura
-- Anade 'multifactura' (8.o valor) al CHECK casos_excepcion_tipo_excepcion_check de casos_excepcion.tipo_excepcion.

ALTER TABLE public.casos_excepcion DROP CONSTRAINT casos_excepcion_tipo_excepcion_check;
ALTER TABLE public.casos_excepcion ADD CONSTRAINT casos_excepcion_tipo_excepcion_check CHECK (((tipo_excepcion IS NULL) OR (tipo_excepcion = ANY (ARRAY['duplicado'::text, 'importe_distinto'::text, 'sin_pedido'::text, 'nota_credito'::text, 'salto_divisa'::text, 'entrega_incompleta'::text, 'iban_no_coincide'::text, 'multifactura'::text]))));
