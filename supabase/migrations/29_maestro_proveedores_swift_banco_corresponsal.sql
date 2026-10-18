-- Aplicada en Supabase como 20261006102737 (maestro_proveedores_swift_banco_corresponsal).

alter table public.maestro_proveedores
  add column if not exists swift_bic text,
  add column if not exists banco_corresponsal text;
