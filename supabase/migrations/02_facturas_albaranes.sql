-- Bloque 02: tabla puente factura <-> albaran + backfill desde texto libre
create table public.facturas_albaranes (
  factura_id text not null references public.facturas(factura_id),
  albaran_id text not null references public.albaranes(albaran_id),
  primary key (factura_id, albaran_id)
);

insert into public.facturas_albaranes (factura_id, albaran_id)
select f.factura_id, trim(a.id)
from public.facturas f,
     unnest(string_to_array(f.albaran_ids_ref, ';')) as a(id)
where f.albaran_ids_ref is not null
  and trim(a.id) <> ''
  and exists (select 1 from public.albaranes al where al.albaran_id = trim(a.id))
on conflict do nothing;
