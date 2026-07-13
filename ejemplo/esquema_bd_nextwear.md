# Esquema BD Nextwear — schema `public`

Proyecto Supabase `EBIS_TFM_RETAIL_NEXTWEAR` (ref `rnmidwhumdrpxulfsbjo`, `eu-west-3`). Extraído en vivo (MCP Supabase) el 2026-07-13; ampliado el mismo día tras aplicar la migración de `ejemplo/CLAUDE_CODE_mejoras.md` (ver `supabase/migrations/`). RLS activo en las 21 tablas (sin políticas: acceso solo vía `service_role` desde route handlers backend).

Cadena del proceso: **Proveedor → Pedido → Albarán → Factura → Asiento contable → Pago**, con `productos`, `centros_coste`, `tipos_cambio` y `cuentas_contables` como dimensiones, `casos_excepcion` para conciliación, `stock_movimientos` para inventario, `aprobaciones`/`comunicaciones` para HITL y `log_agentes` como base del Copiloto RAG.

**21 tablas + 2 vistas** (13 originales + 8 de la migración; vistas `stock_actual` + `asientos_descuadrados`).

---

## 1. Tablas y campos

### `maestro_proveedores` (10 filas) — PK `proveedor_id`
| Campo | Tipo | Notas |
|---|---|---|
| proveedor_id | text | PK |
| nif | text | nullable |
| razon_social | text | |
| pais | text | nullable |
| moneda_facturacion | text | check ∈ {EUR,USD,CNY} |
| canal_recepcion | text | check ∈ {email,portal_web,api}, nullable |
| portal_url | text | nullable |
| email_recepcion_facturas | text | nullable |
| categorias_habituales | text | nullable |
| forma_pago | text | nullable |
| iban | text | nullable |
| activo | boolean | default true |
| **iban_fecha_actualizacion** | date | nullable — cuándo se validó el IBAN por última vez *(migración)* |

### `productos` (20 filas) — PK `sku`
| Campo | Tipo | Notas |
|---|---|---|
| sku | text | PK |
| ean | text | nullable |
| descripcion | text | |
| talla | text | nullable |
| color | text | nullable |
| coleccion | text | nullable |
| categoria | text | nullable |
| coste_unitario | numeric | EUR, nullable |

### `centros_coste` (7 filas) — PK `centro_coste_id`
| Campo | Tipo | Notas |
|---|---|---|
| centro_coste_id | text | PK |
| nombre | text | |
| tipo | text | check ∈ {tienda_fisica,ecommerce,almacen_central} |
| pais | text | nullable |

### `tipos_cambio` (18 filas) — PK compuesta (`fecha`, `moneda_origen`)
| Campo | Tipo | Notas |
|---|---|---|
| fecha | date | PK |
| moneda_origen | text | PK, check ∈ {USD,CNY} |
| moneda_destino | text | default 'EUR' |
| tasa_cambio | numeric | |
| fuente | text | nullable |

Sin FKs entrantes/salientes declaradas (se cruza por `fecha`+`moneda_origen` desde `facturas.fecha_tipo_cambio`/`moneda_original`).

### `pedidos` (363 filas) — PK `pedido_id`
| Campo | Tipo | Notas |
|---|---|---|
| pedido_id | text | PK |
| proveedor_id | text | FK → maestro_proveedores, nullable |
| centro_coste_id | text | FK → centros_coste, nullable |
| fecha_pedido | date | |
| fecha_entrega_prevista | date | nullable |
| moneda | text | nullable |
| estado | text | check ∈ {abierto,parcialmente_recibido,recibido_completo,cerrado,cancelado}, nullable |

### `pedidos_lineas` (906 filas) — PK compuesta (`pedido_id`, `sku`)
| Campo | Tipo | Notas |
|---|---|---|
| pedido_id | text | PK, FK → pedidos |
| sku | text | PK, FK → productos |
| cantidad_pedida | integer | |
| precio_unitario_acordado | numeric | nullable |

### `albaranes` (369 filas) — PK `albaran_id`
| Campo | Tipo | Notas |
|---|---|---|
| albaran_id | text | PK |
| pedido_id | text | FK → pedidos, nullable |
| proveedor_id | text | FK → maestro_proveedores, nullable |
| centro_coste_id | text | FK → centros_coste, nullable |
| fecha_entrega | date | nullable |
| estado | text | check ∈ {registrado,conciliado,discrepancia}, nullable |

### `albaranes_lineas` (797 filas) — PK compuesta (`albaran_id`, `sku`)
| Campo | Tipo | Notas |
|---|---|---|
| albaran_id | text | PK, FK → albaranes |
| sku | text | PK, FK → productos |
| cantidad_entregada | integer | |

### `facturas` (334 filas) — PK `factura_id` — tabla central
| Campo | Tipo | Notas |
|---|---|---|
| factura_id | text | PK |
| numero_factura | text | nullable |
| serie | text | nullable |
| fecha_expedicion | date | nullable |
| fecha_vencimiento | date | nullable |
| proveedor_id | text | FK → maestro_proveedores, nullable |
| nif_proveedor | text | nullable |
| razon_social_proveedor | text | nullable |
| direccion_proveedor | text | nullable |
| nif_cliente | text | nullable |
| direccion_cliente | text | nullable |
| idioma_documento | text | check ∈ {es,en,zh}, nullable |
| moneda_original | text | check ∈ {EUR,USD,CNY}, nullable |
| base_imponible_original | numeric | nullable |
| cuota_iva_original | numeric | nullable |
| total_factura_original | numeric | nullable |
| tipo_cambio_aplicado | numeric | nullable |
| fecha_tipo_cambio | date | nullable |
| base_imponible_eur | numeric | **usar para sumas** |
| cuota_iva_eur | numeric | **usar para sumas** |
| total_factura_eur | numeric | **usar para sumas** |
| saldo_pendiente_eur | numeric | deuda real (tras NC/pagos) |
| forma_pago | text | nullable |
| iban_proveedor | text | nullable |
| pedido_id_ref | text | FK → pedidos, nullable |
| albaran_ids_ref | text | **texto libre**, puede listar varios albaranes |
| tipo_iva | numeric | nullable |
| es_nota_credito | boolean | default false |
| factura_original_id | text | FK → facturas (self), nullable |
| estado | text | check ∈ {pendiente_captura,pendiente_conciliacion,conciliada_ok,en_excepcion,pendiente_aprobacion,aprobada,rechazada,contabilizada,pagada,anulada} |
| motivo_excepcion | text | nullable |
| **documento_url** | text | ruta del PDF en Storage (`facturas-pdf`) *(migración)* |
| **hash_documento** | text | **UNIQUE**, nullable — idempotencia de ingesta *(migración)* |
| **confianza_extraccion** | numeric | 0–1, global *(migración)* |
| **campos_baja_confianza** | jsonb | `{"total":0.62,"nif":0.71}` *(migración)* |
| **confianza_tipo_documento** | numeric | 0–1, factura vs nota de crédito *(migración)* |
| **canal_entrada** | text | check ∈ {email,portal_web,api,manual} *(migración)* |
| **motor_extraccion** | text | `uipath_du` / `llm_vision` *(migración)* |

### `facturas_lineas` (804 filas) — PK compuesta (`factura_id`, `linea_id`)
| Campo | Tipo | Notas |
|---|---|---|
| factura_id | text | PK, FK → facturas |
| linea_id | text | PK |
| sku | text | FK → productos, nullable |
| centro_coste_id | text | FK → centros_coste, nullable |
| descripcion | text | nullable |
| cantidad | integer | nullable |
| precio_unitario_original | numeric | nullable |
| precio_unitario_eur | numeric | nullable |
| descuento_pct | numeric | nullable |
| total_linea_original | numeric | nullable |
| total_linea_eur | numeric | **usar para sumas** |
| tipo_iva_linea | numeric | nullable |
| flag_revision | boolean | default false |
| motivo_flag | text | nullable |
| **categoria_contable** | text | nullable *(migración, salida del Clasificador)* |
| **coleccion_asignada** | text | nullable *(migración)* |
| **confianza_clasificacion** | numeric | 0–1, nullable *(migración)* |
| **clasificado_por** | text | check ∈ {agente,humano} *(migración)* |
| **autoevaluacion_pasada** | boolean | nullable *(migración)* |

### `stock_movimientos` (797 filas) — PK `movimiento_id`
| Campo | Tipo | Notas |
|---|---|---|
| movimiento_id | text | PK |
| sku | text | FK → productos, nullable |
| centro_coste_id | text | FK → centros_coste, nullable |
| fecha | date | nullable |
| tipo_movimiento | text | check ∈ {entrada,salida}, nullable |
| cantidad | integer | nullable |
| valor_unitario_eur | numeric | nullable |
| referencia_documento | text | nullable |
| stock_resultante | integer | nullable |

### `casos_excepcion` (84 filas) — PK `caso_id` — **polimórfica**
| Campo | Tipo | Notas |
|---|---|---|
| caso_id | text | PK |
| factura_id | text | FK → facturas, nullable |
| linea_id | text | nullable (no FK real, referencia lógica a facturas_lineas) |
| albaran_id | text | FK → albaranes, nullable |
| pedido_id | text | FK → pedidos, nullable |
| tipo_excepcion | text | check ∈ {duplicado,importe_distinto,sin_pedido,nota_credito,entrega_parcial,salto_divisa,producto_no_reconocido,entrega_incompleta,mercancia_danada,**iban_no_coincide**}, nullable |
| descripcion | text | nullable |
| **estado_resolucion** | text | check ∈ {abierto,en_revision,resuelto_ok,resuelto_fraude,descartado}, default 'abierto' *(migración)* |
| **resuelto_por** | text | nullable — `agente` o id humano *(migración)* |
| **fecha_resolucion** | timestamptz | nullable *(migración)* |
| **notas_resolucion** | text | nullable *(migración)* |

Regla: exactamente **una** de `factura_id`/`albaran_id`/`pedido_id` rellena por fila — impuesta en BD por el constraint `chk_una_referencia`.
`iban_no_coincide`: se dispara cuando `facturas.iban_proveedor <> maestro_proveedores.iban`. Fraude o cambio de banco legítimo son indistinguibles desde los datos; la distinción vive en `estado_resolucion` tras verificación humana fuera de banda.

### `facturas_albaranes` (370 filas, backfill) — PK compuesta (`factura_id`, `albaran_id`) *(migración)*
Tabla puente factura↔albarán. Reemplaza como fuente de verdad al texto libre `facturas.albaran_ids_ref` (que se conserva, deprecado). Permite JOIN real para el matching a 3 bandas.
| Campo | Tipo | Notas |
|---|---|---|
| factura_id | text | PK, FK → facturas |
| albaran_id | text | PK, FK → albaranes |

### `aprobaciones` (0 filas) — PK `aprobacion_id` *(migración)*
| Campo | Tipo | Notas |
|---|---|---|
| aprobacion_id | text | PK |
| factura_id | text | FK → facturas |
| caso_id | text | FK → casos_excepcion, nullable |
| tipo | text | check ∈ {por_importe,por_excepcion} |
| canal | text | check ∈ {telegram,dashboard} |
| decision | text | check ∈ {pendiente,aprobada,rechazada}, default 'pendiente' |
| umbral_aplicado | numeric | nullable — umbral EUR que disparó la aprobación |
| aprobado_por | text | nullable |
| fecha_solicitud | timestamptz | default now() |
| fecha_decision | timestamptz | nullable |
| comentario | text | nullable |

### `comunicaciones` (0 filas) — PK `comunicacion_id` *(migración)*
| Campo | Tipo | Notas |
|---|---|---|
| comunicacion_id | text | PK |
| caso_id | text | FK → casos_excepcion, nullable |
| factura_id | text | FK → facturas, nullable |
| proveedor_id | text | FK → maestro_proveedores |
| canal | text | check ∈ {email,telegram} |
| direccion_destino | text | |
| asunto | text | nullable |
| cuerpo | text | texto generado por LLM |
| generado_por_llm | boolean | default true |
| fecha_envio | timestamptz | default now() |
| respuesta_recibida | boolean | default false |
| fecha_respuesta | timestamptz | nullable |

### `cuentas_contables` (8 filas, seed PGC) — PK `cuenta` *(migración)*
| Campo | Tipo | Notas |
|---|---|---|
| cuenta | text | PK — 600,607,621,628,472,400,572,708 |
| descripcion | text | |
| tipo | text | check ∈ {activo,pasivo,gasto,ingreso} |

### `asientos_contables` (0 filas) — PK `asiento_id` *(migración)*
Cabecera del asiento. Idempotencia real vía `clave_idempotencia UNIQUE NOT NULL` (no solo código).
| Campo | Tipo | Notas |
|---|---|---|
| asiento_id | text | PK |
| factura_id | text | FK → facturas |
| clave_idempotencia | text | **NOT NULL UNIQUE** |
| tipo_asiento | text | check ∈ {compra,rectificativo,pago} |
| fecha_asiento | date | |
| estado_registro | text | check ∈ {pendiente,registrado,error}, default 'pendiente' |
| intentos | integer | default 0 |
| ultimo_error | text | nullable |
| id_erp_externo | text | nullable |
| fecha_registro | timestamptz | nullable |

### `asientos_lineas` (0 filas) — PK compuesta (`asiento_id`, `linea_num`) *(migración)*
Debe cuadrar: `sum(debe_eur) = sum(haber_eur)` por asiento (control vía vista `asientos_descuadrados`).
| Campo | Tipo | Notas |
|---|---|---|
| asiento_id | text | PK, FK → asientos_contables |
| linea_num | integer | PK |
| cuenta | text | FK → cuentas_contables |
| centro_coste_id | text | FK → centros_coste, nullable |
| debe_eur | numeric | default 0 |
| haber_eur | numeric | default 0 |
| concepto | text | nullable |

### `pagos` (0 filas) — PK `pago_id` *(migración)*
Cancelación de la obligación registrada en `asientos_contables` (400 contra 572). Relación 1:N con `facturas` (pagos parciales). Notas de crédito no generan fila aquí.
| Campo | Tipo | Notas |
|---|---|---|
| pago_id | text | PK |
| factura_id | text | FK → facturas |
| asiento_id | text | FK → asientos_contables, nullable |
| fecha_pago | date | nullable = programado, no ejecutado |
| fecha_vencimiento | date | copiada de facturas, permite DPO sin JOIN |
| importe_original | numeric | |
| moneda | text | check ∈ {EUR,USD,CNY} |
| importe_eur | numeric | **usar para sumas** |
| es_pago_parcial | boolean | default false |
| iban_origen | text | cuenta de Nextwear |
| iban_destino | text | |
| referencia_bancaria | text | nullable |
| medio_pago | text | check ∈ {transferencia,confirming,domiciliacion} |
| estado_pago | text | check ∈ {programado,retenido,ejecutado,rechazado,anulado} |
| motivo_retencion | text | nullable |

### `log_agentes` (0 filas) — PK `log_id` *(migración)*
Trazabilidad de decisiones de n8n/Make/Copiloto (Orchestrator ya cubre UiPath) — base de conocimiento del Copiloto RAG.
| Campo | Tipo | Notas |
|---|---|---|
| log_id | text | PK |
| agente | text | check ∈ {captura,conciliador,clasificador,copiloto,erp} |
| factura_id | text | FK → facturas, nullable |
| caso_id | text | FK → casos_excepcion, nullable |
| accion | text | |
| entrada_resumen | text | nullable |
| salida_resumen | text | nullable |
| modelo_llm | text | nullable |
| tokens_entrada | integer | nullable |
| tokens_salida | integer | nullable |
| duracion_ms | integer | nullable |
| resultado | text | check ∈ {ok,error,escalado} |
| creado_en | timestamptz | default now() |

### `asientos_descuadrados` (VISTA) *(migración)*
`asiento_id`, `total_debe`, `total_haber` — asientos donde `sum(debe) <> sum(haber)`. Control de calidad pintable directamente en dashboard.

### `stock_actual` (VISTA, solo lectura)
| Campo | Tipo |
|---|---|
| sku | text |
| centro_coste_id | text |
| cantidad_disponible | integer |
| fecha_ultima_actualizacion | date |

No trae valor monetario: para valorar cruzar con `productos.coste_unitario` o `stock_movimientos.valor_unitario_eur`. No escribir en ella (se deriva de `stock_movimientos`).

---

## 2. Relaciones (FKs) y qué permiten extraer

```
maestro_proveedores 1───N pedidos
maestro_proveedores 1───N albaranes
maestro_proveedores 1───N facturas

centros_coste 1───N pedidos
centros_coste 1───N albaranes
centros_coste 1───N facturas_lineas
centros_coste 1───N stock_movimientos

pedidos 1───N pedidos_lineas
pedidos 1───N albaranes           (albaranes.pedido_id)
pedidos 1───N facturas            (facturas.pedido_id_ref)
pedidos 1───N casos_excepcion     (casos_excepcion.pedido_id)

albaranes 1───N albaranes_lineas
albaranes 1───N casos_excepcion   (casos_excepcion.albaran_id)
                                  ⚠ facturas.albaran_ids_ref es TEXTO libre (posibles múltiples ids), NO FK real

facturas 1───N facturas_lineas
facturas 1───N casos_excepcion    (casos_excepcion.factura_id)
facturas 1───1 facturas           (factura_original_id, self-FK: nota de crédito → factura rectificada)

productos 1───N pedidos_lineas
productos 1───N albaranes_lineas
productos 1───N facturas_lineas
productos 1───N stock_movimientos

-- migración --
facturas 1───N facturas_albaranes ── N───1 albaranes   (JOIN real, sustituye albaran_ids_ref texto libre)
facturas 1───N aprobaciones
facturas 1───N comunicaciones
facturas 1───N asientos_contables
facturas 1───N pagos
facturas 1───N log_agentes
casos_excepcion 1───N aprobaciones
casos_excepcion 1───N comunicaciones
casos_excepcion 1───N log_agentes
maestro_proveedores 1───N comunicaciones
asientos_contables 1───N asientos_lineas
asientos_contables 1───N pagos          (asiento de compra → cancelación en pagos)
cuentas_contables 1───N asientos_lineas
centros_coste 1───N asientos_lineas
```

### Qué permite cada relación (consultas típicas)

- **Proveedor → Pedido → Albarán → Factura**: seguir el ciclo completo de un proveedor (`proveedor_id`) para conciliar cantidad pedida vs. entregada vs. facturada. `pedidos.pedido_id` conecta con `albaranes.pedido_id` y `facturas.pedido_id_ref`; el vínculo factura↔albarán es débil (texto en `albaran_ids_ref`), requiere parseo si se quiere JOIN real.
- **Conciliación a 3 bandas**: `pedidos_lineas` (cantidad_pedida, precio acordado) vs `albaranes_lineas` (cantidad_entregada) vs `facturas_lineas` (cantidad, precio, total) por `sku` — permite detectar discrepancias de cantidad/precio.
- **Excepciones**: `casos_excepcion` polimórfica enlaza a factura, albarán o pedido según `tipo_excepcion`; JOIN condicional según qué FK está rellena.
- **Gasto por centro de coste**: `facturas_lineas.centro_coste_id` → `centros_coste` (tienda física vs ecommerce vs almacén).
- **Gasto por proveedor/moneda**: `facturas.proveedor_id` → `maestro_proveedores.moneda_facturacion`; cruzar `facturas.moneda_original` + `fecha_tipo_cambio` con `tipos_cambio` para auditar el tipo aplicado.
- **Notas de crédito**: `facturas.factura_original_id` autorreferencia a la factura rectificada; `es_nota_credito=true` con importes negativos, se restan directamente al sumar `total_factura_eur`.
- **Stock e inventario**: `stock_movimientos` (histórico entradas/salidas) y vista `stock_actual` (snapshot) por `sku`+`centro_coste_id`; valorar cruzando con `productos.coste_unitario`. Cruzar `stock_actual` con `pedidos`/`pedidos_lineas` en estado abierto/parcial para previsión de reposición.
- **Catálogo**: `productos.sku` es la dimensión común a pedidos_lineas, albaranes_lineas, facturas_lineas y stock_movimientos — permite analizar por categoría/colección/talla/color en cualquier tabla de líneas.

---

## 3. Reglas de negocio ligadas al esquema

1. Sumas de dinero siempre en columnas `_eur`; nunca sumar `_original` de monedas distintas.
2. `saldo_pendiente_eur` = deuda real pendiente (no `total_factura_eur`).
3. Notas de crédito ya vienen con importes negativos — sumar directo resta.
4. `stock_actual` es vista, no tabla — no escribir, solo consultar.
5. `casos_excepcion`: solo una de las 3 FKs rellena por fila.
6. `facturas.albaran_ids_ref` es texto libre y queda **deprecado**; la fuente de verdad para factura↔albarán es `facturas_albaranes` (migración, 370 filas backfilleadas, 0 huérfanos).
7. `asientos_lineas`: un asiento debe cuadrar (`sum(debe_eur) = sum(haber_eur)`); vigilar via vista `asientos_descuadrados`.
8. `asientos_contables.clave_idempotencia` es UNIQUE NOT NULL — la idempotencia del registro contable vive en la BD, no solo en código.
9. `pagos` no es control antifraude (eso vive en la conciliación IBAN); es el cierre contable de la obligación registrada en `asientos_contables`.
