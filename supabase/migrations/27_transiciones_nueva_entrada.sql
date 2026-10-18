-- Aplicada en Supabase como 20260927113143 (transiciones_nueva_entrada).
-- Incorpora 'nueva_entrada' a la matriz de transiciones (+4 transiciones).

ALTER TABLE public.transiciones_estado_factura DROP CONSTRAINT chk_transicion_origen_valido;
ALTER TABLE public.transiciones_estado_factura ADD CONSTRAINT chk_transicion_origen_valido
  CHECK (estado_origen = ANY (ARRAY['nueva_entrada','pendiente_captura','pendiente_conciliacion','conciliada_ok',
    'en_excepcion','pendiente_aprobacion','aprobada','rechazada','contabilizada','pagada','anulada']));

ALTER TABLE public.transiciones_estado_factura DROP CONSTRAINT chk_transicion_destino_valido;
ALTER TABLE public.transiciones_estado_factura ADD CONSTRAINT chk_transicion_destino_valido
  CHECK (estado_destino = ANY (ARRAY['nueva_entrada','pendiente_captura','pendiente_conciliacion','conciliada_ok',
    'en_excepcion','pendiente_aprobacion','aprobada','rechazada','contabilizada','pagada','anulada']));

INSERT INTO public.transiciones_estado_factura (transicion_id, estado_origen, estado_destino, disparador, descripcion) VALUES
  ('T-02b', 'pendiente_captura', 'nueva_entrada', 'hitl',
   'Revision humana de una factura con datos incompletos (p. ej. proveedor no reconocido): corregida, vuelve a la cola del Conciliador'),
  ('T-04b', 'nueva_entrada', 'conciliada_ok', 'conciliador',
   'Factura nueva sin excepcion, o con excepcion no bloqueante (nota_credito)'),
  ('T-06b', 'nueva_entrada', 'en_excepcion', 'conciliador',
   'Factura nueva con excepcion bloqueante, aplicando la precedencia'),
  ('T-18e', 'nueva_entrada', 'anulada', 'hitl',
   'Anulacion manual con motivo obligatorio antes de conciliar');
