-- Bloque 19: seed pedidos + albaranes para 7 casos de conciliacion (documento de
-- trabajo compartido con el usuario). Las facturas NO se insertan aqui: se generan
-- como PDF fisico y se introducen despues via RPA, referenciando estos mismos
-- pedido_id / albaran_id. No se toca ninguna de las 340 facturas existentes.
--
-- Caso 1 (limpia)            -> PED-00366 / ALB-00372
-- Caso 2 (importe_distinto)  -> PED-00367 / ALB-00373
-- Caso 3 (sin_pedido)        -> sin pedido/albaran (intencionado)
-- Caso 4 (duplicado)         -> reutiliza PED-00366 / ALB-00372 (caso 1)
-- Caso 5 (nota_credito)      -> PED-00368 / ALB-00374
-- Caso 6 (entrega_incompleta)-> PED-00369 / ALB-00375 (completo) + ALB-00376 (parcial)
-- Caso 7 (salto_divisa)      -> PED-00370 / ALB-00377

insert into public.pedidos (pedido_id, proveedor_id, centro_coste_id, fecha_pedido, fecha_entrega_prevista, moneda, estado) values
  ('PED-00366', 'PROV-001', 'CC-MAD', '2026-04-05', '2026-04-15', 'EUR', 'recibido_completo'),
  ('PED-00367', 'PROV-006', 'CC-BCN', '2026-04-06', '2026-04-16', 'EUR', 'recibido_completo'),
  ('PED-00368', 'PROV-005', 'CC-VLC', '2026-04-07', '2026-04-17', 'EUR', 'recibido_completo'),
  ('PED-00369', 'PROV-003', 'CC-SEV', '2026-04-08', '2026-04-18', 'EUR', 'parcialmente_recibido'),
  ('PED-00370', 'PROV-008', 'CC-ALM', '2026-04-01', '2026-04-20', 'CNY', 'recibido_completo');

insert into public.pedidos_lineas (pedido_id, sku, cantidad_pedida, precio_unitario_acordado) values
  ('PED-00366', 'CAM-BL-S', 40, 5.20),
  ('PED-00366', 'PAN-BE-M', 20, 19.50),
  ('PED-00367', 'ACC-GOR-AZ', 50, 4.20),
  ('PED-00367', 'ACC-CIN-NG', 20, 8.50),
  ('PED-00368', 'CHA-VD-L', 15, 32.50),
  ('PED-00369', 'CAL-GR-41', 40, 29.00),
  ('PED-00369', 'CAL-NG-42', 25, 21.00),
  ('PED-00370', 'CHA-NG-M', 30, 43.20);

insert into public.albaranes (albaran_id, pedido_id, proveedor_id, centro_coste_id, fecha_entrega, estado) values
  ('ALB-00372', 'PED-00366', 'PROV-001', 'CC-MAD', '2026-04-14', 'registrado'),
  ('ALB-00373', 'PED-00367', 'PROV-006', 'CC-BCN', '2026-04-15', 'registrado'),
  ('ALB-00374', 'PED-00368', 'PROV-005', 'CC-VLC', '2026-04-16', 'registrado'),
  ('ALB-00375', 'PED-00369', 'PROV-003', 'CC-SEV', '2026-04-17', 'registrado'),
  ('ALB-00376', 'PED-00369', 'PROV-003', 'CC-SEV', '2026-04-18', 'registrado'),
  ('ALB-00377', 'PED-00370', 'PROV-008', 'CC-ALM', '2026-04-19', 'registrado');

insert into public.albaranes_lineas (albaran_id, sku, cantidad_entregada) values
  ('ALB-00372', 'CAM-BL-S', 40),
  ('ALB-00372', 'PAN-BE-M', 20),
  ('ALB-00373', 'ACC-GOR-AZ', 50),
  ('ALB-00373', 'ACC-CIN-NG', 20),
  ('ALB-00374', 'CHA-VD-L', 15),
  ('ALB-00375', 'CAL-GR-41', 40),
  ('ALB-00376', 'CAL-NG-42', 15),  -- entrega parcial: pedido pide 25, solo llegan 15
  ('ALB-00377', 'CHA-NG-M', 30);
