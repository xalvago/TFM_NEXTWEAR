-- Aplicada en Supabase como 20260925082457 (facturas_estado_add_nueva_entrada).
-- Anade el estado inicial 'nueva_entrada' al CHECK de facturas.estado.

ALTER TABLE public.facturas DROP CONSTRAINT facturas_estado_check;
ALTER TABLE public.facturas ADD CONSTRAINT facturas_estado_check CHECK (estado = ANY (ARRAY['nueva_entrada'::text,'pendiente_captura'::text,'pendiente_conciliacion'::text,'conciliada_ok'::text,'en_excepcion'::text,'pendiente_aprobacion'::text,'aprobada'::text,'rechazada'::text,'contabilizada'::text,'pagada'::text,'anulada'::text]));
