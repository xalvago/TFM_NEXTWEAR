-- Bloque 12: seed demo - factura de exportacion para los 2 proveedores asiaticos
-- (PROV-008 Guangzhou Fashion Co. Ltd, PROV-009 Shenzhen Textile Export Ltd,
-- unicos proveedores con pais='China' en el maestro). Rellena los campos de
-- exportacion añadidos en la migracion 11; el resto de facturas (nacional/UE/US)
-- quedan con estos campos NULL. Datos fiscales/bancarios ficticios pero con
-- formato realista (demo TFM, no USCC/SWIFT reales).

update public.facturas
set
  regimen_iva = 'exportacion',
  tipo_id_fiscal = 'uscc',
  id_fiscal_extranjero = case proveedor_id
    when 'PROV-008' then '91440101MA5CQK5X6M'
    when 'PROV-009' then '91440300MA5DXW2Y8B'
  end,
  swift_bic = case proveedor_id
    when 'PROV-008' then 'ICBKCNBJGZH'
    when 'PROV-009' then 'BKCHCNBJSZX'
  end,
  banco_corresponsal = case proveedor_id
    when 'PROV-008' then 'Citibank N.A. — Nueva York (corresponsal USD)'
    when 'PROV-009' then 'JPMorgan Chase Bank, N.A. — Nueva York (corresponsal USD)'
  end,
  incoterm = case proveedor_id
    when 'PROV-008' then 'FOB'
    when 'PROV-009' then 'CIF'
  end,
  pais_origen_mercancia = 'China'
where proveedor_id in ('PROV-008', 'PROV-009');

-- Codigo arancelario (HS, 6 digitos) por categoria de producto.
update public.facturas_lineas fl
set codigo_hs = case p.categoria
  when 'camiseta' then '610910'
  when 'sudadera' then '611020'
  when 'pantalon' then '620342'
  when 'chaqueta' then '620293'
  when 'calzado' then '640411'
  when 'accesorio' then '621710'
end
from public.facturas f, public.productos p
where fl.factura_id = f.factura_id
  and fl.sku = p.sku
  and f.proveedor_id in ('PROV-008', 'PROV-009');
