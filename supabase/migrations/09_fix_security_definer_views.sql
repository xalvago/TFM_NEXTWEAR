-- Bloque 09: fix de seguridad - vistas SECURITY DEFINER filtraban datos a `anon`
-- Hallazgo: stock_actual y asientos_descuadrados corrian con permisos del
-- creador de la vista (postgres), saltandose el RLS deny-by-default de las
-- tablas base. Probado con la anon key publica: devolvia filas reales de
-- stock_movimientos sin autenticacion. security_invoker=on hace que la vista
-- respete el rol de quien consulta (anon/authenticated siguen bloqueados;
-- el backend con service_role sigue viendo todo igual).
alter view public.stock_actual set (security_invoker = on);
alter view public.asientos_descuadrados set (security_invoker = on);
