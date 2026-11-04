-- Historial Supabase: 20260924081019_create_facturas_tc_portal
-- Crea la tabla de staging facturas_tc_portal (tipo de cambio capturado del portal web asiatico). Eliminada despues por 20260924083227 (fichero 31).

create table if not exists public.facturas_tc_portal (
  numero_factura text primary key,
  tipo_cambio numeric not null,
  fecha_tipo_cambio date,
  moneda text,
  origen text not null default 'portal_web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.facturas_tc_portal is 'Tipo de cambio y su fecha capturados del portal web asiatico en la descarga. Staging: el export copia los valores a facturas.tipo_cambio_aplicado / fecha_tipo_cambio cuando moneda_original = CNY. Sin FK porque la fila existe antes que la factura.';
alter table public.facturas_tc_portal enable row level security;
