# Análisis de la base de datos Supabase — Nextwear S.L.

Proyecto `EBIS_TFM_RETAIL_NEXTWEAR` (ref `rnmidwhumdrpxulfsbjo`), esquema `public`.
Análisis de solo lectura (esquema + SELECTs de conteo/distribución). Fecha del análisis: 2026-09-30.
Los recuentos son de filas reales (`count(*)`), no de las estadísticas del catálogo, que salen desfasadas.

---

## 1. Contexto: quién escribe qué

La base de datos no es un ERP estático: es el **estado compartido de un sistema multiagente** de Cuentas por Pagar.

| Actor | Qué escribe / decide |
|---|---|
| **Agente Capturador** | Lee la factura (PDF/email/portal), extrae los datos y crea `facturas` + `facturas_lineas`. Deja `log_agentes` (agente=`captura`). Campos propios: `confianza_extraccion`, `campos_baja_confianza`, `hash_documento`, `canal_entrada`, `motor_extraccion`, `documento_url`. |
| **Agente Conciliador** | Cruza factura ↔ pedido ↔ albarán (3-way match). Mueve `estado` (`conciliada_ok` / `en_excepcion`), rellena `motivo_excepcion`, crea `casos_excepcion`, enlaza `facturas_albaranes`. |
| **Agente Clasificador** | Asigna a cada línea `categoria_contable`, `coleccion_asignada`, `confianza_clasificacion`, `clasificado_por` (agente/humano), `autoevaluacion_pasada`, `codigo_hs`. |
| **Humano (HITL)** | Resuelve casos y aprueba (`aprobaciones`, `casos_excepcion.estado_resolucion`). |
| **RPA contable / pagos** | Generan `asientos_contables`/`asientos_lineas` y `pagos`. |
| **Trigger de estados** | `transiciones_estado_factura` (matriz permitida) + `historial_estado_factura` (auditoría). Modo actual: `modo_validacion_estados = aviso` (no bloquea). |

Consecuencia clave: **la calidad de cada columna depende de que su agente haya corrido**. Varias columnas hoy están vacías porque el agente aún no las puebla (ver §6).

---

## 2. Mapa de tablas (23 tablas + 1 vista)

Filas reales a fecha del análisis.

### 2.1 Maestros / dimensiones

| Tabla | Filas | PK | Qué representa |
|---|---:|---|---|
| `maestro_proveedores` | 10 | `proveedor_id` | Proveedores: NIF, país, `moneda_facturacion` (EUR/USD/CNY), `canal_recepcion`, IBAN (+`iban_fecha_actualizacion`), forma de pago, `activo`. 7 en EUR, 1 USD, 2 CNY. |
| `productos` | 20 | `sku` | Catálogo: EAN, descripción, talla, color, colección, categoría, `coste_unitario` (EUR). |
| `centros_coste` | 7 | `centro_coste_id` | 5 tiendas físicas (BCN, BIL, MAD, SEV, VLC), 1 ecommerce, 1 almacén central. |
| `tipos_cambio` | 18 | (`fecha`,`moneda_origen`) | Tasa mensual USD→EUR y CNY→EUR, con `fuente`. |
| `cuentas_contables` | 8 | `cuenta` | Plan de cuentas reducido (activo/pasivo/gasto/ingreso). |
| `parametros_sistema` | 1 | `clave` | Configuración (hoy solo `modo_validacion_estados=aviso`). |
| `transiciones_estado_factura` | 24 | `transicion_id` | Matriz de transiciones de estado permitidas y qué agente/disparador las ejecuta. |

### 2.2 Cadena de compra (Pedido → Albarán → Factura)

| Tabla | Filas | PK | Qué representa |
|---|---:|---|---|
| `pedidos` | 371 | `pedido_id` | Cabecera de pedido a proveedor: centro de coste, fechas pedido/entrega prevista, moneda, `estado` (abierto, parcialmente_recibido, recibido_completo, cerrado, cancelado). |
| `pedidos_lineas` | 918 | (`pedido_id`,`sku`) | `cantidad_pedida` y `precio_unitario_acordado` — **referencia de precio para el 3-way match**. |
| `albaranes` | 378 | `albaran_id` | Recepción de mercancía: pedido, proveedor, centro, `fecha_entrega`, `estado` (registrado, conciliado, discrepancia). |
| `albaranes_lineas` | 809 | (`albaran_id`,`sku`) | `cantidad_entregada`. |
| `facturas` | 348 | `factura_id` | **Tabla central**. Cabecera fiscal, doble moneda `_original`/`_eur`, `saldo_pendiente_eur`, `estado` de ciclo, `motivo_excepcion`, datos de extracción del capturador, datos de comercio exterior (`incoterm`, `regimen_iva`, `swift_bic`, `pais_origen_mercancia`). Autorrelación `factura_original_id` para notas de crédito. |
| `facturas_lineas` | 822 | (`factura_id`,`linea_id`) | Detalle: SKU, centro de coste, cantidad, precio, descuento, IVA, `flag_revision`/`motivo_flag`, y campos del Clasificador. |
| `facturas_albaranes` | 380 | (`factura_id`,`albaran_id`) | Tabla puente N:M factura↔albarán. Es la relación **normalizada**; `facturas.albaran_ids_ref` (texto) es solo redundancia. |

### 2.3 Control, excepciones y trazabilidad

| Tabla | Filas | Qué representa |
|---|---:|---|
| `casos_excepcion` | 71 | Incidencias detectadas. Referencia polimórfica: ≥1 de `factura_id`/`albaran_id`/`pedido_id` (+`linea_id`). `tipo_excepcion` (7 valores), `estado_resolucion`, `requiere_intervencion_humana`, `origen_deteccion`, resolución (quién/cuándo/notas). |
| `aprobaciones` | 0 | Solicitudes de aprobación (por importe o por excepción), canal telegram/dashboard, decisión, umbral. |
| `comunicaciones` | 0 | Mensajes a proveedores (email/telegram), `generado_por_llm`, respuesta recibida. |
| `log_agentes` | 11 | Traza por agente (captura/conciliador/clasificador/copiloto/erp): acción, modelo LLM, tokens, duración, resultado. |
| `historial_estado_factura` | 0 | Auditoría de cada cambio de estado (permitida o no, modo, actor). |

### 2.4 Contabilidad, pagos e inventario

| Tabla | Filas | Qué representa |
|---|---:|---|
| `asientos_contables` | 291 | Cabecera de asiento por factura (compra/rectificativo/pago), `clave_idempotencia`, `estado_registro`, reintentos, `id_erp_externo`. |
| `asientos_lineas` | 871 | Debe/haber en EUR por cuenta y centro de coste. |
| `pagos` | 2 | Pagos (importe original y EUR, medio, estado, IBAN origen/destino, parcial). |
| `stock_movimientos` | 797 | Entradas/salidas por SKU y centro: cantidad, `valor_unitario_eur`, `stock_resultante`, `referencia_documento`. |
| `stock_actual` (vista) | 140 | Stock por SKU × centro (`cantidad_disponible`, `fecha_ultima_actualizacion`). No trae valor. |

---

## 3. Relaciones (resumen)

```
maestro_proveedores ─┬─< pedidos ─┬─< pedidos_lineas >─ productos
                     │            ├─< albaranes ─< albaranes_lineas >─ productos
                     │            └─< facturas (pedido_id_ref)
                     ├─< albaranes
                     ├─< facturas ─┬─< facturas_lineas >─ productos / centros_coste
                     │             ├─< facturas_albaranes >─ albaranes      (N:M)
                     │             ├─< casos_excepcion (también → albaranes, pedidos)
                     │             ├─< aprobaciones ─ casos_excepcion
                     │             ├─< comunicaciones (→ proveedor, caso)
                     │             ├─< asientos_contables ─< asientos_lineas >─ cuentas_contables / centros_coste
                     │             ├─< pagos ─ asientos_contables
                     │             ├─< log_agentes (→ caso)
                     │             ├─< historial_estado_factura
                     │             └─  facturas.factura_original_id → facturas   (notas de crédito)
                     └─< comunicaciones
centros_coste ─< pedidos, albaranes, facturas_lineas, stock_movimientos, asientos_lineas
productos ─< stock_movimientos ─→ vista stock_actual
tipos_cambio  → sin FK (se cruza por fecha + moneda)
```

Puntos de atención de las relaciones:
- `facturas` **no tiene FK directa a albaranes**: el vínculo real es `facturas_albaranes`.
- `stock_movimientos.referencia_documento` es texto libre (sin FK).
- `tipos_cambio` no tiene FK; el enlace con `facturas` es lógico (`fecha_tipo_cambio` + `moneda_original`).
- `casos_excepcion` es polimórfica: hay que hacer `LEFT JOIN` a las tres tablas posibles.

---

## 4. Métricas calculables

**Gasto y deuda (facturas, siempre `_eur`)**
- Gasto bruto y neto (las notas de crédito ya vienen negativas: suma directa).
- Base imponible vs IVA (`base_imponible_eur`, `cuota_iva_eur`; IVA 21 % en las 348 facturas).
- Saldo pendiente (`saldo_pendiente_eur`), antigüedad de deuda (`fecha_vencimiento`), % vencido.
- Ticket medio, nº de facturas, precio medio por SKU/proveedor.
- Peso de moneda extranjera y efecto FX (tasa aplicada vs tasa de referencia del mes en `tipos_cambio`).

**Control / conciliación (Conciliador)**
- Tasa de conciliación automática (`conciliada_ok` / total) y tasa de excepción.
- Excepciones por tipo, por proveedor, por antigüedad, por `requiere_intervencion_humana`.
- Importe en riesgo (suma de facturas `en_excepcion`).
- Desviación de precio (factura vs `pedidos_lineas.precio_unitario_acordado`) y de cantidad (facturada vs `albaranes_lineas.cantidad_entregada`).
- Duplicados detectados, IBAN no coincidente (riesgo de fraude).
- Time-to-resolve de casos (`fecha_resolucion` − creación; hoy falta fecha de creación, ver §6).

**Calidad de los agentes**
- Confianza media de extracción y % de facturas con `campos_baja_confianza`.
- % de líneas con `flag_revision`; % clasificadas por agente vs humano; % `autoevaluacion_pasada`.
- Coste/latencia LLM (`tokens_*`, `duracion_ms`) y tasa `ok/error/escalado` por agente (`log_agentes`).
- Tasa de "toque humano" (casos con `requiere_intervencion_humana`, aprobaciones).

**Compras y proveedores**
- Cumplimiento de entrega: `fecha_entrega` vs `fecha_entrega_prevista`; % pedidos recibidos completos/parciales.
- Fill rate: `cantidad_entregada` / `cantidad_pedida`.
- Pedidos abiertos/parciales y su importe pendiente de recibir.
- Concentración de compra por proveedor (Pareto).

**Inventario**
- Unidades y valoración de stock (cantidad × `coste_unitario`), rotación y cobertura (salidas/stock), stock bajo, valoración por centro/categoría/colección.

**Contabilidad y pagos** (limitado hoy, ver §6)
- % facturas contabilizadas, asientos en error/reintentos, cuadre debe = haber.
- Pagos ejecutados/retenidos, DPO (días a pago), pagos parciales, pagos duplicados.

---

## 5. Dimensiones útiles para analizar el negocio

| Dimensión | Campo(s) | Para qué |
|---|---|---|
| **Tiempo** | `fecha_expedicion`, `fecha_vencimiento`, `fecha_pedido`, `fecha_entrega`; mes/trimestre/año | Estacionalidad, interanual (abr–jul de 2024/2025/2026), vencimientos. |
| **Proveedor** | `proveedor_id`, país, `moneda_facturacion`, `canal_recepcion` | Concentración, riesgo, canal más propenso a error. |
| **Moneda / origen** | `moneda_original`, `regimen_iva`, `incoterm`, `pais_origen_mercancia` | Exposición FX y comercio exterior. |
| **Centro de coste** | `centro_coste_id` y `tipo` (tienda/ecommerce/almacén) | Reparto del gasto, reposición. |
| **Producto** | `sku`, `categoria`, `coleccion`, `talla`, `color` | Gasto y stock por tipo de producto. |
| **Estado del ciclo** | `facturas.estado`, `albaranes.estado`, `pedidos.estado` | Embudo de procesamiento. |
| **Excepción** | `tipo_excepcion`, `estado_resolucion`, `origen_deteccion`, `motivo_excepcion` | Foco en control. |
| **Agente / automatización** | `log_agentes.agente`, `clasificado_por`, `canal_entrada`, `motor_extraccion`, `idioma_documento` | Rendimiento de la IA y del OCR/extracción. |
| **Cuenta contable** | `cuenta`, `categoria_contable` | Cuando el Clasificador y el RPA contable estén poblados. |

---

## 6. Limitaciones y cuidados antes de construir el dashboard

Hallazgos verificados en los datos:

**Columnas vacías o sin poblar (el agente aún no las escribe)**
1. **Clasificador sin datos**: `categoria_contable`, `clasificado_por`, `coleccion_asignada`… son `NULL` en las 822 líneas. Cualquier visual sobre clasificación no tendría datos hoy.
2. **Capturador sin metadatos**: `canal_entrada` y `motor_extraccion` son `NULL` en las 348 facturas; `confianza_extraccion` es `NULL` (media = null); `hash_documento` solo existe en 7 de 348. No se pueden medir calidad de extracción ni duplicados por hash.
3. **Tablas vacías**: `aprobaciones` (0), `comunicaciones` (0), `historial_estado_factura` (0). `pagos` solo 2, `log_agentes` solo 11 (9 capturas, 2 conciliaciones). Sin ellas no hay métricas de aprobación, DPO, comunicación ni coste LLM significativas.
4. `casos_excepcion` no tiene fecha de creación → no se puede medir antigüedad ni time-to-resolve. Los 71 casos están `abierto`; ninguno resuelto.

**Coherencia del estado (ojo con el "embudo")**
5. **287 de 348 facturas siguen en `pendiente_conciliacion`** y solo 0 en `conciliada_ok`. Sin embargo hay **291 asientos contables ya `registrado`**, todos de facturas que no están `contabilizada`. El estado de la factura **va por detrás** de lo que ya hizo el RPA contable (con `modo_validacion_estados = aviso` el trigger no bloquea ni audita). No usar `estado` como única fuente de verdad del ciclo; contrastar con `asientos_contables` y `pagos`.
6. Coexisten 51 facturas `en_excepcion` con 45 casos de origen factura y 25 de albarán: la relación 1:1 factura↔caso **no** existe. Contar facturas y casos por separado.
7. Hay 6 facturas con motivo "líneas sin SKU del catálogo" y 6 líneas con `sku` NULL, pero **no existe `tipo_excepcion` para ello** en `casos_excepcion` (solo 7 tipos).
8. 1 caso con `origen_deteccion = NULL`.

**Dinero y moneda**
9. Usar siempre columnas `_eur`; nunca mezclar `_original` entre monedas.
10. **Posible error de conversión FX**: los proveedores chinos (64 facturas CNY) suman ~15,6 k€ frente a 60–90 k€ del resto, con un ticket medio ~7× menor. Además `facturas.tipo_cambio_aplicado` para CNY llega a **8,4084**, fuera del rango de `tipos_cambio` (7,5075–7,7768). Existe una migración local sin aplicar/commitear (`17_fix_tipo_cambio_invertido.sql`): **validar el cálculo FX antes de publicar cifras de gasto por moneda/proveedor**.
11. Hay dos "totales": `total_factura_eur` **incluye IVA**; la suma de `facturas_lineas.total_linea_eur` es sin IVA (base). Gasto por centro de coste (sale de líneas) y gasto total (sale de cabecera) **no cuadran a propósito**; declarar cuál se usa. El IVA es 21 % fijo aunque haya `regimen_iva` exportación/intracomunitario (aparentemente no se aplica exención).
12. `saldo_pendiente_eur` es `NULL` en facturas `nueva_entrada` y `pendiente_captura` → usar `COALESCE` o filtrar por estado.
13. El precio de las líneas difiere >5 % del `productos.coste_unitario` en 798 de 822 líneas. El catálogo no sirve como referencia de precio: usar `pedidos_lineas.precio_unitario_acordado`. Para valorar stock, decidir consciente entre coste de catálogo y `valor_unitario_eur` de movimientos (dan valores distintos; con catálogo ≈ 631,6 k€).

**Datos y fechas**
14. **Rango temporal parcial y sintético**: solo abril–julio de 2024/2025/2026 (no hay 12 meses). Comparativas interanuales solo válidas mes a mes; 2026-07 y 2026-04 tienen menos facturas que el resto (posible carga incompleta). Julio no debe compararse con "trimestre".
15. "Hoy" (2026-09-30) está muy lejos de las fechas: **331 facturas tienen vencimiento pasado y saldo > 0**. Ese KPI de "vencido" sería casi 100 % por artificio del dataset; calcular la antigüedad respecto a una fecha de corte parametrizable, no `current_date`.
16. 7 facturas `nueva_entrada` (fecha hasta 2026-09-30, sin líneas, 1 sin total, sin vencimiento) y 1 `pendiente_captura` (sin proveedor): son cargas en curso del robot y **distorsionan totales**. Excluir estos estados de KPIs financieros.
17. Notas de crédito: 7, todas con `factura_original_id`; están en `pendiente_conciliacion` y a la vez generan 7 casos `nota_credito`. No contarlas como "excepciones malas" (`requiere_intervencion_humana = false`).
18. **Los datos cambian en vivo** (el robot de UiPath carga facturas de prueba): los recuentos varían entre consultas y no coinciden con documentación previa.

**Técnicas**
19. RLS activo en todas las tablas: acceso solo desde backend con service role, nunca desde cliente.
20. `albaran_ids_ref` es texto; usar siempre `facturas_albaranes`.
21. `stock_actual` es vista derivada: no sirve para histórico; para evolución usar `stock_movimientos`.

---

## 7. Propuesta inicial: 7 KPIs / visualizaciones

Todas calculables **hoy**, con la salvedad indicada.

| # | KPI / visual | Cálculo | Tipo | Nota |
|---|---|---|---|---|
| 1 | **Gasto neto y saldo pendiente (EUR)** | `SUM(total_factura_eur)` y `SUM(saldo_pendiente_eur)`, excluyendo `nueva_entrada`/`pendiente_captura`; NC restan solas | Tarjetas KPI + delta interanual | Validar FX (§6.10) antes de publicar. |
| 2 | **Evolución mensual del gasto interanual** | Gasto por mes, una serie por año (2024/25/26) | Líneas/barras agrupadas | Solo abr–jul; marcar meses parciales. |
| 3 | **Embudo del ciclo de facturas** | Nº e importe por `estado` | Barras horizontales / funnel | Advertir desfase estado vs asientos (§6.5). |
| 4 | **Excepciones: volumen e importe en riesgo** | Casos por `tipo_excepcion`; importe de facturas `en_excepcion`; % que requiere humano | Donut/barras + tarjeta | Prioridad de negocio: 71 abiertas, 0 resueltas. |
| 5 | **Gasto por proveedor y moneda** | Top proveedores (Pareto) coloreado por `moneda_original` | Barras + treemap | Depende de validar FX. |
| 6 | **Calidad del 3-way match** | Desviación precio (factura vs `precio_unitario_acordado`) y cantidad (albarán vs pedido/`fill rate`) por proveedor | Tabla calor / dispersión | Es la métrica que más demuestra el valor del conciliador. |
| 7 | **Inventario: valor y cobertura por centro** | Stock × coste por centro/categoría; stock bajo; cruce con pedidos abiertos/parciales | Barras apiladas + tabla de alertas | Elegir criterio de valoración (§6.13). |

**Visuales a añadir cuando se pueblen los datos** (hoy sin datos): rendimiento de agentes (confianza, tokens, tiempo, escalado), tasa de clasificación agente vs humano, time-to-resolve de casos, DPO y pagos, aprobaciones pendientes.

---

## 8. Recomendaciones previas al dashboard

1. Validar y cerrar la conversión FX (migración 17) y fijar la definición oficial de "gasto" (con/sin IVA).
2. Acordar con los agentes qué columnas deben poblar (canal, confianza, hash, clasificación, fecha de creación de casos) para poder medir su rendimiento.
3. Alinear `facturas.estado` con `asientos_contables`/`pagos` (o derivar el estado real en una vista).
4. Definir una **fecha de corte** parametrizable y excluir estados no financieros de los KPIs.
5. Crear vistas SQL de solo lectura (gasto neto, excepciones abiertas, match por línea) para que el dashboard y el copiloto lean cifras auditables de una sola fuente.
