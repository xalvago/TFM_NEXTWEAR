-- Bloque 03: human-in-the-loop y comunicaciones
create table public.aprobaciones (
  aprobacion_id   text primary key,
  factura_id      text not null references public.facturas(factura_id),
  caso_id         text references public.casos_excepcion(caso_id),
  tipo            text check (tipo in ('por_importe','por_excepcion')),
  canal           text check (canal in ('telegram','dashboard')),
  decision        text default 'pendiente' check (decision in ('pendiente','aprobada','rechazada')),
  umbral_aplicado numeric,
  aprobado_por    text,
  fecha_solicitud timestamptz default now(),
  fecha_decision  timestamptz,
  comentario      text
);

create table public.comunicaciones (
  comunicacion_id     text primary key,
  caso_id             text references public.casos_excepcion(caso_id),
  factura_id          text references public.facturas(factura_id),
  proveedor_id        text not null references public.maestro_proveedores(proveedor_id),
  canal               text check (canal in ('email','telegram')),
  direccion_destino   text,
  asunto              text,
  cuerpo              text,
  generado_por_llm    boolean default true,
  fecha_envio         timestamptz default now(),
  respuesta_recibida  boolean default false,
  fecha_respuesta     timestamptz
);
