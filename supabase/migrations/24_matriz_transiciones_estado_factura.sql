-- Aplicada en Supabase como 20260915174053 (matriz_transiciones_estado_factura_modo_aviso).
-- =====================================================================
-- FinFlow · Migración 4 · matriz de transiciones de estado de factura
-- Carles · 31 de agosto de 2026, aplicada 15-09-2026
-- =====================================================================


begin;

-- ---------------------------------------------------------------------
-- 1. Parámetro de control
-- ---------------------------------------------------------------------

create table if not exists public.parametros_sistema (
  clave           text primary key,
  valor           text not null,
  descripcion     text,
  actualizado_en  timestamptz not null default now()
);

insert into public.parametros_sistema (clave, valor, descripcion)
values ('modo_validacion_estados', 'aviso',
        'aviso = registra la transicion no prevista y la deja pasar. bloqueo = la rechaza con error.')
on conflict (clave) do nothing;


-- ---------------------------------------------------------------------
-- 2. La matriz
-- ---------------------------------------------------------------------

create table public.transiciones_estado_factura (
  transicion_id   text primary key,
  estado_origen   text not null,
  estado_destino  text not null,
  disparador      text not null,
  descripcion     text not null,
  activa          boolean not null default true,

  constraint chk_transicion_origen_valido check (
    estado_origen in (
      'pendiente_captura','pendiente_conciliacion','conciliada_ok','en_excepcion',
      'pendiente_aprobacion','aprobada','rechazada','contabilizada','pagada','anulada')),
  constraint chk_transicion_destino_valido check (
    estado_destino in (
      'pendiente_captura','pendiente_conciliacion','conciliada_ok','en_excepcion',
      'pendiente_aprobacion','aprobada','rechazada','contabilizada','pagada','anulada')),
  constraint chk_transicion_disparador check (
    disparador in ('captador','conciliador','hitl','rpa_contable','rpa_pagos')),
  constraint chk_transicion_no_refleja check (estado_origen <> estado_destino)
);

comment on table public.transiciones_estado_factura is
  'Matriz de transiciones permitidas. Las reflexivas no se listan: el trigger las permite siempre, son la reejecucion idempotente de un agente.';


-- ---------------------------------------------------------------------
-- 3. Carga. 17 transiciones, 20 filas: la anulación manual parte de
--    cuatro estados distintos. La creación de la factura no aparece,
--    es un INSERT y el trigger solo actúa sobre UPDATE.
-- ---------------------------------------------------------------------

insert into public.transiciones_estado_factura
  (transicion_id, estado_origen, estado_destino, disparador, descripcion) values
  ('T-02',  'pendiente_captura',      'pendiente_conciliacion', 'captador',
   'Extraccion completa, confianza >= 0,70 y hash_documento no duplicado'),
  ('T-03',  'pendiente_captura',      'anulada',                'hitl',
   'Documento ilegible o no es una factura'),
  ('T-04',  'pendiente_conciliacion', 'conciliada_ok',          'conciliador',
   'Ninguna regla de Capa A dispara'),
  ('T-05',  'pendiente_conciliacion', 'conciliada_ok',          'conciliador',
   'Excepcion no bloqueante: se registra caso informativo y la factura sigue'),
  ('T-06',  'pendiente_conciliacion', 'en_excepcion',           'conciliador',
   'Excepcion bloqueante: se abre caso y se retiene el pago'),
  ('T-07',  'conciliada_ok',          'pendiente_aprobacion',   'conciliador',
   'total_factura_eur > 5.000, regla B2'),
  ('T-08',  'conciliada_ok',          'contabilizada',          'rpa_contable',
   'total_factura_eur <= 5.000, asiento con clave_idempotencia'),
  ('T-09',  'en_excepcion',           'pendiente_conciliacion', 'hitl',
   'Caso resuelto_ok con correccion del dato: se reevalua'),
  ('T-10',  'en_excepcion',           'pendiente_aprobacion',   'hitl',
   'Caso resuelto_ok aceptando la desviacion sin corregir dato'),
  ('T-11',  'en_excepcion',           'rechazada',              'hitl', 'Caso resuelto_fraude'),
  ('T-12',  'en_excepcion',           'anulada',                'hitl', 'Caso descartado'),
  ('T-13',  'pendiente_aprobacion',   'aprobada',               'hitl', 'Decision favorable'),
  ('T-14',  'pendiente_aprobacion',   'rechazada',              'hitl', 'Decision desfavorable'),
  ('T-15',  'aprobada',               'contabilizada',          'rpa_contable',
   'Asiento registrado, compra o rectificativo'),
  ('T-16',  'contabilizada',          'pagada',                 'rpa_pagos',
   'Pago ejecutado e IBAN destino coincidente con maestro_proveedores'),
  ('T-17',  'rechazada',              'anulada',                'hitl', 'Cierre administrativo'),
  ('T-18a', 'pendiente_conciliacion', 'anulada',                'hitl', 'Anulacion manual'),
  ('T-18b', 'conciliada_ok',          'anulada',                'hitl', 'Anulacion manual'),
  ('T-18c', 'pendiente_aprobacion',   'anulada',                'hitl', 'Anulacion manual'),
  ('T-18d', 'aprobada',               'anulada',                'hitl', 'Anulacion manual');


-- ---------------------------------------------------------------------
-- 4. Historial
-- ---------------------------------------------------------------------

create table public.historial_estado_factura (
  historial_id    bigint generated always as identity primary key,
  factura_id      text not null references public.facturas(factura_id),
  estado_origen   text not null,
  estado_destino  text not null,
  transicion_id   text,
  permitida       boolean not null,
  modo            text not null,
  actor           text,
  aplicacion      text,
  ocurrido_en     timestamptz not null default now()
);

comment on table public.historial_estado_factura is
  'En modo bloqueo solo registra las permitidas: las rechazadas provocan un error que deshace la transaccion entera, incluido este INSERT.';

create index idx_historial_factura
  on public.historial_estado_factura (factura_id, ocurrido_en desc);
create index idx_historial_no_permitidas
  on public.historial_estado_factura (ocurrido_en desc) where not permitida;


-- ---------------------------------------------------------------------
-- 5. Función y trigger
-- ---------------------------------------------------------------------

create or replace function public.fn_valida_transicion_factura()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_transicion text;
  v_modo       text;
begin
  if new.estado is not distinct from old.estado then
    return new;
  end if;

  select t.transicion_id into v_transicion
  from public.transiciones_estado_factura t
  where t.estado_origen = old.estado
    and t.estado_destino = new.estado
    and t.activa
  limit 1;

  select p.valor into v_modo
  from public.parametros_sistema p
  where p.clave = 'modo_validacion_estados';

  v_modo := coalesce(v_modo, 'aviso');

  if v_transicion is null and v_modo = 'bloqueo' then
    raise exception
      'Transicion de estado no permitida en factura %: % -> %.',
      new.factura_id, old.estado, new.estado
      using errcode = 'check_violation',
            hint = 'Si es legitima, anadirla a transiciones_estado_factura y a la matriz documental.';
  end if;

  insert into public.historial_estado_factura
    (factura_id, estado_origen, estado_destino, transicion_id, permitida, modo, actor, aplicacion)
  values
    (new.factura_id, old.estado, new.estado, v_transicion, v_transicion is not null, v_modo,
     session_user,
     coalesce(nullif(current_setting('application_name', true), ''), 'desconocida'));

  if v_transicion is null then
    raise warning
      'FinFlow modo aviso: transicion no prevista en factura %: % -> %.',
      new.factura_id, old.estado, new.estado;
  end if;

  return new;
end;
$$;

create trigger trg_valida_transicion_factura
  before update of estado on public.facturas
  for each row
  execute function public.fn_valida_transicion_factura();


-- ---------------------------------------------------------------------
-- 6. RLS. parametros_sistema no se expone a anon: contiene la palanca
--    que decide si el sistema valida o no.
-- ---------------------------------------------------------------------

alter table public.parametros_sistema          enable row level security;
alter table public.transiciones_estado_factura enable row level security;
alter table public.historial_estado_factura    enable row level security;

create policy "Allow anon read transiciones"
  on public.transiciones_estado_factura for select to anon using (true);
create policy "Allow anon read historial"
  on public.historial_estado_factura for select to anon using (true);

commit;
