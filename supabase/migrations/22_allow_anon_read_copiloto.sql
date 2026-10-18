-- Aplicada en Supabase como 20260803225122 (allow_anon_read_copiloto).
-- Lectura publica (anon) de las tablas que consulta el Copiloto (FinFlow Bot).

CREATE POLICY "Permitir lectura pública para Copiloto" ON facturas
  FOR SELECT TO anon USING (true);

CREATE POLICY "Permitir lectura pública para Copiloto" ON casos_excepcion
  FOR SELECT TO anon USING (true);

CREATE POLICY "Permitir lectura pública para Copiloto" ON facturas_lineas
  FOR SELECT TO anon USING (true);
