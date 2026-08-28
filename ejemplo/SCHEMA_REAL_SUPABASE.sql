-- ============================================================================
-- Schema REAL de Supabase (proyecto rnmidwhumdrpxulfsbjo), extraído en vivo de
-- information_schema.columns + pg_constraint el 2026-08-28.
-- NO es una migración a ejecutar: es referencia exacta de columnas, tipos,
-- nullability, defaults, PK/FK y CHECK constraints, para que UiPath no falle
-- por nombre de columna o valor de enum inventado.
-- ============================================================================

-- ── maestro_proveedores ─────────────────────────────────────────────────────
CREATE TABLE maestro_proveedores (
  proveedor_id              text PRIMARY KEY,
  nif                       text,
  razon_social              text NOT NULL,
  pais                      text,
  moneda_facturacion        text NOT NULL
    CHECK (moneda_facturacion = ANY (ARRAY['EUR','USD','CNY'])),
  canal_recepcion           text
    CHECK (canal_recepcion = ANY (ARRAY['email','portal_web','api'])),
  portal_url                text,
  email_recepcion_facturas  text,
  categorias_habituales     text,
  forma_pago                text,
  iban                      text,
  activo                    boolean DEFAULT true,
  iban_fecha_actualizacion  date,
  direccion_sede            text
);

-- ── productos ────────────────────────────────────────────────────────────────
-- Sin CHECK constraints: categoria/coleccion/talla/color son texto libre.
CREATE TABLE productos (
  sku             text PRIMARY KEY,
  ean             text,
  descripcion     text NOT NULL,
  talla           text,
  color           text,
  coleccion       text,
  categoria       text,
  coste_unitario  numeric(10,2)
);

-- ── tipos_cambio ─────────────────────────────────────────────────────────────
-- PK compuesta (fecha, moneda_origen). moneda_destino SIEMPRE 'EUR' (default).
-- moneda_origen solo admite USD/CNY (nunca EUR, porque el destino ya es EUR).
CREATE TABLE tipos_cambio (
  fecha           date NOT NULL,
  moneda_origen   text NOT NULL
    CHECK (moneda_origen = ANY (ARRAY['USD','CNY'])),
  moneda_destino  text NOT NULL DEFAULT 'EUR',
  tasa_cambio     numeric(10,6) NOT NULL,
  fuente          text,
  PRIMARY KEY (fecha, moneda_origen)
);

-- ── facturas ─────────────────────────────────────────────────────────────────
CREATE TABLE facturas (
  factura_id                 text PRIMARY KEY,
  numero_factura              text,
  serie                       text,
  fecha_expedicion            date,
  fecha_vencimiento           date,
  proveedor_id                text REFERENCES maestro_proveedores(proveedor_id),
  nif_proveedor                text,
  razon_social_proveedor       text,
  direccion_proveedor          text,
  nif_cliente                  text,
  direccion_cliente            text,
  razon_social_cliente         text,
  idioma_documento             text
    CHECK (idioma_documento = ANY (ARRAY['es','en','zh'])),
  moneda_original               text
    CHECK (moneda_original = ANY (ARRAY['EUR','USD','CNY'])),
  base_imponible_original       numeric(12,2),
  cuota_iva_original            numeric(12,2),
  total_factura_original        numeric(12,2),
  tipo_cambio_aplicado          numeric(10,6),
  fecha_tipo_cambio             date,
  base_imponible_eur             numeric(12,2),
  cuota_iva_eur                  numeric(12,2),
  total_factura_eur               numeric(12,2),
  saldo_pendiente_eur              numeric(12,2),
  forma_pago                       text,
  iban_proveedor                   text,
  pedido_id_ref                    text REFERENCES pedidos(pedido_id),
  albaran_ids_ref                  text,
  tipo_iva                          numeric(5,2),
  es_nota_credito                   boolean DEFAULT false,
  factura_original_id               text REFERENCES facturas(factura_id),
  estado                             text
    CHECK (estado = ANY (ARRAY[
      'pendiente_captura','pendiente_conciliacion','conciliada_ok',
      'en_excepcion','pendiente_aprobacion','aprobada','rechazada',
      'contabilizada','pagada','anulada'
    ])),
  motivo_excepcion                  text,
  documento_url                     text,
  hash_documento                    text UNIQUE,
  confianza_extraccion              numeric,
  campos_baja_confianza             jsonb,
  confianza_tipo_documento          numeric,
  canal_entrada                     text
    CHECK (canal_entrada IS NULL OR canal_entrada = ANY (ARRAY['email','portal_web','api','manual'])),
  motor_extraccion                  text,
  id_fiscal_extranjero              text,
  tipo_id_fiscal                    text
    CHECK (tipo_id_fiscal IS NULL OR tipo_id_fiscal = ANY (ARRAY['nif','uscc','vat','otro'])),
  swift_bic                         text,
  banco_corresponsal                text,
  incoterm                          text
    CHECK (incoterm IS NULL OR incoterm = ANY (ARRAY['EXW','FOB','CIF','CFR','DDP','DAP','FCA'])),
  pais_origen_mercancia             text,
  regimen_iva                       text
    CHECK (regimen_iva IS NULL OR regimen_iva = ANY (ARRAY['nacional','exportacion','intracomunitario']))
);
-- Nota: "canal_entrada" en facturas SÍ acepta 'manual' además de email/portal_web/api
-- (a diferencia de maestro_proveedores.canal_recepcion, que NO admite 'manual').

-- ── facturas_lineas ──────────────────────────────────────────────────────────
-- PK compuesta (factura_id, linea_id).
CREATE TABLE facturas_lineas (
  factura_id                text NOT NULL REFERENCES facturas(factura_id),
  linea_id                  text NOT NULL,
  sku                       text REFERENCES productos(sku),
  centro_coste_id           text REFERENCES centros_coste(centro_coste_id),
  descripcion               text,
  cantidad                  integer,
  precio_unitario_original  numeric(10,2),
  precio_unitario_eur       numeric(10,2),
  descuento_pct             numeric(5,2),
  total_linea_original      numeric(12,2),
  total_linea_eur           numeric(12,2),
  tipo_iva_linea            numeric(5,2),
  flag_revision             boolean DEFAULT false,
  motivo_flag               text,
  categoria_contable        text,
  coleccion_asignada        text,
  confianza_clasificacion   numeric,
  clasificado_por           text
    CHECK (clasificado_por IS NULL OR clasificado_por = ANY (ARRAY['agente','humano'])),
  autoevaluacion_pasada     boolean,
  codigo_hs                 text,
  PRIMARY KEY (factura_id, linea_id)
);

-- ── casos_excepcion ──────────────────────────────────────────────────────────
-- Polimórfica: chk_una_referencia obliga a que EXACTAMENTE UNA de
-- factura_id / albaran_id / pedido_id esté rellena (linea_id no cuenta).
-- uq_caso_factura_tipo: no puede haber dos casos con mismo (factura_id, tipo_excepcion).
CREATE TABLE casos_excepcion (
  caso_id                        text PRIMARY KEY,
  factura_id                     text REFERENCES facturas(factura_id),
  linea_id                       text,
  albaran_id                     text REFERENCES albaranes(albaran_id),
  pedido_id                      text REFERENCES pedidos(pedido_id),
  tipo_excepcion                 text
    CHECK (tipo_excepcion IS NULL OR tipo_excepcion = ANY (ARRAY[
      'duplicado','importe_distinto','sin_pedido','nota_credito',
      'entrega_parcial','salto_divisa','entrega_incompleta','iban_no_coincide'
    ])),
  descripcion                    text,
  estado_resolucion              text DEFAULT 'abierto'
    CHECK (estado_resolucion IS NULL OR estado_resolucion = ANY (ARRAY[
      'abierto','en_revision','resuelto_ok','resuelto_fraude','descartado'
    ])),
  resuelto_por                   text,
  fecha_resolucion               timestamptz,
  notas_resolucion               text,
  requiere_intervencion_humana   boolean NOT NULL DEFAULT true,
  factura_relacionada_id         text REFERENCES facturas(factura_id),
  CONSTRAINT chk_una_referencia CHECK (
    (factura_id IS NOT NULL)::int + (albaran_id IS NOT NULL)::int + (pedido_id IS NOT NULL)::int = 1
  ),
  CONSTRAINT uq_caso_factura_tipo UNIQUE (factura_id, tipo_excepcion)
);
