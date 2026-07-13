-- Bloque 04: ERP simulado - plan de cuentas, asientos, vista de descuadres
create table public.cuentas_contables (
  cuenta      text primary key,
  descripcion text,
  tipo        text check (tipo in ('activo','pasivo','gasto','ingreso'))
);

insert into public.cuentas_contables (cuenta, descripcion, tipo) values
  ('600','Compras de mercaderías','gasto'),
  ('607','Trabajos realizados por otras empresas','gasto'),
  ('621','Arrendamientos y cánones','gasto'),
  ('628','Suministros','gasto'),
  ('472','Hacienda Pública, IVA soportado','activo'),
  ('400','Proveedores','pasivo'),
  ('572','Bancos e instituciones de crédito','activo'),
  ('708','Devoluciones de compras (notas de crédito)','ingreso')
on conflict do nothing;

create table public.asientos_contables (
  asiento_id          text primary key,
  factura_id          text not null references public.facturas(factura_id),
  clave_idempotencia  text not null unique,
  tipo_asiento        text check (tipo_asiento in ('compra','rectificativo','pago')),
  fecha_asiento       date,
  estado_registro     text default 'pendiente' check (estado_registro in ('pendiente','registrado','error')),
  intentos            integer default 0,
  ultimo_error        text,
  id_erp_externo      text,
  fecha_registro      timestamptz
);

create table public.asientos_lineas (
  asiento_id      text not null references public.asientos_contables(asiento_id),
  linea_num       integer not null,
  cuenta          text not null references public.cuentas_contables(cuenta),
  centro_coste_id text references public.centros_coste(centro_coste_id),
  debe_eur        numeric default 0,
  haber_eur       numeric default 0,
  concepto        text,
  primary key (asiento_id, linea_num)
);

create view public.asientos_descuadrados as
select al.asiento_id, sum(al.debe_eur) as total_debe, sum(al.haber_eur) as total_haber
from public.asientos_lineas al
group by al.asiento_id
having sum(al.debe_eur) <> sum(al.haber_eur);
