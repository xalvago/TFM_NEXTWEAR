-- Bloque 18: direccion de la sede del proveedor. Falta para que la factura tipo
-- muestre domicilio del emisor (documento legalmente completo) y para la ficha
-- de proveedor. Calles reales de cada pais, numero inventado.
alter table public.maestro_proveedores
  add column if not exists direccion_sede text;

update public.maestro_proveedores set direccion_sede = 'Gran Vía Don Diego López de Haro 45, 48001 Bilbao, España' where proveedor_id = 'PROV-001';
update public.maestro_proveedores set direccion_sede = 'Calle Colón 78, 46004 Valencia, España' where proveedor_id = 'PROV-002';
update public.maestro_proveedores set direccion_sede = 'Avenida de Elche 112, 03202 Elche, España' where proveedor_id = 'PROV-003';
update public.maestro_proveedores set direccion_sede = 'Via Solferino 23, 20121 Milano, Italia' where proveedor_id = 'PROV-004';
update public.maestro_proveedores set direccion_sede = 'Rua de Santa Catarina 156, 4000-443 Porto, Portugal' where proveedor_id = 'PROV-005';
update public.maestro_proveedores set direccion_sede = 'Calle Fuencarral 89, 28004 Madrid, España' where proveedor_id = 'PROV-006';
update public.maestro_proveedores set direccion_sede = '1201 S Los Angeles St, Los Angeles, CA 90015, Estados Unidos' where proveedor_id = 'PROV-007';
update public.maestro_proveedores set direccion_sede = 'Zhongshan Avenue 88, Tianhe District, Guangzhou 510630, China' where proveedor_id = 'PROV-008';
update public.maestro_proveedores set direccion_sede = 'Huaqiang North Road 245, Futian District, Shenzhen 518031, China' where proveedor_id = 'PROV-009';
update public.maestro_proveedores set direccion_sede = 'Calle Calvo Sotelo 34, 39002 Santander, España' where proveedor_id = 'PROV-010';

-- facturas.direccion_proveedor ya existia pero solo tenia el pais como
-- placeholder (mismo patron que direccion_cliente): se sobrescribe con la
-- sede completa del proveedor.
update public.facturas f
set direccion_proveedor = mp.direccion_sede
from public.maestro_proveedores mp
where mp.proveedor_id = f.proveedor_id;
