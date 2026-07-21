-- Bloque 15: generacion de asientos contables (registro ERP simulado, idempotente)
-- Solo facturas fuera de excepcion y no anuladas se consideran "validadas" para registrar
-- en el ERP (las en_excepcion quedan bloqueadas hasta resolver la incidencia).
-- tipo_asiento: compra (factura normal) | rectificativo (nota de credito) | pago (factura ya pagada)

-- 1) Cabeceras compra / rectificativo (una por factura no en_excepcion / no anulada)
insert into public.asientos_contables (
  asiento_id, factura_id, clave_idempotencia, tipo_asiento,
  fecha_asiento, estado_registro, intentos, id_erp_externo, fecha_registro
)
select
  'AST-' || f.factura_id || '-01',
  f.factura_id,
  'CTB-' || f.factura_id || '-' || (case when f.es_nota_credito then 'RECT' else 'COMPRA' end),
  case when f.es_nota_credito then 'rectificativo' else 'compra' end,
  f.fecha_expedicion,
  'registrado',
  1,
  'ERP-' || to_char(f.fecha_expedicion, 'YYYY') || '-' ||
    lpad((row_number() over (order by f.factura_id))::text, 6, '0'),
  (f.fecha_expedicion + interval '2 days')::date
from public.facturas f
where f.estado not in ('en_excepcion', 'anulada');

-- 2) Cabecera de asiento de pago (facturas ya cobradas por el proveedor)
insert into public.asientos_contables (
  asiento_id, factura_id, clave_idempotencia, tipo_asiento,
  fecha_asiento, estado_registro, intentos, id_erp_externo, fecha_registro
)
select
  'AST-' || f.factura_id || '-02',
  f.factura_id,
  'CTB-' || f.factura_id || '-PAGO',
  'pago',
  p.fecha_pago,
  'registrado',
  1,
  'ERP-' || to_char(p.fecha_pago, 'YYYY') || '-P' || lpad((row_number() over (order by f.factura_id))::text, 5, '0'),
  p.fecha_pago
from public.facturas f
join public.pagos p on p.factura_id = f.factura_id
where f.estado = 'pagada';

-- 3) Lineas de asiento 'compra': gasto 600 por centro de coste + IVA soportado 472 + proveedor 400
with lineas_centro as (
  select
    f.factura_id,
    fl.centro_coste_id,
    sum(fl.total_linea_eur) as importe,
    row_number() over (partition by f.factura_id order by fl.centro_coste_id) as rn
  from public.facturas f
  join public.facturas_lineas fl on fl.factura_id = f.factura_id
  where f.estado not in ('en_excepcion', 'anulada') and f.es_nota_credito = false
  group by f.factura_id, fl.centro_coste_id
),
tope as (
  select factura_id, max(rn) as max_rn from lineas_centro group by factura_id
)
insert into public.asientos_lineas (asiento_id, linea_num, cuenta, centro_coste_id, debe_eur, haber_eur, concepto)
select 'AST-' || lc.factura_id || '-01', lc.rn, '600', lc.centro_coste_id, lc.importe, 0,
       'Compra mercaderia factura ' || lc.factura_id
from lineas_centro lc
union all
select 'AST-' || f.factura_id || '-01', t.max_rn + 1, '472', null, f.cuota_iva_eur, 0,
       'IVA soportado factura ' || f.factura_id
from public.facturas f
join tope t on t.factura_id = f.factura_id
union all
select 'AST-' || f.factura_id || '-01', t.max_rn + 2, '400', null, 0, f.total_factura_eur,
       'Proveedor ' || f.proveedor_id || ' factura ' || f.factura_id
from public.facturas f
join tope t on t.factura_id = f.factura_id;

-- 4) Lineas de asiento 'rectificativo' (nota de credito): reversa de compra, 708 en vez de 600.
--    Las NC son documentos solo de cabecera (sin facturas_lineas propias): se usan los
--    importes de la propia factura en vez de agregar por centro de coste.
insert into public.asientos_lineas (asiento_id, linea_num, cuenta, centro_coste_id, debe_eur, haber_eur, concepto)
select 'AST-' || f.factura_id || '-01', 1, '400', null, abs(f.total_factura_eur), 0,
       'Regularizacion proveedor ' || f.proveedor_id || ' NC ' || f.factura_id
from public.facturas f
where f.estado not in ('en_excepcion', 'anulada') and f.es_nota_credito = true
union all
select 'AST-' || f.factura_id || '-01', 2, '708', null, 0, abs(f.base_imponible_eur),
       'Devolucion compra NC ' || f.factura_id
from public.facturas f
where f.estado not in ('en_excepcion', 'anulada') and f.es_nota_credito = true
union all
select 'AST-' || f.factura_id || '-01', 3, '472', null, 0, abs(f.cuota_iva_eur),
       'Reversion IVA soportado NC ' || f.factura_id
from public.facturas f
where f.estado not in ('en_excepcion', 'anulada') and f.es_nota_credito = true;

-- 5) Lineas de asiento 'pago': cancela proveedor 400 contra banco 572
insert into public.asientos_lineas (asiento_id, linea_num, cuenta, centro_coste_id, debe_eur, haber_eur, concepto)
select 'AST-' || f.factura_id || '-02', 1, '400', null, f.total_factura_eur, 0,
       'Pago proveedor ' || f.proveedor_id || ' factura ' || f.factura_id
from public.facturas f
where f.estado = 'pagada'
union all
select 'AST-' || f.factura_id || '-02', 2, '572', null, 0, f.total_factura_eur,
       'Salida banco pago factura ' || f.factura_id
from public.facturas f
where f.estado = 'pagada';
