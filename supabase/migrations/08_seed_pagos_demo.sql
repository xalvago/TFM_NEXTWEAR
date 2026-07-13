-- Bloque 08: seed demo - 2 facturas marcadas como pagadas + su pago ejecutado
update public.facturas
set estado = 'pagada', saldo_pendiente_eur = 0
where factura_id in ('FAC-00001', 'FAC-00002');

insert into public.pagos (
  pago_id, factura_id, fecha_pago, fecha_vencimiento,
  importe_original, moneda, importe_eur, es_pago_parcial,
  iban_destino, medio_pago, estado_pago
) values
  ('PAGO-DEMO-1', 'FAC-00001', '2024-06-03', '2024-06-03',
   2828.99, 'EUR', 2828.99, false,
   'ES1000010001010001', 'transferencia', 'ejecutado'),
  ('PAGO-DEMO-2', 'FAC-00002', '2024-05-27', '2024-05-27',
   986.13, 'EUR', 986.13, false,
   'ES1000010001010006', 'transferencia', 'ejecutado');
