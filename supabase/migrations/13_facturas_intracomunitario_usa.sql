-- Bloque 13: completa el regimen_iva/campos fiscales que la migracion 12 solo
-- aplico a los proveedores chinos (exportacion). Faltaban por completar:
--   - PROV-007 Denim Coast Inc. (Estados Unidos, USD) -> extra-UE, mismo
--     tratamiento de exportacion que China (aduanas, sin IVA repercutido,
--     pago por SWIFT en vez de IBAN SEPA).
--   - PROV-004 Filati Milano S.r.l. (Italia) y PROV-005 Confeccoes Porto Lda
--     (Portugal) -> intracomunitario UE (inversion del sujeto pasivo): no hay
--     aduana ni SWIFT (SEPA/IBAN vale igual que nacional), pero el
--     identificador fiscal es un VAT number, no un NIF espanol.
-- Al igual que en la migracion 12, el tipo_iva/cuota_iva original de estas
-- facturas se deja intacto (21% espanol ya cargado en el seed): es una
-- inconsistencia real y detectable, no un bug — el documento y el copiloto
-- deben poder senalarla como caso de excepcion (regimen exento con IVA > 0).

-- Estados Unidos: extra-UE, tratamiento de exportacion.
update public.facturas
set
  regimen_iva = 'exportacion',
  tipo_id_fiscal = 'otro',
  id_fiscal_extranjero = 'EIN 27-4471100',
  swift_bic = 'BOFAUS3NXXX',
  banco_corresponsal = 'Bank of America, N.A. — Charlotte, NC',
  incoterm = 'DAP',
  pais_origen_mercancia = 'Estados Unidos'
where proveedor_id = 'PROV-007';

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
  and f.proveedor_id = 'PROV-007';

-- Italia y Portugal: intracomunitario UE. VAT number en vez de NIF; sin
-- aduana/SWIFT (se sigue pagando por IBAN SEPA, ya presente en iban_proveedor).
update public.facturas
set
  regimen_iva = 'intracomunitario',
  tipo_id_fiscal = 'vat',
  id_fiscal_extranjero = case proveedor_id
    when 'PROV-004' then 'IT9000004'
    when 'PROV-005' then 'PT8000005'
  end
where proveedor_id in ('PROV-004', 'PROV-005');
