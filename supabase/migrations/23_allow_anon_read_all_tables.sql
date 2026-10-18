-- Aplicada en Supabase como 20260807134628 (allow_anon_read_all_tables).
-- Extiende la lectura anon del Copiloto al resto de tablas de public
-- (las tres de la migracion 22 ya la tenian).

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    AND tablename NOT IN ('facturas','casos_excepcion','facturas_lineas')
  LOOP
    EXECUTE format('CREATE POLICY "Permitir lectura pública para Copiloto" ON %I FOR SELECT TO anon USING (true);', t);
  END LOOP;
END $$;
