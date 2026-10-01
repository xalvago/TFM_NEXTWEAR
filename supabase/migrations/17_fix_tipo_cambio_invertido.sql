-- Bug: tasa_cambio en tipos_cambio es "unidades de moneda por 1 EUR" (CNY~7.7,
-- USD~1.05 -- valores de mercado reales), pero el dataset calculo eur = original * tasa
-- en vez de eur = original / tasa. Efecto: CNY salia ~tasa^2 (~59x) inflado, USD ~1.1x.
-- Gasto total neto pasa de ~1,43M (incorrecto) a ~530k EUR.

-- 1) facturas: recalcular columnas EUR para USD/CNY a partir del original y la tasa aplicada
update facturas
set base_imponible_eur = round(base_imponible_original / tipo_cambio_aplicado, 2),
    cuota_iva_eur = round(cuota_iva_original / tipo_cambio_aplicado, 2),
    total_factura_eur = round(total_factura_original / tipo_cambio_aplicado, 2),
    saldo_pendiente_eur = round(total_factura_original / tipo_cambio_aplicado, 2)
where moneda_original in ('USD', 'CNY');

-- 2) facturas_lineas: mismo criterio, tasa de la factura padre
update facturas_lineas fl
set precio_unitario_eur = round(fl.precio_unitario_original / f.tipo_cambio_aplicado, 4),
    total_linea_eur = round(fl.total_linea_original / f.tipo_cambio_aplicado, 2)
from facturas f
where f.factura_id = fl.factura_id
  and f.moneda_original in ('USD', 'CNY');

-- 3) asientos_lineas (registro ERP): recalcular a partir de las facturas ya corregidas
update asientos_lineas al
set debe_eur = case
      when a.tipo_asiento = 'compra' and al.cuenta = '600' then f.base_imponible_eur
      when a.tipo_asiento = 'compra' and al.cuenta = '472' then f.cuota_iva_eur
      when a.tipo_asiento = 'rectificativo' and al.cuenta = '400' then abs(f.total_factura_eur)
      else al.debe_eur
    end,
    haber_eur = case
      when a.tipo_asiento = 'compra' and al.cuenta = '400' then f.total_factura_eur
      when a.tipo_asiento = 'rectificativo' and al.cuenta = '708' then abs(f.base_imponible_eur)
      when a.tipo_asiento = 'rectificativo' and al.cuenta = '472' then abs(f.cuota_iva_eur)
      else al.haber_eur
    end
from asientos_contables a
join facturas f on f.factura_id = a.factura_id
where al.asiento_id = a.asiento_id
  and f.moneda_original in ('USD', 'CNY');
