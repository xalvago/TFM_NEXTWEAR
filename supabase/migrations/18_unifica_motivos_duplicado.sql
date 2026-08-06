-- Unifica el texto de motivo/descripcion para casos_excepcion.tipo_excepcion = 'duplicado'.
-- Antes: 2 redacciones distintas para la misma categoria (mismo texto no sincronizado
-- entre facturas.motivo_excepcion y casos_excepcion.descripcion), lo que provocaba
-- que un filtro por texto en facturas devolviera 4 de los 8 casos reales.
-- Se mantiene la distincion de subtipo (mismo numero de factura vs mismo importe+fecha
-- proxima) pero con redaccion identica en ambas tablas.

update facturas f
set motivo_excepcion = 'Posible factura duplicada: mismo número de factura y proveedor que otra factura ya registrada.'
from casos_excepcion ce
where ce.factura_id = f.factura_id
  and ce.tipo_excepcion = 'duplicado'
  and ce.descripcion like 'Factura con mismo número%';

update casos_excepcion
set descripcion = 'Posible factura duplicada: mismo número de factura y proveedor que otra factura ya registrada.'
where tipo_excepcion = 'duplicado'
  and descripcion like 'Factura con mismo número%';

update facturas f
set motivo_excepcion = 'Posible factura duplicada: mismo proveedor, importe y fecha próxima a otra factura ya registrada.'
from casos_excepcion ce
where ce.factura_id = f.factura_id
  and ce.tipo_excepcion = 'duplicado'
  and ce.descripcion like 'Posible factura duplicada: mismo proveedor%';
