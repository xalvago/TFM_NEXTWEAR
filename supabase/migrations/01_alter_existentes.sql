-- Bloque 01: ampliacion de tablas existentes
-- facturas: resultado de la captura (UiPath)
alter table public.facturas
  add column if not exists documento_url             text,
  add column if not exists hash_documento            text,
  add column if not exists confianza_extraccion      numeric,
  add column if not exists campos_baja_confianza     jsonb,
  add column if not exists confianza_tipo_documento  numeric,
  add column if not exists canal_entrada             text,
  add column if not exists motor_extraccion          text;

alter table public.facturas
  add constraint facturas_hash_documento_key unique (hash_documento);

alter table public.facturas
  add constraint facturas_canal_entrada_check
  check (canal_entrada is null or canal_entrada in ('email','portal_web','api','manual'));

create index if not exists idx_facturas_confianza
  on public.facturas (confianza_extraccion);

-- casos_excepcion: resolucion del caso
alter table public.casos_excepcion
  add column if not exists estado_resolucion text default 'abierto',
  add column if not exists resuelto_por      text,
  add column if not exists fecha_resolucion  timestamptz,
  add column if not exists notas_resolucion  text;

alter table public.casos_excepcion
  add constraint casos_excepcion_estado_resolucion_check
  check (estado_resolucion is null or estado_resolucion in
    ('abierto','en_revision','resuelto_ok','resuelto_fraude','descartado'));

alter table public.casos_excepcion
  drop constraint casos_excepcion_tipo_excepcion_check;

alter table public.casos_excepcion
  add constraint casos_excepcion_tipo_excepcion_check
  check (tipo_excepcion is null or tipo_excepcion in (
    'duplicado','importe_distinto','sin_pedido','nota_credito','entrega_parcial',
    'salto_divisa','producto_no_reconocido','entrega_incompleta','mercancia_danada',
    'iban_no_coincide'
  ));

-- maestro_proveedores
alter table public.maestro_proveedores
  add column if not exists iban_fecha_actualizacion date;

-- facturas_lineas: salida del Clasificador
alter table public.facturas_lineas
  add column if not exists categoria_contable       text,
  add column if not exists coleccion_asignada        text,
  add column if not exists confianza_clasificacion   numeric,
  add column if not exists clasificado_por           text,
  add column if not exists autoevaluacion_pasada     boolean;

alter table public.facturas_lineas
  add constraint facturas_lineas_clasificado_por_check
  check (clasificado_por is null or clasificado_por in ('agente','humano'));
