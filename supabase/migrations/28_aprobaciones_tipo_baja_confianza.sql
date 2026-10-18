-- Aplicada en Supabase como 20261005144732 (aprobaciones_tipo_baja_confianza).

alter table public.aprobaciones drop constraint aprobaciones_tipo_check;
alter table public.aprobaciones add constraint aprobaciones_tipo_check
  check (tipo in ('por_importe','por_excepcion','por_baja_confianza'));
