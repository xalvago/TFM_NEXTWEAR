# Prompt maestro — Dashboard ejecutivo de compras y Cuentas por Pagar de Nextwear

> Copia el bloque **PROMPT** en Claude Code. Fuente de verdad de los datos: `ANALISIS_SUPABASE.md` (raíz del repo). Este fichero solo contiene el prompt; no implementa nada.

---

## Notas para quien lanza el prompt (no forman parte del prompt)

La base de datos es de **Cuentas por Pagar**, no de ventas. El eje central del dashboard es, por tanto, **la relación de Nextwear con sus proveedores**: qué se les pide (pedidos), qué entregan (albaranes), qué facturan (facturas) y cuánto cuesta en EUR. No hay clientes, ventas, revenue ni beneficio, y el prompt lo asume como punto de partida.

| Concepto de negocio | Qué se usa en la BD |
|---|---|
| ~~Revenue / ventas~~ | **Gasto** (EUR) y **unidades/productos pedidos** |
| ~~Beneficio / margen~~ | No existe. No se muestra. |
| ~~Segmento de cliente~~ | No existe. Se sustituye por **proveedor** y **centro de coste destinatario** |
| Región | **País de procedencia del proveedor** (`maestro_proveedores.pais`) |
| Moneda | **Moneda de facturación** del proveedor y **tasa de conversión aplicada en su fecha** |
| Canal | `maestro_proveedores.canal_recepcion` (email / portal / api) y tipo de centro destino |

---

## PROMPT

Actúa como un analista de datos senior y diseñador de producto de BI. Tu tarea es **revisar y actualizar el diseño del dashboard actual** de Nextwear S.L. para convertirlo en un **modelo interno de revisión ejecutiva** que permita a una persona de negocio entender **cuánto y a quién compramos, en qué volumen, en qué moneda y a qué tipo de cambio, y si el control de facturación funciona**.

### 0. Premisa central del dashboard

La base de datos (Supabase, esquema `public`) es el sistema de **Cuentas por Pagar** de un retail de moda. **No contiene ventas, ingresos, beneficios ni clientes.** Todo el dashboard gira alrededor de una sola cadena:

**Proveedor → Pedido → Albarán → Factura**, con el **tipo de cambio** y el **centro de coste** como dimensiones.

- **"Revenue" se sustituye por dos medidas**: **gasto** (importe facturado en EUR) y **volumen de compra** (unidades y productos/SKU pedidos).
- **No existe beneficio ni margen**: no los muestres, no los estimes, no los insinúes.
- **No existen clientes ni segmentos de cliente**: la dimensión de análisis comercial es el **proveedor** (y su país y moneda) y el **centro de coste** destinatario de la compra.
- Cada proveedor aporta en `maestro_proveedores`: **país de procedencia** (`pais`), **moneda de facturación** (`moneda_facturacion`: EUR/USD/CNY), **canal de recepción** y forma de pago. Cada factura aporta la **moneda original**, el **tipo de cambio aplicado** (`tipo_cambio_aplicado`) y la **fecha del tipo de cambio** (`fecha_tipo_cambio`), con la tasa de referencia mensual en `tipos_cambio`. Esa trazabilidad de la conversión es un **activo central del dashboard**, no un detalle técnico.

### 1. Reglas de trabajo (obligatorias)

1. **Antes de escribir código, entrega un plan corto** (qué mantienes, eliminas o fusionas, qué no se puede mostrar y por qué) y **espera mi confirmación**.
2. **Lee primero** `ANALISIS_SUPABASE.md` y `CLAUDE.md`. Consulta `node_modules/next/dist/docs/` antes de escribir código de Next.js 16 (ver `AGENTS.md`).
3. **Verifica los datos tú mismo con SELECT de solo lectura** contra Supabase (`rnmidwhumdrpxulfsbjo`). No te fíes de cifras de documentos previos: los datos cambian en vivo porque un robot UiPath carga facturas de prueba.
4. **Invariantes del proyecto**: Supabase solo desde route handlers del servidor con service role; dashboard de solo lectura (única excepción documentada: el botón "Borrar facturas nuevas", no lo toques); sumas de dinero siempre en columnas `_eur`, nunca sumando `_original` de monedas distintas; las notas de crédito ya vienen negativas y se suman directamente; `stock_actual` es una vista de solo lectura.
5. **No hagas commit ni push** salvo que yo lo pida explícitamente en esta conversación (esto sustituye, para esta tarea, la regla automática de `CLAUDE.md`).
6. **Nunca inventes datos, cifras de ejemplo ni estimaciones para rellenar huecos.** Lo que no se puede calcular con la base se declara "no disponible".

### 2. Objetivo y preguntas que debe responder

Una pantalla de revisión ejecutiva que responda en menos de 2 minutos:

- ¿Cuánto hemos gastado, cómo evoluciona y cómo se compara con años anteriores?
- ¿**A qué proveedores compramos**, cuánto volumen (pedidos, unidades, productos) y cuánto gasto concentra cada uno?
- ¿**De qué países** compramos y **en qué monedas** facturan? ¿Qué tipo de cambio se aplicó y cuánto pesa el riesgo de divisa?
- ¿Cuánto hemos **pedido frente a lo recibido y lo facturado**? ¿Hay pedidos abiertos o entregas incompletas?
- ¿Funciona el control de facturación (conciliación factura–pedido–albarán)? ¿Cuánto dinero está en excepción?
- ¿Qué conclusiones, riesgos y acciones se derivan?

Prioriza **claridad sobre cantidad de gráficos**: máximo **8–10 visuales** en total, cada uno con título-mensaje (p. ej. "Gasto mensual frente al año anterior"), unidad visible y nota de cómo se calcula.

### 3. Modelo de datos y definiciones de métricas (a verificar y fijar antes de diseñar)

**Gasto** (medida económica): importe **facturado**, en EUR.
- Define **una única definición oficial** y úsala en todo el dashboard, declarándola: recomendada **base imponible sin IVA** (`facturas.base_imponible_eur`), o alternativamente `total_factura_eur` (con IVA). Si usas la base, el gasto por centro de coste puede salir de `facturas_lineas.total_linea_eur`; si usas el total, no mezcles ambas sin explicarlo (no cuadran a propósito).
- Notas de crédito (`es_nota_credito`): restan solas (ya son negativas).
- Excluye `nueva_entrada` y `pendiente_captura` de todos los importes (son cargas en curso, algunas sin total, líneas ni proveedor).

**Volumen de compra** (medida física):
- **Unidades pedidas**: `SUM(pedidos_lineas.cantidad_pedida)`.
- **Productos pedidos**: nº de SKU distintos (`pedidos_lineas.sku`) y su detalle en `productos` (categoría, colección, talla, color).
- **Unidades recibidas**: `SUM(albaranes_lineas.cantidad_entregada)`.
- **Unidades facturadas**: `SUM(facturas_lineas.cantidad)`.
- **Importe pedido** (compromiso): `SUM(cantidad_pedida × precio_unitario_acordado)`. **Verifica en qué moneda está `precio_unitario_acordado`** (probablemente la del pedido, `pedidos.moneda`): si no es EUR, conviértelo con la tasa de `tipos_cambio` de la fecha del pedido y **declara el método**; si no puedes hacerlo de forma fiable, muestra solo unidades para pedidos y deja los importes para facturas.
- Indicadores derivados: **tasa de recepción** (recibido / pedido), **pendiente de recibir**, pedidos por estado (`abierto`, `parcialmente_recibido`, `recibido_completo`, `cerrado`, `cancelado`), cumplimiento de plazo (`fecha_entrega` frente a `fecha_entrega_prevista`).

**Moneda y tipo de cambio**:
- Gasto por **moneda original** (EUR/USD/CNY) y por **moneda de facturación del proveedor**, siempre convertido a EUR para sumar.
- **Tipo de cambio aplicado** por factura (`tipo_cambio_aplicado`, `fecha_tipo_cambio`) frente a la **tasa de referencia del mes** (`tipos_cambio`): desviación media y casos fuera de rango.
- Peso de la moneda extranjera sobre el gasto total y evolución de la tasa USD/EUR y CNY/EUR en el periodo.

**País de procedencia**: `maestro_proveedores.pais` (y `facturas.pais_origen_mercancia` si está poblado; verifica cuál es fiable y no los mezcles sin decirlo). Gasto y volumen por país.

**Control de facturación**: facturas por `estado`, `casos_excepcion` por tipo, importe en riesgo (facturas `en_excepcion`), % que requiere intervención humana, tasa de conciliación automática, desviación de precio (factura frente a `pedidos_lineas.precio_unitario_acordado`) y de cantidad (albarán frente a pedido), saldo pendiente (`saldo_pendiente_eur`).

### 4. Trampas verificadas que debes tratar (detalle en `ANALISIS_SUPABASE.md` §6)

- **Conversión de divisa sospechosa**: las facturas en CNY suman muy poco (ticket medio ~7 veces menor que el resto) y `tipo_cambio_aplicado` llega a 8,4084, fuera del rango de `tipos_cambio` (7,5075–7,7768). Existe `supabase/migrations/17_fix_tipo_cambio_invertido.sql` sin aplicar. **Verifícalo antes de mostrar cifras por moneda, país o proveedor chino**; si no cuadra, muestra un aviso visible y redáctalo como "posible", no como hecho. No apliques la migración sin mi confirmación.
- **`estado` desfasado**: casi todas las facturas están en `pendiente_conciliacion` aunque ya existen asientos contables registrados. No presentes el embudo por `estado` como verdad absoluta; adviértelo o contrástalo con `asientos_contables` y `pagos`.
- **Fechas**: datos solo de abril–julio de 2024, 2025 y 2026. Comparativa interanual válida **mes a mes** y solo para meses presentes en todos los años; marca los meses parciales. No uses `current_date` para "vencido": usa una **fecha de corte configurable** (por defecto, la última fecha de expedición cargada), porque hoy (2026-10) queda muy lejos de los datos y casi todo saldría vencido.
- **Excepciones ≠ facturas**: una excepción puede referirse a un albarán o pedido; cuenta facturas y casos por separado. Las notas de crédito (`requiere_intervencion_humana = false`) no son errores.
- **Catálogo**: `productos.coste_unitario` no coincide con el precio facturado en casi todas las líneas; no lo uses como referencia de precio. La referencia del 3-way match es `pedidos_lineas.precio_unitario_acordado`.
- **Columnas vacías hoy** (no las uses en visuales): `facturas.canal_entrada`, `motor_extraccion`, `confianza_extraccion`; `facturas_lineas.categoria_contable`, `clasificado_por`, `coleccion_asignada`. Tablas sin datos: `aprobaciones`, `comunicaciones`, `historial_estado_factura` (y `pagos`/`log_agentes` casi vacías).
- 6 líneas con `sku` NULL: trátalas como "Sin SKU" explícito en los rankings de producto.
- **Catálogo pequeño**: 10 proveedores, 20 SKU y 7 centros de coste. Evita gráficos que aparenten más granularidad de la que hay; un "top 10" de proveedores son en realidad **todos** los proveedores, así que muéstralos como ranking completo.

### 5. Matriz de cobertura de datos (**entregable obligatorio antes de diseñar**)

Antes de proponer visuales, construye y muéstrame una tabla verificada contra Supabase:

| Métrica o dimensión | Fuente exacta (tabla.columna) | % de filas pobladas | Estado (Disponible / Parcial / No disponible) | Observaciones |
|---|---|---|---|---|

Debe cubrir como mínimo: gasto (EUR), unidades pedidas/recibidas/facturadas, SKU pedidos, importe pedido, país del proveedor, moneda de facturación, tipo de cambio aplicado y su fecha, tasa de referencia, categoría/colección (vía `productos`), centro de coste, canal de recepción, estados de pedido/albarán/factura, excepciones, saldo pendiente. Esta matriz debe quedar también **visible en la app** (ver apartado 9).

### 6. Estructura del dashboard

Layout de arriba abajo, pensado para lectura ejecutiva (no una rejilla de gráficos iguales):

1. **Cabecera**: título, **fecha de corte**, periodo, "datos actualizados a…" y **barra de filtros globales** (apartado 8).
2. **KPIs principales (5–6 tarjetas)**, con valor grande, comparación interanual solo cuando sea válida y un "ⓘ" con la fórmula:
   - **Gasto neto del periodo** (EUR, definición oficial).
   - **Unidades pedidas** y nº de productos (SKU) distintos.
   - **Nº de pedidos** y **tasa de recepción** (recibido / pedido).
   - **Saldo pendiente de pago** (EUR, a fecha de corte).
   - **% de gasto en moneda extranjera** (USD + CNY) con aviso FX si procede.
   - **Importe en excepción** (EUR) y % de facturas en excepción.
3. **Evolución** (visual principal, ancho completo): gasto mensual con **una serie por año**, con alternancia entre gasto (EUR) y unidades pedidas, solo meses comparables.
4. **A quién compramos** (2 visuales): gasto y unidades por **proveedor** (barras horizontales, coloreadas por moneda); **ficha de proveedor** al hacer clic con país, moneda de facturación, canal, nº de pedidos, unidades, gasto, tasa de recepción y excepciones.
5. **De dónde y en qué moneda** (2 visuales): gasto y volumen por **país de procedencia**; gasto por **moneda de facturación** con panel **"Tipo de cambio"**: tasa aplicada frente a referencia del mes y su evolución (USD/EUR, CNY/EUR), con el aviso de calidad si procede.
6. **Qué compramos**: top productos/SKU por **gasto y unidades**, y distribución por categoría/colección (de `productos`).
7. **Pedido → recibido → facturado**: comparación de unidades y estado de pedidos (abiertos, parciales), pedidos pendientes de recibir y entregas incompletas por proveedor.
8. **Control de facturación**: embudo de facturas por `estado` (con la nota del desfase), excepciones por tipo, % que requiere humano y lista de las excepciones de mayor importe con enlace al documento afectado.
9. **Insights** (apartado 7).
10. **Cobertura de datos** (apartado 9), colapsable al final.

Reglas de diseño:
- Estética limpia y profesional; **respeta el sistema visual existente** (`card-wash`, `Panel`, tokens, tipografías) y refínalo solo donde mejore la legibilidad. **Elimina o fusiona** visuales redundantes antes de añadir nuevos.
- Un único elemento dominante por zona, mucho aire, cifras en fuente mono, 2–3 colores semánticos como máximo (neutro, alerta, positivo). Sin 3D ni donuts con más de 5 sectores.
- Cada gráfico: título-mensaje, unidad (EUR/uds), leyenda separada del área de trazado, tooltip con valor exacto y nota "cómo se calcula".
- Responsive, accesible (contraste, no depender solo del color, `aria-label`) y con `prefers-reduced-motion`. Modo claro por defecto, oscuro funcional.
- Estados de vacío, carga y error diseñados por bloque (esqueletos, sin saltos de layout).

### 7. Sección de Insights (exactamente 3 + 2 + 2)

- **3 conclusiones**: hallazgos con cifra (p. ej. concentración del gasto en N proveedores, evolución interanual del gasto y de las unidades, peso de la moneda extranjera o de un país).
- **2 riesgos**: p. ej. importe en excepción, exposición a divisa o tipo de cambio fuera de rango, pedidos sin recibir o entregas incompletas, facturas sin pedido, posibles duplicados, IBAN no coincidente, dependencia de un proveedor.
- **2 acciones recomendadas**: concretas, priorizadas y con responsable sugerido (p. ej. resolver las excepciones de mayor importe, revisar el tipo de cambio aplicado a un proveedor, reclamar entregas pendientes).

Requisitos:
- Se calculan con **reglas deterministas en el servidor** a partir de los datos y **de los filtros activos** (umbrales configurables); no son texto fijo ni generados sin base. No hay LLM conectado en esta fase: no lo simules.
- Cada insight muestra la **cifra que lo sustenta** y un atajo a la vista filtrada correspondiente.
- Si los datos filtrados no bastan para una conclusión válida, **no se muestra** y se indica "datos insuficientes".
- No conviertas hipótesis en hechos (p. ej. la anomalía del CNY: "posible", con recomendación de verificar).

### 8. Interactividad y filtros

- **Filtros globales** persistentes en la URL (compartibles): periodo (año/mes), **proveedor**, **país de procedencia**, **moneda de facturación**, **categoría/colección** de producto, **centro de coste** destinatario, **canal de recepción**, estado de factura y **fecha de corte**. **No incluyas filtros de cliente, segmento, ventas ni beneficio.**
- **Todos los KPIs, visuales e insights se recalculan con los filtros activos** (cálculo en servidor), con carga sin parpadeos y chips de "filtros activos" con opción de limpiar.
- Filtro cruzado por clic (proveedor, país, moneda, tipo de excepción) y enlace desde cualquier cifra a la tabla detalle de facturas/pedidos.
- Si una combinación de filtros no puede cruzarse en la base (p. ej. país del proveedor × categoría de producto si no hay relación), **deshabilítala y explica el motivo**. Si un filtro deja un visual sin datos suficientes, muestra estado vacío explicativo, nunca un gráfico engañoso.

### 9. Validación y transparencia (requisito clave)

- **"Cómo se calcula"** en cada KPI y visual: fórmula en lenguaje natural, tablas/columnas usadas, filtros y estados excluidos y fecha de corte.
- **Sección "Cobertura de datos"** en la app: métricas que se muestran, métricas que **no se pueden calcular y por qué** (ventas, ingresos, beneficio, margen y clientes, que no existen en esta base), y % de completitud de los campos clave.
- **Regla de completitud**: una métrica solo se muestra si sus datos fuente superan un umbral configurable (por defecto 95 % de las filas relevantes pobladas); si no, se sustituye por "Métrica no disponible: [motivo]". **NULL no es 0.**
- **Avisos de calidad** visibles donde apliquen: tipo de cambio, estado desfasado, carga en curso del robot, meses parciales.
- **Reconciliación interna**: el total por proveedor = por país = por moneda = por mes = KPI total para los mismos filtros; si no cuadra, avisa.
- Etiquetas en **español de España**, sin jerga técnica en la vista ejecutiva (los nombres de columna solo en "Cómo se calcula").

### 10. Backend y calidad técnica

- Route handlers que devuelvan **datos ya agregados** según filtros (no vuelques tablas al cliente). Considera vistas SQL de solo lectura (gasto neto por factura en EUR, volumen pedido/recibido/facturado por proveedor y SKU, excepciones abiertas) como fuente única de cifras; **enséñame cualquier migración antes de aplicarla**.
- Tipado con `src/lib/database.types.ts`; ninguna clave al cliente; consultas agregadas sin N+1.
- Verificación: `npm run lint` limpio, `npm run build` correcto y comprobación de las rutas en el puerto real del dev server. Contrasta al menos los KPIs principales con una consulta SQL independiente.

### 11. Entregables y orden de trabajo

1. **Diagnóstico** del dashboard actual: qué se mantiene, qué se elimina y qué se fusiona, y por qué.
2. **Matriz de cobertura de datos** verificada (apartado 5) y **definiciones oficiales** de gasto, volumen y conversión.
3. **Estructura propuesta con wireframe textual** (apartado 6).
4. **Pausa para mi confirmación.**
5. Implementación por fases (KPIs y filtros → evolución, proveedores y país/moneda → productos y pedido/recibido/facturado → control de facturación → insights → cobertura y validación), verificando cada fase.
6. **Resumen final**: qué cambió, qué se muestra, qué queda como no disponible y por qué, y qué debería poblar cada agente (Capturador, Conciliador, Clasificador) para desbloquear más visuales.

### 12. Criterios de aceptación

- El dashboard se centra en proveedores, pedidos, volumen, gasto, país, moneda y tipo de cambio; **no aparecen** ventas, revenue, beneficio, margen ni clientes.
- Todas las cifras proceden de datos presentes y suficientemente completos en Supabase.
- Gasto y volumen (unidades/productos) están claramente diferenciados y definidos.
- El tipo de cambio aplicado y su fecha son visibles y auditables por proveedor y moneda.
- KPIs, gráficos e insights se actualizan con los filtros y los totales cuadran entre visuales.
- Cada métrica tiene su definición accesible y la fecha de corte visible.
- Un directivo entiende la pantalla principal en menos de 2 minutos sin explicación técnica.
- Lint y build limpios; sin commits ni cambios en la base de datos.
