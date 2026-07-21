-- Bloque 14: ajuste de dataset a 340 facturas / 51 en_excepcion (15% exacto)
-- (a) alinear ratio de excepciones al 15%
-- (b) eliminar tipo_excepcion 'mercancia_danada' (solo existia a nivel albaran, sin impacto en facturas.estado)
-- (c) fusionar 'producto_no_reconocido' en el mecanismo ya existente de flag_revision/motivo_flag de facturas_lineas

-- 1) Quitar los casos de mercancia_danada (12, todos via albaran_id) y producto_no_reconocido (6, via factura_id;
--    las facturas afectadas siguen en_excepcion porque ya tienen flag_revision=true en su linea, que es el
--    mecanismo que ahora las representa en solitario)
delete from public.casos_excepcion
where tipo_excepcion in ('mercancia_danada', 'producto_no_reconocido');

-- 2) Los 12 albaranes que estaban en 'discrepancia' solo por mercancia_danada vuelven a 'conciliado'
update public.albaranes
set estado = 'conciliado'
where albaran_id in (
  'ALB-00014','ALB-00015','ALB-00033','ALB-00046','ALB-00094','ALB-00128',
  'ALB-00142','ALB-00188','ALB-00237','ALB-00247','ALB-00323','ALB-00334'
);

-- 3) Retirar 'mercancia_danada' y 'producto_no_reconocido' del dominio de tipo_excepcion
alter table public.casos_excepcion drop constraint casos_excepcion_tipo_excepcion_check;
alter table public.casos_excepcion add constraint casos_excepcion_tipo_excepcion_check
  check (tipo_excepcion is null or tipo_excepcion = any (array[
    'duplicado','importe_distinto','sin_pedido','nota_credito',
    'entrega_parcial','salto_divisa','entrega_incompleta','iban_no_coincide'
  ]));

-- 4) Nuevas facturas para llegar a 340 totales / 51 en_excepcion (334->340, 47->51)

-- 4.1) 4 facturas 'sin_pedido' (ghost invoice, sin pedido ni albaran asociado, igual que el patron existente)
insert into public.facturas (
  factura_id, numero_factura, serie, fecha_expedicion, fecha_vencimiento,
  proveedor_id, nif_proveedor, razon_social_proveedor, direccion_proveedor,
  nif_cliente, direccion_cliente, razon_social_cliente, idioma_documento,
  moneda_original, base_imponible_original, cuota_iva_original, total_factura_original,
  tipo_cambio_aplicado, fecha_tipo_cambio,
  base_imponible_eur, cuota_iva_eur, total_factura_eur, saldo_pendiente_eur,
  forma_pago, iban_proveedor, pedido_id_ref, albaran_ids_ref, tipo_iva,
  es_nota_credito, estado, motivo_excepcion
) values
  ('FAC-00335','F-2026-00336','A','2026-04-10','2026-05-10',
   'PROV-002','B10000002','Moda Levante S.A.','España',
   'B99999999','Nextwear S.L., Madrid, España','Nextwear S.L.','es',
   'EUR', 544.00, 114.24, 658.24,
   null, null,
   544.00, 114.24, 658.24, 658.24,
   null, null, null, null, 21.00,
   false, 'en_excepcion', 'La factura no referencia ningún pedido existente en el sistema.'),
  ('FAC-00336','F-2026-00337','A','2026-05-08','2026-06-07',
   'PROV-003','B10000003','Calzados Ibérica S.L.','España',
   'B99999999','Nextwear S.L., Madrid, España','Nextwear S.L.','es',
   'EUR', 1260.00, 264.60, 1524.60,
   null, null,
   1260.00, 264.60, 1524.60, 1524.60,
   null, null, null, null, 21.00,
   false, 'en_excepcion', 'La factura no referencia ningún pedido existente en el sistema.'),
  ('FAC-00337','F-2025-00338','A','2025-04-14','2025-05-14',
   'PROV-006','B10000006','Accesorios Urbanos S.L.','España',
   'B99999999','Nextwear S.L., Madrid, España','Nextwear S.L.','es',
   'EUR', 840.00, 176.40, 1016.40,
   null, null,
   840.00, 176.40, 1016.40, 1016.40,
   null, null, null, null, 21.00,
   false, 'en_excepcion', 'La factura no referencia ningún pedido existente en el sistema.'),
  ('FAC-00338','F-2025-00339','A','2025-06-20','2025-07-20',
   'PROV-010','B10000010','Deportes Cantábrico S.L.','España',
   'B99999999','Nextwear S.L., Madrid, España','Nextwear S.L.','es',
   'EUR', 1885.00, 395.85, 2280.85,
   null, null,
   1885.00, 395.85, 2280.85, 2280.85,
   null, null, null, null, 21.00,
   false, 'en_excepcion', 'La factura no referencia ningún pedido existente en el sistema.');

insert into public.facturas_lineas (
  factura_id, linea_id, sku, centro_coste_id, descripcion, cantidad,
  precio_unitario_original, precio_unitario_eur, descuento_pct,
  total_linea_original, total_linea_eur, tipo_iva_linea
) values
  ('FAC-00335','FAC-00335-L1','CAM-GR-L','CC-MAD','Camiseta estampada gris',80, 6.80,6.80,0.00, 544.00,544.00,21.00),
  ('FAC-00336','FAC-00336-L1','CAL-BL-40','CC-BCN','Zapatilla urbana blanca',60, 21.00,21.00,0.00, 1260.00,1260.00,21.00),
  ('FAC-00337','FAC-00337-L1','ACC-GOR-AZ','CC-VLC','Gorra bordada azul',200, 4.20,4.20,0.00, 840.00,840.00,21.00),
  ('FAC-00338','FAC-00338-L1','SUD-AZ-M','CC-ECOM','Sudadera capucha azul',130, 14.50,14.50,0.00, 1885.00,1885.00,21.00);

insert into public.casos_excepcion (caso_id, factura_id, tipo_excepcion, descripcion, estado_resolucion) values
  ('EXC-00085','FAC-00335','sin_pedido','La factura no referencia ningún pedido existente en el sistema.','abierto'),
  ('EXC-00086','FAC-00336','sin_pedido','La factura no referencia ningún pedido existente en el sistema.','abierto'),
  ('EXC-00087','FAC-00337','sin_pedido','La factura no referencia ningún pedido existente en el sistema.','abierto'),
  ('EXC-00088','FAC-00338','sin_pedido','La factura no referencia ningún pedido existente en el sistema.','abierto');

-- 4.2) 2 facturas normales (con pedido+albaran completos) para completar 334->340 sin tocar el ratio de excepcion
insert into public.pedidos (pedido_id, proveedor_id, centro_coste_id, fecha_pedido, fecha_entrega_prevista, moneda, estado) values
  ('PED-00364','PROV-001','CC-SEV','2026-05-01','2026-05-15','EUR','cerrado'),
  ('PED-00365','PROV-002','CC-BIL','2026-06-01','2026-06-15','EUR','cerrado');

insert into public.pedidos_lineas (pedido_id, sku, cantidad_pedida, precio_unitario_acordado) values
  ('PED-00364','PAN-NG-L',150, 22.00),
  ('PED-00365','CHA-NG-M',100, 38.00);

insert into public.albaranes (albaran_id, pedido_id, proveedor_id, centro_coste_id, fecha_entrega, estado) values
  ('ALB-00370','PED-00364','PROV-001','CC-SEV','2026-05-14','conciliado'),
  ('ALB-00371','PED-00365','PROV-002','CC-BIL','2026-06-14','conciliado');

insert into public.albaranes_lineas (albaran_id, sku, cantidad_entregada) values
  ('ALB-00370','PAN-NG-L',150),
  ('ALB-00371','CHA-NG-M',100);

insert into public.facturas (
  factura_id, numero_factura, serie, fecha_expedicion, fecha_vencimiento,
  proveedor_id, nif_proveedor, razon_social_proveedor, direccion_proveedor,
  nif_cliente, direccion_cliente, razon_social_cliente, idioma_documento,
  moneda_original, base_imponible_original, cuota_iva_original, total_factura_original,
  tipo_cambio_aplicado, fecha_tipo_cambio,
  base_imponible_eur, cuota_iva_eur, total_factura_eur, saldo_pendiente_eur,
  forma_pago, iban_proveedor, pedido_id_ref, albaran_ids_ref, tipo_iva,
  es_nota_credito, estado
) values
  ('FAC-00339','F-2026-00340','A','2026-05-16','2026-06-15',
   'PROV-001','B10000001','Textil Norte S.L.','España',
   'B99999999','Nextwear S.L., Madrid, España','Nextwear S.L.','es',
   'EUR', 3300.00, 693.00, 3993.00,
   null, null,
   3300.00, 693.00, 3993.00, 3993.00,
   'transferencia 30 dias','ES1000010001010001','PED-00364','ALB-00370', 21.00,
   false, 'pendiente_conciliacion'),
  ('FAC-00340','F-2026-00341','A','2026-06-16','2026-07-16',
   'PROV-002','B10000002','Moda Levante S.A.','España',
   'B99999999','Nextwear S.L., Madrid, España','Nextwear S.L.','es',
   'EUR', 3800.00, 798.00, 4598.00,
   null, null,
   3800.00, 798.00, 4598.00, 4598.00,
   'transferencia 30 dias','ES1000010001010002','PED-00365','ALB-00371', 21.00,
   false, 'pendiente_conciliacion');

insert into public.facturas_lineas (
  factura_id, linea_id, sku, centro_coste_id, descripcion, cantidad,
  precio_unitario_original, precio_unitario_eur, descuento_pct,
  total_linea_original, total_linea_eur, tipo_iva_linea
) values
  ('FAC-00339','FAC-00339-L1','PAN-NG-L','CC-SEV','Pantalón cargo negro',150, 22.00,22.00,0.00, 3300.00,3300.00,21.00),
  ('FAC-00340','FAC-00340-L1','CHA-NG-M','CC-BIL','Chaqueta bomber negra',100, 38.00,38.00,0.00, 3800.00,3800.00,21.00);

insert into public.facturas_albaranes (factura_id, albaran_id) values
  ('FAC-00339','ALB-00370'),
  ('FAC-00340','ALB-00371');
