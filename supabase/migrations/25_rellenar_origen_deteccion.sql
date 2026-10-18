-- Aplicada en Supabase como 20260915174736 (rellenar_origen_deteccion_por_tipo_excepcion).
-- FinFlow · Relleno de origen_deteccion · 15-09-2026
--
-- POR QUÉ
--   La columna se creó el 03-09-2026 y quedó vacía en todas las filas.
--   El origen no hay que averiguarlo: el tipo de excepcion lo determina.
--   Seis de los siete tipos nacen en la factura; solo entrega_incompleta
--   nace en el albaran, que es donde se detecta la discrepancia contra
--   lo pedido.
--
-- REVERSIÓN
--   update casos_excepcion set origen_deteccion = null;

update public.casos_excepcion
   set origen_deteccion = case
         when tipo_excepcion = 'entrega_incompleta' then 'albaran'
         else 'factura'
       end
 where origen_deteccion is null;
