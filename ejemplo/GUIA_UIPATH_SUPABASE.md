# Guía: robot UiPath sube facturas a Supabase

Doc pa' Claude Code dentro UiPath. Explica conexión + qué campo va en qué tabla/columna.

## 1. Conexión

- Backend real: Postgres detrás Supabase. Dos rutas pa' robot:
  - **REST API Supabase** (`https://rnmidwhumdrpxulfsbjo.supabase.co/rest/v1/...`), header `apikey` + `Authorization: Bearer <SERVICE_ROLE_KEY>`. Método HTTP Request activity normal, `Content-Type: application/json`, `Prefer: return=representation`.
  - **Conexión directa Postgres** (si UiPath usa Database activities / conector DB): host del pooler Supabase, puerto 5432/6543, credenciales de conexión (no confundir con anon key).
- **Usar SIEMPRE service role key**, nunca anon key, pa' escritura (RLS bloquea anon en escritura). Guardar key en UiPath Orchestrator Asset (credential type), NUNCA hardcodear en workflow.
- RLS activo en todas tablas → si INSERT falla con 401/403, prob RLS bloqueando rol usado. Verificar policy permite INSERT pa' service_role.
- project ref: `rnmidwhumdrpxulfsbjo`, región `eu-west-3`.

## 2. Orden de inserción — respetar FK

Factura depende otras tablas ya existir. Orden correcto:

1. `maestro_proveedores` — proveedor debe existir ya (`proveedor_id` FK).
2. `pedidos` / `albaranes` — si factura referencia pedido/albarán, deben existir antes.
3. `facturas` — cabecera factura (INSERT uno por factura).
4. `facturas_lineas` — líneas factura (INSERT uno por línea, requiere `factura_id` ya insertado).
5. `facturas_albaranes` — tabla puente si factura vincula a uno o más albaranes (opcional, además de campo texto `albaran_ids_ref`).

No insertar líneas antes cabecera — FK `facturas_lineas.factura_id → facturas.factura_id` falla si no.

## 3. Tabla `facturas` (cabecera) — mapeo campo por campo

PK: `factura_id` (string, generar UUID o id propio, robot debe proveerlo).

| Columna Supabase | Qué va aquí | Notas |
|---|---|---|
| `factura_id` | ID único factura | Generar antes insert (UUID) |
| `numero_factura` | Nº factura tal cual doc (ej "F-2026-00342") | — |
| `serie` | Serie factura si aplica | opcional |
| `proveedor_id` | FK a `maestro_proveedores` | debe existir ya |
| `pedido_id_ref` | FK a `pedidos`, si factura liga pedido | opcional |
| `albaran_ids_ref` | texto libre, puede listar varios albaranes | ej "ALB-001,ALB-002" |
| `fecha_expedicion` | fecha emisión factura | formato ISO date |
| `fecha_vencimiento` | fecha vencimiento pago | ISO date |
| `moneda_original` | EUR / USD / CNY | según moneda doc origen |
| `base_imponible_original` | base imponible en moneda original | — |
| `cuota_iva_original` | IVA en moneda original | — |
| `total_factura_original` | total en moneda original | — |
| `tipo_cambio_aplicado` | tasa cambio usada si moneda ≠ EUR | cruzar con `tipos_cambio` |
| `fecha_tipo_cambio` | fecha de esa tasa | auditoría |
| `base_imponible_eur` | base imponible convertida EUR | **calcular robot, NUNCA dejar null si hay importe** |
| `cuota_iva_eur` | IVA convertido EUR | ídem |
| `total_factura_eur` | total convertido EUR | ídem — regla negocio: TODO KPI usa `_eur`, nunca mezclar `_original` |
| `saldo_pendiente_eur` | saldo pendiente tras pagos/NC | al crear factura = `total_factura_eur` normalmente |
| `tipo_iva` | % IVA general factura | — |
| `regimen_iva` | régimen fiscal aplicable | — |
| `es_nota_credito` | true si es NC | si true, importes van **negativos** |
| `factura_original_id` | si es NC, factura que rectifica | FK a `facturas.factura_id` |
| `estado` | estado ciclo factura | normalmente arranca en `pendiente_captura` cuando lo sube robot |
| `motivo_excepcion` | texto si ya se detecta excepción en captura | opcional |
| `nif_proveedor` / `razon_social_proveedor` / `direccion_proveedor` | datos fiscales proveedor extraídos doc | — |
| `nif_cliente` / `razon_social_cliente` / `direccion_cliente` | datos Nextwear (cliente) | valor fijo Nextwear normalmente |
| `iban_proveedor` / `swift_bic` / `banco_corresponsal` | datos bancarios pago | si constan en doc |
| `forma_pago` | transferencia/etc | — |
| `incoterm` | si factura internacional | opcional |
| `pais_origen_mercancia` | país origen (proveedores CN etc) | opcional |
| `idioma_documento` | idioma detectado doc | — |
| `canal_entrada` | email/portal_web/api — cómo llegó | cruza con `maestro_proveedores.canal_recepcion` |
| `documento_url` | link/path al PDF original | pa' trazabilidad |
| `hash_documento` | hash pa' detectar duplicados | robot calcula, sirve pa' caso `duplicado` |
| `motor_extraccion` | qué OCR/DU usó (Document Understanding UiPath) | ej "UiPath DU v2" |
| `confianza_extraccion` | score confianza global extracción | 0-1, del DU |
| `confianza_tipo_documento` | score confianza clasificación tipo doc | — |
| `campos_baja_confianza` | JSON campos con baja confianza | pa' flag revisión humana |
| `tipo_id_fiscal` / `id_fiscal_extranjero` | tipo/valor ID fiscal si extranjero | proveedores CN/US |

## 4. Tabla `facturas_lineas` (detalle) — una fila por línea

PK compuesta: (`factura_id`, `linea_id`).

| Columna | Qué va | Notas |
|---|---|---|
| `factura_id` | mismo ID cabecera | FK obligatoria |
| `linea_id` | ID único línea | UUID o correlativo por factura |
| `sku` | código producto | FK a `productos.sku`, debe existir en catálogo |
| `descripcion` | texto línea tal cual doc | — |
| `cantidad` | unidades | — |
| `precio_unitario_original` | precio unitario moneda original | — |
| `precio_unitario_eur` | precio unitario convertido EUR | calcular con tasa cambio |
| `descuento_pct` | % descuento línea si aplica | — |
| `total_linea_original` | total línea moneda original | — |
| `total_linea_eur` | total línea EUR | usar pa' sumas/KPI |
| `tipo_iva_linea` | % IVA específico línea | puede diferir del general |
| `centro_coste_id` | FK a `centros_coste` | a qué tienda/almacén imputa gasto |
| `categoria_contable` | categoría contable asignada | — |
| `coleccion_asignada` | colección producto si aplica | cruza `productos.coleccion` |
| `clasificado_por` | quién/qué clasificó (robot/humano/IA) | trazabilidad |
| `confianza_clasificacion` | score confianza clasificación línea | — |
| `codigo_hs` | código arancelario si importación | proveedores extranjeros |
| `flag_revision` | true si línea necesita revisión humana | regla negocio: debe ser visible/filtrable |
| `motivo_flag` | por qué se marcó revisión | texto libre |
| `autoevaluacion_pasada` | true/false si pasó autocheck robot | — |

## 5. Reglas negocio — robot debe cumplir SIEMPRE

1. **Nunca mezclar monedas en sumas.** Todo cálculo usa columnas `_eur`. Si moneda_original ≠ EUR, robot busca tasa en `tipos_cambio` (por `fecha` + `moneda_origen`) y calcula `_eur` = `_original` × tasa. Nunca dejar `_eur` null si hay `_original`.
2. **Notas de crédito → importes negativos.** Si `es_nota_credito = true`, todos importes (`base_imponible_eur`, `total_factura_eur`, etc) van con signo negativo.
3. **No tocar `stock_actual`** — es vista, solo lectura, no forma parte flujo factura.
4. **Nunca UPDATE/DELETE fuera flujo definido** — dashboard consumidor es solo lectura; robot solo hace INSERT (y transición controlada de `estado` en su propio flujo AP, no libre).
5. `sku` en `facturas_lineas` DEBE existir ya en `productos` (constraint FK real, insert falla si no) — si robot detecta SKU no reconocido, no inventar fila: no hay tipo_excepcion dedicado para esto en el enum real (ver §6), usar `motivo_flag`/`flag_revision=true` en la línea y dejar el caso para revisión humana manual.
6. Si detecta duplicado (mismo `hash_documento`, que tiene constraint UNIQUE real, o mismo nº factura + proveedor), no insertar dos veces — crear caso `tipo_excepcion = 'duplicado'` en `casos_excepcion` en vez.

## 6. Tabla `casos_excepcion` (si robot detecta problema al captar)

Polimórfica — constraint real `chk_una_referencia` obliga rellenar **exactamente una** de `factura_id`/`albaran_id`/`pedido_id` (+ opcional `linea_id`, no cuenta pa' la regla). `tipo_excepcion` (enum real, CHECK en BD — usar solo estos valores, cualquier otro falla el insert):
`duplicado`, `importe_distinto`, `sin_pedido`, `nota_credito`, `entrega_parcial`, `salto_divisa`, `entrega_incompleta`, `iban_no_coincide`.

**`entrega_parcial` es valor muerto** — el CHECK lo admite pero 0 filas del dataset real lo usan. Pa' albarán con cantidad entregada menor a la pedida, usar **siempre `entrega_incompleta`** (25 filas reales, siempre con `albaran_id` relleno, nunca `factura_id`/`pedido_id`). No usar `entrega_parcial` en el robot aunque técnicamente pase el CHECK.

Constraint `uq_caso_factura_tipo` — no puede haber dos casos con mismo (`factura_id`, `tipo_excepcion`), insert duplicado falla.

## 7. Checklist rápido pre-vuelo

- [ ] Service role key en Orchestrator Asset, no en workflow
- [ ] Proveedor existe en `maestro_proveedores` antes insert factura
- [ ] SKUs de líneas existen en `productos`
- [ ] Tasa cambio buscada en `tipos_cambio` si moneda ≠ EUR, `_eur` calculado
- [ ] Orden insert: cabecera `facturas` → luego `facturas_lineas`
- [ ] Hash/nº factura chequeado contra duplicado antes insert
- [ ] NC con importes negativos
- [ ] `estado` inicial correcto (`pendiente_captura` o el que defina flujo AP)
