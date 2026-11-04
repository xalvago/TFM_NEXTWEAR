-- FinFlow · Cambios manuales en Supabase (proyecto EBIS_TFM_RETAIL_NEXTWEAR)
-- Ejecutados desde el SQL Editor, por lo que NO figuran en supabase_migrations.schema_migrations.
-- Acordados entre Rol 1 (Carles) y Rol 2 (Álvaro) el 04/11/2026.

-- 1 · T-07: descripción de la transición (Table Editor, 04/11/2026)
UPDATE transiciones_estado_factura
SET descripcion = 'total_factura_eur > 5.000 (flujo Pedir aprobacion, regla B2) o alguna linea con confianza < 0,80 (Clasificador)'
WHERE transicion_id = 'T-07';

-- 2 · Borrado de los asientos sembrados de facturas no contabilizadas (04/11/2026)
--     Antes: 291 asientos / 871 apuntes. Después: 4 asientos / 10 apuntes (FAC-00001 y FAC-00002, pagadas).
--     Copia previa: CSV de asientos_contables y asientos_lineas.
DELETE FROM asientos_lineas l
USING asientos_contables a, facturas f
WHERE l.asiento_id = a.asiento_id
  AND a.factura_id = f.factura_id
  AND f.estado NOT IN ('contabilizada', 'pagada');

DELETE FROM asientos_contables a
USING facturas f
WHERE a.factura_id = f.factura_id
  AND f.estado NOT IN ('contabilizada', 'pagada');

-- 3 · Alta de la cuenta 608 (PGC: Devoluciones de compras y operaciones similares) (04/11/2026)
INSERT INTO cuentas_contables (cuenta, descripcion, tipo)
VALUES ('608', 'Devoluciones de compras y operaciones similares', 'gasto')
ON CONFLICT (cuenta) DO NOTHING;

-- 4 · Baja de la cuenta 708 (04/11/2026, tras cambiar el Registro contable a la 608)
--     Comprobado antes que devolvía 0:  SELECT count(*) FROM asientos_lineas WHERE cuenta = '708';
--     Resultado: 8 cuentas en cuentas_contables, sin la 708.
DELETE FROM cuentas_contables WHERE cuenta = '708';
