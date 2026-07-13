# FinFlow — Migración incremental de la BD (brief para Claude Code)

Proyecto Supabase: `EBIS_TFM_RETAIL_NEXTWEAR` · ref `rnmidwhumdrpxulfsbjo` · región `eu-west-3`
Objetivo: ampliar el esquema existente para que soporte **el proceso completo** (captura → conciliación → clasificación → HITL → reclamación → contabilización → pago), no solo la conciliación.

Versión 2 — revisada: se elimina la tabla `documentos` (la trazabilidad del OCR vive en UiPath Orchestrator; en la BD solo quedan los campos que el resto del sistema necesita leer).

---

## 0. Reglas de oro (leer antes de tocar nada)

1. **NO ejecutar ningún `CREATE TABLE` de un esquema desde cero.** Las 13 tablas existentes ya están pobladas (334 facturas, 363 pedidos, 369 albaranes, 84 casos de excepción). Esta es una **migración incremental**: solo `ALTER` y `CREATE TABLE` de tablas nuevas.
2. **No borrar ni truncar nada.** Ninguna sentencia `DROP TABLE`, `TRUNCATE` ni `DELETE` sobre tablas existentes.
3. **El esquema no usa tipos `ENUM` de Postgres**, usa `text` + `CHECK`. Mantener ese patrón por coherencia.
4. **RLS está activo en todas las tablas.** Toda tabla nueva debe activar RLS y replicar la política de las existentes (revisar `pg_policies` antes de crear las nuevas y copiar el patrón).
5. **Patrón de doble columna monetaria**: todo importe lleva `*_original` + `moneda` + `*_eur`. Las sumas siempre sobre `_eur`.
6. **Ejecutar por bloques numerados.** El SQL Editor de Supabase tiene límite de tamaño: partir en ficheros `01_...sql`, `02_...sql`, etc. y ejecutarlos en orden.
7. **Parar y reportar** al final de cada bloque antes de pasar al siguiente.

---

## 1. Contexto: qué existe y qué falta

Existen 13 tablas + la vista `stock_actual`: `maestro_proveedores`, `productos`, `centros_coste`, `tipos_cambio`, `pedidos`, `pedidos_lineas`, `albaranes`, `albaranes_lineas`, `facturas`, `facturas_lineas`, `stock_movimientos`, `casos_excepcion`.

Cubren hasta la conciliación. **No hay dónde escribir**: el resultado de la extracción OCR, la categoría contable del Clasificador, las aprobaciones humanas, las reclamaciones enviadas, los asientos contables, los pagos, ni el log de decisiones de los agentes.

Esta migración añade **7 tablas nuevas** y amplía 3 existentes.

### Decisión de arquitectura sobre el OCR (importante)

El flujo real es: **UiPath descarga el PDF → lo procesa (Document Understanding) → sube a Supabase el PDF y el resultado ya extraído y clasificado.**

Por tanto **NO se crea una tabla `documentos`**. El diario de ejecución del robot (reintentos, timeouts del portal, errores de selector, capturas del fallo) se queda en **UiPath Orchestrator**, que ya lo hace. En Supabase solo entra lo que **n8n, el dashboard y el Copiloto necesitan leer**, y eso son 7 columnas nuevas en `facturas` (bloque 01).

---

## 2. Bloque 01 — Ampliación de tablas existentes

### 2.1 `facturas` — resultado de la captura (UiPath)

Relación 1:1 estricta: el PDF y la fila de `facturas` nacen en el mismo momento (los escribe UiPath a la vez). Por eso son columnas, no una tabla aparte.

| Campo | Tipo | Notas |
|---|---|---|
| `documento_url` | text | Ruta del PDF en Supabase Storage. **Imprescindible**: el dashboard abre la factura original junto a la conciliación |
| `hash_documento` | text | **UNIQUE**. Idempotencia de la ingesta (ver abajo) |
| `confianza_extraccion` | numeric | 0–1, global. Lo lee n8n para decidir si escala a revisión |
| `campos_baja_confianza` | jsonb | `{"total": 0.62, "nif": 0.71}` — la *«puntuación de confianza por campo»* de la propuesta. Lo lee el Copiloto para explicar un bloqueo |
| `confianza_tipo_documento` | numeric | 0–1. Confianza en la clasificación factura vs nota de crédito |
| `canal_entrada` | text | `CHECK ∈ {email, portal_web, api, manual}` |
| `motor_extraccion` | text | `uipath_du` / `llm_vision` — permite comparar motores en la sección de resultados |

**Por qué el `UNIQUE` sobre `hash_documento`:** las facturas llegan por dos vías (email y portal), y el proceso de UiPath puede reintentarse tras una caída. En ambos casos el mismo PDF puede subirse dos veces → dos filas en `facturas` → el Conciliador lo marca como duplicado → correo de reclamación al proveedor por un bug propio. El `UNIQUE` hace que el segundo `INSERT` falle en la BD, UiPath lo captura y no crea nada. Es **idempotencia en la ingesta**, el mismo principio que ya se aplica al registro contable, y permite distinguir un **duplicado real de negocio** (el proveedor factura dos veces) de un **duplicado técnico** (el mismo fichero entra dos veces). Sin el hash, el sistema confunde un bug con un fraude.

`UNIQUE` sobre columna nullable funciona bien en Postgres: los `NULL` no colisionan, así que las 334 facturas ya cargadas (sin hash) no dan problema.

**Por qué `confianza_tipo_documento`:** si el OCR confunde una nota de crédito con una factura, el sistema **paga** en vez de restar. Es el único error del pipeline que cuesta dinero directamente. Con esta columna, por debajo del umbral se escala a humano antes de conciliar.

```sql
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
```

### 2.2 `casos_excepcion` — resolución del caso

Hoy solo guarda qué pasó, no cómo terminó. Sin esto no hay trazabilidad de decisiones (objetivo declarado del proyecto).

| Campo | Tipo | Notas |
|---|---|---|
| `estado_resolucion` | text | `CHECK ∈ {abierto, en_revision, resuelto_ok, resuelto_fraude, descartado}`, default `'abierto'` |
| `resuelto_por` | text | nullable — `agente` o identificador del humano |
| `fecha_resolucion` | timestamptz | nullable |
| `notas_resolucion` | text | nullable |

**Y ampliar el `CHECK` de `tipo_excepcion`** para añadir `iban_no_coincide`.
Valores finales (10): `duplicado`, `importe_distinto`, `sin_pedido`, `nota_credito`, `entrega_parcial`, `salto_divisa`, `producto_no_reconocido`, `entrega_incompleta`, `mercancia_danada`, `iban_no_coincide`.

⚠️ El nombre de la constraint actual es desconocido. **Localizarla dinámicamente**, no inventarla:

```sql
select conname from pg_constraint
where conrelid = 'public.casos_excepcion'::regclass
  and contype = 'c'
  and pg_get_constraintdef(oid) ilike '%tipo_excepcion%';
```

Después `ALTER TABLE ... DROP CONSTRAINT <nombre>` y recrearla con los 10 valores.

**Semántica de `iban_no_coincide`** (documentar en el PDD): se dispara cuando `facturas.iban_proveedor <> maestro_proveedores.iban`. Tiene dos causas indistinguibles desde los datos — fraude, o un cambio de banco legítimo no comunicado. Por eso es **una sola excepción**, no dos: la distinción se hace en `estado_resolucion` (`resuelto_ok` = cambio legítimo → se actualiza el maestro; `resuelto_fraude` = factura rechazada), tras verificación humana fuera de banda (llamando al teléfono del maestro, **nunca al de la factura**).

### 2.3 `maestro_proveedores`

| Campo | Tipo | Notas |
|---|---|---|
| `iban_fecha_actualizacion` | date | nullable — cuándo se validó el IBAN por última vez |

### 2.4 `facturas_lineas` — salida del Clasificador (nivel 4)

Hoy solo tiene `centro_coste_id`. Faltan las otras dos salidas del agente y el rastro de la autoevaluación (sin él, **el nivel 4 no es demostrable**).

| Campo | Tipo | Notas |
|---|---|---|
| `categoria_contable` | text | nullable |
| `coleccion_asignada` | text | nullable |
| `confianza_clasificacion` | numeric | nullable, 0–1 |
| `clasificado_por` | text | `CHECK ∈ {agente, humano}`, nullable |
| `autoevaluacion_pasada` | boolean | nullable — si superó el umbral de confianza |

---

## 3. Bloque 02 — `facturas_albaranes` (tabla puente) + backfill

`facturas.albaran_ids_ref` es **texto libre** con varios IDs separados por `;`. Eso impide cualquier JOIN entre factura y albarán — impide consultar en SQL el matching a 3 bandas, que es el corazón del proyecto.

```sql
create table public.facturas_albaranes (
  factura_id text not null references public.facturas(factura_id),
  albaran_id text not null references public.albaranes(albaran_id),
  primary key (factura_id, albaran_id)
);
```

**Backfill** desde el campo existente:

```sql
insert into public.facturas_albaranes (factura_id, albaran_id)
select f.factura_id, trim(a.id)
from public.facturas f,
     unnest(string_to_array(f.albaran_ids_ref, ';')) as a(id)
where f.albaran_ids_ref is not null
  and trim(a.id) <> ''
  and exists (select 1 from public.albaranes al where al.albaran_id = trim(a.id))
on conflict do nothing;
```

**Reportar**: filas insertadas, y los IDs del texto libre que NO existían en `albaranes` (datos sucios — listarlos).

`facturas.albaran_ids_ref` **se conserva** (no se borra) por si algún flujo de n8n ya lo lee, pero queda deprecado: la fuente de verdad pasa a ser la tabla puente.

---

## 4. Bloque 03 — Human-in-the-loop y comunicaciones

### `aprobaciones`

Los objetivos prometen dos puntos de control humano (por importe y tras discrepancia) y un canal Telegram con botones. Hoy una aprobación solo mueve `facturas.estado` y se pierde quién, cuándo y por qué.

| Campo | Tipo | Notas |
|---|---|---|
| `aprobacion_id` | text | PK |
| `factura_id` | text | FK → `facturas` |
| `caso_id` | text | FK → `casos_excepcion`, nullable |
| `tipo` | text | `CHECK ∈ {por_importe, por_excepcion}` |
| `canal` | text | `CHECK ∈ {telegram, dashboard}` |
| `decision` | text | `CHECK ∈ {pendiente, aprobada, rechazada}`, default `'pendiente'` |
| `umbral_aplicado` | numeric | nullable — el umbral en EUR que disparó la aprobación |
| `aprobado_por` | text | nullable |
| `fecha_solicitud` | timestamptz | default `now()` |
| `fecha_decision` | timestamptz | nullable |
| `comentario` | text | nullable |

### `comunicaciones`

El Conciliador *«redacta y envía la reclamación al proveedor por correo»*. La incidencia se registra (`casos_excepcion`), el correo no. Guardar el cuerpo generado por el LLM es además la evidencia de la calidad del prompt — criterio explícito de evaluación en la defensa.

| Campo | Tipo | Notas |
|---|---|---|
| `comunicacion_id` | text | PK |
| `caso_id` | text | FK → `casos_excepcion`, nullable |
| `factura_id` | text | FK → `facturas`, nullable |
| `proveedor_id` | text | FK → `maestro_proveedores` |
| `canal` | text | `CHECK ∈ {email, telegram}` |
| `direccion_destino` | text | |
| `asunto` | text | nullable |
| `cuerpo` | text | el texto generado por el LLM |
| `generado_por_llm` | boolean | default true |
| `fecha_envio` | timestamptz | default `now()` |
| `respuesta_recibida` | boolean | default false |
| `fecha_respuesta` | timestamptz | nullable |

---

## 5. Bloque 04 — ERP simulado: plan de cuentas y asientos

**Decisión de diseño**: el ERP es **simulado dentro de Supabase**. `asientos_contables` no es un log del registro, **es el destino del registro**. Por eso hace falta un plan de cuentas mínimo (PGC español) para que los asientos cuadren y no sean texto libre.

### `cuentas_contables` (con seed)

Campos: `cuenta` (text PK), `descripcion` (text), `tipo` (text, `CHECK ∈ {activo, pasivo, gasto, ingreso}`).

| `cuenta` | `descripcion` | `tipo` |
|---|---|---|
| 600 | Compras de mercaderías | gasto |
| 607 | Trabajos realizados por otras empresas | gasto |
| 621 | Arrendamientos y cánones | gasto |
| 628 | Suministros | gasto |
| 472 | Hacienda Pública, IVA soportado | activo |
| 400 | Proveedores | pasivo |
| 572 | Bancos e instituciones de crédito | activo |
| 708 | Devoluciones de compras (notas de crédito) | ingreso |

### `asientos_contables` (cabecera)

**Punto crítico de la migración.** La propuesta promete registro *idempotente*: «aunque el registro se reintente tras una caída, el asiento se cree una sola vez». **La idempotencia no es código, es una restricción de unicidad en la BD.** Sin el `UNIQUE`, el objetivo no se cumple.

| Campo | Tipo | Notas |
|---|---|---|
| `asiento_id` | text | PK |
| `factura_id` | text | FK → `facturas` |
| `clave_idempotencia` | text | **NOT NULL UNIQUE** — p.ej. `md5(factura_id || total_factura_eur)` |
| `tipo_asiento` | text | `CHECK ∈ {compra, rectificativo, pago}` |
| `fecha_asiento` | date | |
| `estado_registro` | text | `CHECK ∈ {pendiente, registrado, error}`, default `'pendiente'` |
| `intentos` | integer | default 0 |
| `ultimo_error` | text | nullable |
| `id_erp_externo` | text | nullable |
| `fecha_registro` | timestamptz | nullable |

### `asientos_lineas` (las partidas)

Un asiento tiene N líneas y **debe cuadrar**: `sum(debe_eur) = sum(haber_eur)`. Una compra son tres líneas (600 + 472 contra 400), no cabe en una sola fila.

| Campo | Tipo | Notas |
|---|---|---|
| `asiento_id` | text | PK compuesta, FK → `asientos_contables` |
| `linea_num` | integer | PK compuesta |
| `cuenta` | text | FK → `cuentas_contables` |
| `centro_coste_id` | text | FK → `centros_coste`, nullable |
| `debe_eur` | numeric | default 0 |
| `haber_eur` | numeric | default 0 |
| `concepto` | text | nullable |

Crear además la **vista `asientos_descuadrados`** con los asientos donde `sum(debe) <> sum(haber)`. Control de calidad que el dashboard puede pintar directamente.

---

## 6. Bloque 05 — `pagos` (tesorería)

**Justificación** (para el PDD): `pagos` **no** es un control antifraude — ese control vive en la conciliación, comparando `facturas.iban_proveedor` con `maestro_proveedores.iban`, antes de que salga el dinero. `pagos` existe porque `asientos_contables` registra la **obligación** (600/472 contra 400) y el pago registra su **cancelación** (400 contra 572). Sin ella, la mitad del ciclo contable no está modelada y `facturas.saldo_pendiente_eur` es un número sin rastro. Habilita además tres KPIs que el dashboard hoy no puede pintar: deuda viva, previsión de tesorería a 30 días y periodo medio de pago (DPO) por proveedor.

**Alcance declarado**: `pagos` es un registro contable, **no un agente**. Nadie automatiza la ejecución del pago ni lee extractos bancarios — la conciliación bancaria post-pago está en «futuros desarrollos» de la propuesta aprobada.

| Campo | Tipo | Notas |
|---|---|---|
| `pago_id` | text | PK |
| `factura_id` | text | FK → `facturas` |
| `asiento_id` | text | FK → `asientos_contables`, nullable — el enlace que cierra el ciclo |
| `fecha_pago` | date | nullable = programado, aún no ejecutado |
| `fecha_vencimiento` | date | copiada de `facturas` — permite calcular DPO sin JOIN |
| `importe_original` | numeric | |
| `moneda` | text | `CHECK ∈ {EUR, USD, CNY}` |
| `importe_eur` | numeric | **usar para sumas** |
| `es_pago_parcial` | boolean | default false |
| `iban_origen` | text | cuenta de Nextwear |
| `iban_destino` | text | |
| `referencia_bancaria` | text | nullable |
| `medio_pago` | text | `CHECK ∈ {transferencia, confirming, domiciliacion}` |
| `estado_pago` | text | `CHECK ∈ {programado, retenido, ejecutado, rechazado, anulado}` |
| `motivo_retencion` | text | nullable |

**Relación 1:N** con `facturas` (una factura puede tener varios pagos parciales). Las notas de crédito **no generan fila** en `pagos`: se aplican como rebaja del `saldo_pendiente_eur` de la factura rectificada.

---

## 7. Bloque 06 — `log_agentes`

RGPD y *«trazabilidad de cada decisión»* están en la propuesta. **Esto no lo cubre UiPath Orchestrator**: Orchestrator loguea UiPath, no las decisiones de n8n, ni las de Make, ni las del Copiloto — tres de los cuatro agentes. Es además la **fuente de la base de conocimiento del Copiloto RAG**: la tabla que responde *«¿por qué descuadró esta factura?»*. Sin ella el Copiloto solo puede leer el estado actual, no el razonamiento, y deja de ser un copiloto para ser un buscador.

| Campo | Tipo | Notas |
|---|---|---|
| `log_id` | text | PK |
| `agente` | text | `CHECK ∈ {captura, conciliador, clasificador, copiloto, erp}` |
| `factura_id` | text | FK → `facturas`, nullable |
| `caso_id` | text | FK → `casos_excepcion`, nullable |
| `accion` | text | |
| `entrada_resumen` | text | nullable |
| `salida_resumen` | text | nullable |
| `modelo_llm` | text | nullable |
| `tokens_entrada` | integer | nullable |
| `tokens_salida` | integer | nullable |
| `duracion_ms` | integer | nullable |
| `resultado` | text | `CHECK ∈ {ok, error, escalado}` |
| `creado_en` | timestamptz | default `now()` |

---

## 8. Bloque 07 — Índices, RLS y validación

### Índices

- `facturas_albaranes(albaran_id)`
- `facturas(hash_documento)`, `facturas(confianza_extraccion)`
- `aprobaciones(factura_id)`, `aprobaciones(decision)`
- `comunicaciones(caso_id)`
- `asientos_contables(factura_id)`, `asientos_contables(estado_registro)`
- `pagos(factura_id)`, `pagos(estado_pago)`, `pagos(fecha_vencimiento)`
- `log_agentes(factura_id)`, `log_agentes(agente, creado_en)`
- `casos_excepcion(estado_resolucion)`

### RLS

Activar RLS en las 7 tablas nuevas y replicar el patrón de políticas de las existentes (consultar `pg_policies` primero). El dashboard accede con **service role key desde route handlers de backend**, nunca desde el cliente.

### Storage

Verificar que existe un bucket para los PDF de facturas (crear `facturas-pdf` si no existe, privado). `facturas.documento_url` apunta ahí. UiPath sube el fichero y escribe la ruta en la misma operación.

### Consultas de validación (ejecutar y reportar resultados)

```sql
-- 1. Backfill de la tabla puente
select count(*) as filas_puente from public.facturas_albaranes;
select count(*) as facturas_con_albaran_texto
from public.facturas where albaran_ids_ref is not null and trim(albaran_ids_ref) <> '';

-- 2. IDs de albarán huérfanos en el texto libre (datos sucios)
select f.factura_id, trim(a.id) as albaran_inexistente
from public.facturas f, unnest(string_to_array(f.albaran_ids_ref, ';')) as a(id)
where f.albaran_ids_ref is not null and trim(a.id) <> ''
  and not exists (select 1 from public.albaranes al where al.albaran_id = trim(a.id));

-- 3. El nuevo tipo de excepción está admitido
select pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'public.casos_excepcion'::regclass and contype = 'c';

-- 4. Candidatos reales a iban_no_coincide en los datos ya cargados
select f.factura_id, f.proveedor_id, f.iban_proveedor, m.iban
from public.facturas f
join public.maestro_proveedores m on m.proveedor_id = f.proveedor_id
where f.iban_proveedor is not null and m.iban is not null
  and f.iban_proveedor <> m.iban;

-- 5. Todas las tablas nuevas existen
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('facturas_albaranes','aprobaciones','comunicaciones',
                     'cuentas_contables','asientos_contables','asientos_lineas',
                     'pagos','log_agentes');

-- 6. Las columnas nuevas de facturas existen
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'facturas'
  and column_name in ('documento_url','hash_documento','confianza_extraccion',
                      'campos_baja_confianza','confianza_tipo_documento',
                      'canal_entrada','motor_extraccion');
```

La consulta **4** es importante: dirá si el dataset actual ya contiene algún IBAN divergente. Si devuelve 0 filas, hay que **inyectar 1 o 2 casos** en el dataset de demo para poder enseñar el control en el vídeo.

---

## 9. Estado final esperado

**21 tablas + 2 vistas** (`stock_actual`, `asientos_descuadrados`):

| Existentes (13) | Nuevas (8) |
|---|---|
| maestro_proveedores, productos, centros_coste, tipos_cambio, pedidos, pedidos_lineas, albaranes, albaranes_lineas, facturas, facturas_lineas, stock_movimientos, casos_excepcion | facturas_albaranes, aprobaciones, comunicaciones, cuentas_contables, asientos_contables, asientos_lineas, pagos, log_agentes |

Sin tabla `documentos`: sus 7 campos viven en `facturas`.

---

## 10. Entregable esperado de Claude Code

1. Los ficheros SQL numerados (`01_alter_existentes.sql` … `07_indices_rls.sql`), listos para pegar en el SQL Editor.
2. Aplicarlos vía MCP de Supabase, **uno a uno**, parando y reportando tras cada bloque.
3. Un fichero `MIGRACION_RESULTADO.md` con los resultados de las consultas de validación.
4. Actualizar `finflow_esquema_consolidado.md` con las tablas y campos nuevos — es la fuente de verdad del proyecto y debe quedar sincronizada.
