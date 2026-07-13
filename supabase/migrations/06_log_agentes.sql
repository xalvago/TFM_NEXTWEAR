-- Bloque 06: log de decisiones de agentes
create table public.log_agentes (
  log_id          text primary key,
  agente          text check (agente in ('captura','conciliador','clasificador','copiloto','erp')),
  factura_id      text references public.facturas(factura_id),
  caso_id         text references public.casos_excepcion(caso_id),
  accion          text,
  entrada_resumen text,
  salida_resumen  text,
  modelo_llm      text,
  tokens_entrada  integer,
  tokens_salida   integer,
  duracion_ms     integer,
  resultado       text check (resultado in ('ok','error','escalado')),
  creado_en       timestamptz default now()
);
