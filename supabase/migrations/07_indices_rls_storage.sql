-- Bloque 07: indices, RLS, storage
create index if not exists idx_facturas_albaranes_albaran on public.facturas_albaranes (albaran_id);
create index if not exists idx_facturas_hash on public.facturas (hash_documento);
create index if not exists idx_aprobaciones_factura on public.aprobaciones (factura_id);
create index if not exists idx_aprobaciones_decision on public.aprobaciones (decision);
create index if not exists idx_comunicaciones_caso on public.comunicaciones (caso_id);
create index if not exists idx_asientos_factura on public.asientos_contables (factura_id);
create index if not exists idx_asientos_estado on public.asientos_contables (estado_registro);
create index if not exists idx_pagos_factura on public.pagos (factura_id);
create index if not exists idx_pagos_estado on public.pagos (estado_pago);
create index if not exists idx_pagos_vencimiento on public.pagos (fecha_vencimiento);
create index if not exists idx_log_agentes_factura on public.log_agentes (factura_id);
create index if not exists idx_log_agentes_agente_fecha on public.log_agentes (agente, creado_en);
create index if not exists idx_casos_excepcion_resolucion on public.casos_excepcion (estado_resolucion);

-- RLS: replicar patron actual (RLS activo, sin policies, acceso solo via service_role)
alter table public.facturas_albaranes enable row level security;
alter table public.aprobaciones enable row level security;
alter table public.comunicaciones enable row level security;
alter table public.cuentas_contables enable row level security;
alter table public.asientos_contables enable row level security;
alter table public.asientos_lineas enable row level security;
alter table public.pagos enable row level security;
alter table public.log_agentes enable row level security;

-- Storage: bucket privado para PDFs de factura
insert into storage.buckets (id, name, public)
values ('facturas-pdf', 'facturas-pdf', false)
on conflict (id) do nothing;
