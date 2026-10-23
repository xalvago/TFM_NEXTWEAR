# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Ver también `AGENTS.md`: **Next.js 16 tiene breaking changes** respecto a versiones previas. Consultar `node_modules/next/dist/docs/` antes de escribir código de Next.

## Stack real instalado

- **Next.js 16.2.10** (App Router) + **React 19.2.4** + TypeScript, con `src/` y alias `@/*`.
- **Tailwind CSS v4** (config vía `@import "tailwindcss"` + `@theme inline` en `src/app/globals.css`; sin `tailwind.config.js` clásico).
- shadcn/ui (compatible Tailwind v4) + Recharts.
- Supabase (`@supabase/supabase-js`) — acceso solo desde route handlers del backend.
- Copiloto: chat nativo cuyo backend es el bot externo ("FinFlow Bot", app propia en Vercel), reenviado por rewrite.

## Control de versiones — regla obligatoria

Repositorio remoto: `https://github.com/xalvago/TFM_NEXTWEAR.git` (branch `main`), conectado a Vercel para despliegue automático.

**Cada vez que se implemente un cambio en ficheros del proyecto (código, esquema, docs), hacer `git add` + `git commit` + `git push origin main` al terminar ese cambio**, sin esperar a que el usuario lo pida explícitamente. Mensajes de commit breves y descriptivos (qué cambió y por qué), nunca vacíos. No incluir nunca `.env.local` ni credenciales (ya cubierto por `.gitignore`). Si el push falla (conflicto, sin red, sin auth), avisar al usuario en vez de forzarlo (`--force`) o silenciarlo.

## Comandos

```bash
npm run dev      # arranca dashboard en http://localhost:3000
npm run build    # build de producción
npm run start    # sirve el build
npm run lint     # ESLint
```

Tipos de Supabase: regenerar tras cambios de esquema y guardar en `src/lib/database.types.ts` (generados vía MCP Supabase / `supabase gen types typescript`).

## Qué se construye

Dashboard web de control financiero y de inventario para Nextwear S.L. (retail ficticio), conectado en vivo a Supabase (Postgres). Incluye un copiloto conversacional (chat LLM) cuyo backend es una app externa (FinFlow Bot) (ver sección "Copiloto conversacional").

Es la capa de consulta y control humano (pull) de un sistema multiagente de Cuentas por Pagar con conciliación a tres bandas (factura vs. pedido vs. albarán) — TFM del Máster en Agentes de IA e Hiperautomatización de Procesos (EBIS).

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS + shadcn/ui + Recharts
- Route Handlers de Next.js (`app/api/...`) como único backend — nunca consultar Supabase desde el cliente con la service key
- Supabase (Postgres) vía `@supabase/supabase-js`
- Copiloto: chat nativo (`src/components/copilot/`) con backend en la app externa FinFlow Bot, reenviado por rewrite en `next.config.ts`; sin proveedor LLM propio.

## Conexión a Supabase — crítico

- Proyecto `EBIS_TFM_RETAIL_NEXTWEAR`, ref `rnmidwhumdrpxulfsbjo`, región `eu-west-3`.
- Credenciales solo en `.env.local` (documentar en `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- RLS activado en todas las tablas. Este dashboard es de solo lectura interno: acceder con service role **solo desde route handlers del servidor**, nunca exponerla al cliente (como mucho, anon key en cliente).
- Dashboard de solo lectura: no exponer operaciones de escritura sobre la base.

## Modelo de datos (schema `public`)

Cadena del proceso: **Proveedor → Pedido → Albarán → Factura**, con `tipos_cambio` y `centros_coste` como dimensiones. Rango temporal de los datos: abril/mayo/junio de 2024, 2025 y 2026 (mismos meses cada año, para comparación interanual).

| Tabla | Filas | PK | Rol / notas |
|---|---|---|---|
| `maestro_proveedores` | 10 | `proveedor_id` | Proveedores. `moneda_facturacion` ∈ {EUR,USD,CNY} (6/2/2). `canal_recepcion` ∈ {email,portal_web,api}. |
| `productos` | 20 | `sku` | Catálogo SKU moda urbana. `coste_unitario` (EUR), `categoria`, `coleccion`, `talla`, `color`. |
| `centros_coste` | 7 | `centro_coste_id` | `tipo` ∈ {tienda_fisica, ecommerce, almacen_central}. 5 tiendas + ecommerce + almacén. |
| `tipos_cambio` | 18 | (`fecha`,`moneda_origen`) | `moneda_origen` ∈ {USD,CNY} → EUR. `tasa_cambio` por fecha. |
| `pedidos` | 371 | `pedido_id` | `estado` ∈ {abierto, parcialmente_recibido, recibido_completo, cerrado, cancelado}. |
| `pedidos_lineas` | 918 | (`pedido_id`,`sku`) | `cantidad_pedida`, `precio_unitario_acordado`. |
| `albaranes` | 378 | `albaran_id` | `estado` ∈ {registrado, conciliado, discrepancia}. |
| `albaranes_lineas` | 809 | (`albaran_id`,`sku`) | `cantidad_entregada`. |
| `facturas` | 351 | `factura_id` | Tabla central. Doble moneda `_original`/`_eur`. Estado del ciclo. `motivo_excepcion`. |
| `facturas_lineas` | 828 | (`factura_id`,`linea_id`) | Detalle. `flag_revision`/`motivo_flag`, `centro_coste_id` por línea. |
| `stock_movimientos` | 797 | `movimiento_id` | `tipo_movimiento` ∈ {entrada,salida}. `valor_unitario_eur`, `stock_resultante`. |
| `casos_excepcion` | 73 | `caso_id` | Polimórfica (≥1 de `factura_id`/`albaran_id`/`pedido_id`, pueden coexistir). También `linea_id`, `origen_deteccion`. |
| `facturas_albaranes` | 382 | — | Vínculo N:M factura ↔ albarán (complementa el texto `facturas.albaran_ids_ref`). |
| `historial_estado_factura` | 0 | — | Auditoría de cambios de `facturas.estado` (FK a `facturas`). |
| `transiciones_estado_factura` | 24 | — | Matriz de transiciones de estado válidas (modo aviso). |
| `aprobaciones` | 0 | — | Aprobaciones de facturas (FK a `facturas`); incluye tipo `baja_confianza`. |
| `comunicaciones` | 0 | — | Comunicaciones con proveedores (FK a `facturas`). |
| `pagos` | 2 | — | Pagos de facturas (FK a `facturas`). |
| `asientos_contables` / `asientos_lineas` / `cuentas_contables` | 291 / 871 / 8 | — | ERP simulado: asientos por factura, sus líneas y plan de cuentas. Vista `asientos_descuadrados` (22 filas) lista los que no cuadran. |
| `log_agentes` | 15 | — | Logs de los agentes (`agente` = captura, conciliador…); FK a `facturas` y `casos_excepcion`. |
| `parametros_sistema` | 2 | — | Parámetros de configuración del sistema multiagente. |
| `stock_actual` (VISTA) | — | — | Columnas: `sku`, `centro_coste_id`, `cantidad_disponible`, `fecha_ultima_actualizacion`. **No trae valor**: para valorar, cruzar con `productos.coste_unitario` o el `valor_unitario_eur` de `stock_movimientos`. Solo lectura. |

### Campos clave

- **Doble moneda:** `facturas` (`*_original` / `*_eur`: `base_imponible`, `cuota_iva`, `total_factura`) y `facturas_lineas` (`precio_unitario_*`, `total_linea_*`). Para cualquier suma, total o KPI de dinero usar **siempre** las columnas `_eur` — nunca sumar `_original` de monedas distintas. `moneda_original` ∈ {EUR,USD,CNY}; `tipo_cambio_aplicado`/`fecha_tipo_cambio` dan auditabilidad.
- **`facturas.estado`** (flujo): `nueva_entrada → pendiente_captura → pendiente_conciliacion → conciliada_ok / en_excepcion → pendiente_aprobacion → aprobada / rechazada → contabilizada → pagada` (+ `anulada`). `en_excepcion` y `pendiente_aprobacion` requieren atención humana y deben ser visibles/filtrables de un vistazo.
- **`facturas.saldo_pendiente_eur`:** saldo neto tras notas de crédito y pagos — usar este campo para "deuda pendiente", no `total_factura_eur`.
- **Notas de crédito:** filas de `facturas` con `es_nota_credito = true` y `factura_original_id` apuntando a la factura rectificada. Importes **negativos** (ej. `total_factura_eur = -758.75`): reducen el gasto total neto. Sumar directamente ya resta.
- **`casos_excepcion` es polimórfica:** al menos una de `factura_id`/`albaran_id`/`pedido_id` está rellena por fila (`chk_al_menos_una_referencia`, ≥1 — pueden coexistir, p. ej. `entrega_incompleta` rellena `factura_id` y `albaran_id` a la vez); opcionalmente `linea_id`. `tipo_excepcion` ∈ {duplicado, importe_distinto, sin_pedido, nota_credito, salto_divisa, entrega_incompleta, iban_no_coincide} (7 valores; `entrega_parcial` se eliminó por redundante). `origen_deteccion` es texto libre a rellenar por el Conciliador (sin valores fijos todavía).
- **`facturas.albaran_ids_ref`** es texto (puede referenciar varios albaranes); `pedido_id_ref` referencia el pedido.

## Estructura del dashboard (4 pestañas)

**1. Vista ejecutiva** — KPIs (gasto total EUR del periodo, nº facturas, % en excepción, saldo pendiente EUR, nº pagos duplicados); gasto mensual EUR con comparación interanual 2024/2025/2026; gasto por centro de coste (tienda física vs ecommerce); gasto por proveedor (top 10) y por moneda de origen.

**2. Facturas y conciliación** — tabla filtrable de facturas (nº, proveedor, fecha, total EUR, estado, moneda; filtros por estado/proveedor/moneda/rango de fechas); panel de excepciones desde `casos_excepcion` con enlace al documento afectado; al abrir una factura, ver sus líneas, pedido y albaranes referenciados, resaltando `flag_revision`.

**3. Stock e inventario** — tabla de `stock_actual` por SKU y centro (filtro por categoría y centro); alertas de stock bajo (umbral configurable); valoración de inventario en EUR (cantidad × coste unitario EUR); cruce con pedidos abiertos/parciales para previsión de reposición.

**4. Proveedores** (`/proveedores`) — tarjetas y tabla de `maestro_proveedores` (moneda, canal de recepción, sede) y globo terráqueo (`d3-geo` ortográfico, `globo-proveedores.tsx`) que hace zoom a las sedes de las tarjetas visibles. Además hay páginas de detalle `/facturas/[id]`, `/pedidos/[id]` y `/albaranes/[id]`, y la sección de pagos dentro de Facturas (`components/pagos/`).

## Copiloto conversacional

Botón flotante (`copilot-launcher.tsx`, montado en `(app)/layout.tsx`, visible en todas las pestañas) que abre un panel con un **chat nativo** (`copilot-chat.tsx`). Toda la lógica LLM sigue en "FinFlow Bot" (app propia en Vercel, Gemini + Supabase): este repo solo la reenvía con un **rewrite** de `next.config.ts` (`/copilot-proxy/chat` → `https://finflow-bot-vercel.vercel.app/api/chat`); no hay route handler ni proveedor LLM propio. Antes era un iframe; se sustituyó para tener una vista inicial limpia (solo el campo de escritura), con preguntas de ejemplo (💡) e información (ⓘ) tras botones de la barra superior, modo ampliado y adjuntos (imagen/PDF, máx. 3 MB). Si cambia la URL del bot, editar `FINFLOW_BOT_ORIGIN` en `next.config.ts`. Contrato de la API: `POST {message, history, attachment?}` → `{reply, trace, history}` o `{error}`. Preguntas de ejemplo: "¿cuánto hemos gastado en proveedores chinos este trimestre?", "¿qué facturas están en excepción por duplicado?", "¿cuál es el saldo pendiente con Textil Norte?".

## Diseño visual

Estética moderna, editorial y limpia. Paleta cálida (crema/hueso de fondo, no blanco puro), acentos sobrios, buena jerarquía tipográfica. Tipografías sugeridas: serif con carácter para titulares (Fraunces o Newsreader) + sans legible para datos + mono (JetBrains Mono) para cifras y SQL. Tarjetas de KPI con número grande, tablas densas pero legibles, gráficos con tooltips. Modo claro por defecto, oscuro opcional. Cuidar espaciado, bordes suaves, microinteracciones discretas — nada de plantilla genérica de admin.

## Reglas de negocio (invariantes del código)

1. Sumas de dinero siempre en EUR (`_eur`), nunca sumar monedas `_original` distintas.
2. Notas de crédito restan (importes negativos): gasto neto = suma directa de `total_factura_eur` (las NC ya vienen negativas).
3. `stock_actual` es una vista de solo lectura: no escribir en ella, el stock se deriva de `stock_movimientos`.
4. Dashboard de solo lectura: sin operaciones de escritura sobre la base. **Única excepción documentada:** botón "Borrar facturas nuevas" en la pestaña Facturas (`src/components/facturas/borrar-nuevas-dialog.tsx` + `src/app/api/facturas/nuevas/route.ts`), pensado para deshacer cargas de prueba del robot UiPath. Sin input manual: detecta automáticamente qué `factura_id` quedan por encima del dataset base (`BASELINE_FACTURA_SEQ = 340` en `src/lib/constants.ts`, correspondiente a FAC-00001..FAC-00340 sin huecos), muestra en un diálogo de confirmación las facturas concretas que se van a borrar (con su total EUR, proveedor, nº de vínculos en `facturas_albaranes` columna "Albaranes" y nº de logs en `log_agentes` columna "Logs agente") y solo tras confirmar explícitamente borra en cascada `facturas_lineas` → `facturas_albaranes` → `log_agentes` → `casos_excepcion` → `historial_estado_factura` → `facturas`. `historial_estado_factura` tiene FK a `facturas` (se cuenta en el diálogo, columna "Historial"). `aprobaciones`, `comunicaciones`, `asientos_contables` y `pagos` también tienen FK a `facturas` pero **no** se borran de momento (decisión pendiente): si una factura nueva tuviera filas ahí, el borrado final fallaría por FK. `log_agentes` va **antes** de `casos_excepcion` y `facturas` porque tiene FK a ambas (`log_agentes_factura_id_fkey`, `log_agentes_caso_id_fkey`; filas con `agente = 'captura'` son los logs de la captura del robot para esa factura) — si se borrase después, esas dos fallarían por restricción de FK. El GET cuenta los vínculos `facturas_albaranes` y `log_agentes` por factura para mostrarlos antes de borrar; el DELETE devuelve cuántos se borraron realmente (`albaranesVinculosBorrados`, `logsAgentesBorrados`) y el diálogo lo refleja en el mensaje final ("Se han borrado N facturas, M vínculos en facturas_albaranes, L logs en log_agentes..."). Además borra los logs `log_agentes` con `agente = 'captura'` **huérfanos** (sin `factura_id` ni `caso_id`, capturas fallidas antes de crear la factura): el GET devuelve su número en `logsCapturaHuerfanos`, el diálogo avisa y se abre aunque no haya facturas nuevas si hay huérfanos, y el DELETE los suma a `logsAgentesBorrados`. La ruta (GET y DELETE) está protegida por la variable de entorno `ENABLE_BORRADO_FACTURAS`: solo con valor exacto `true` responde; si no, 403 (falla cerrado). Ninguna otra ruta debe realizar INSERT/UPDATE/DELETE.
5. Excepciones = prioridad: facturas `en_excepcion` y filas de `casos_excepcion` visibles y filtrables de un vistazo.

## Contexto académico

TFM del Máster en Agentes de IA e Hiperautomatización de Procesos (EBIS). Se evalúa robustez de la lógica, integración de IA de forma útil (no decorativa) y claridad. El copiloto debe demostrar uso real de LLM sobre datos de negocio, no un chatbot genérico. Priorizar que las cifras sean correctas y auditables sobre tener muchas funciones.

## UI / diseño implementado (estado actual)

Estética: SaaS moderno con "página viva" (gradientes estilo Apple + micro-animaciones), sobre base neutra fría. Marca = **NextWear** (el cliente ficticio), no "FinFlow". Modo claro por defecto.

### Sistema de diseño en `src/app/globals.css`

Tokens (en `:root` y `.dark`): `--gradient-brand` (morado→índigo→azul), `--gradient-brand-soft`, `--wash-card`, `--shadow-lift`, blobs `--aurora-1..4`, washes `--tint-violet/-sky/-rose`. Base `--background` = off-white frío (`#eceef7`) / oscuro (`#0e0e13`).

Utilidades/clases propias (en `@layer components`):
- `.app-aurora` — malla de gradiente ambiental (4 blobs) fija tras la app, deriva lenta. Se monta una vez en `(app)/layout.tsx`; el contenido va en un wrapper `relative z-10`.
- `.card-wash` — fondo con wash + hairline superior de luz (`::before`); es `position: relative`. Base de casi todos los contenedores.
- `.tint-violet/-sky/-rose` — fondo con tinte de color; **override de `card-wash`** (definidas después). Se aplican vía prop `tint` de `Panel`.
- `.hover-lift` — elevación al hover (translateY + `--shadow-lift`). Solo en tarjetas pequeñas tipo KPI, no en paneles grandes.
- `.gradient-text`, `.gradient-brand`, `.gradient-brand-soft`.
- `.icon-anim` — icono que reacciona al hover de su contenedor `.group` (scale+rotación). Añadir `group` al contenedor e `icon-anim` al `<Icon>`.
- Bloque `@media print` — imprime **solo** `.factura-print` (oculta nav/aurora/resto). Bloque `prefers-reduced-motion` desactiva animaciones.

### Layout y navegación
- **Navegación horizontal superior**: `src/components/top-nav.tsx` (sticky, glass `backdrop-blur-xl`, responsive). **Sustituyó** al sidebar + mobile-nav, que **fueron eliminados** (`sidebar.tsx`, `mobile-nav.tsx` ya no existen). Contenido a ancho completo centrado (`max-w-[1400px]`).
- Marca = logo imagen `public/logo.png` (copiado de `ejemplo/logo.png`) con `mix-blend-multiply` para fundirlo con el fondo (calibrado para tema claro; en oscuro haría falta PNG transparente). Sin caja blanca.
- `next.config.ts`: `devIndicators: false` (oculta la "N" flotante de dev). **Editar next.config reinicia el dev server y puede cambiar de puerto** (p. ej. de 3000 a 3002); comprobar el puerto real antes de curl.

### Componentes/patrones clave
- **`Panel`** (`components/panel.tsx`): prop `tint?: "violet"|"sky"|"rose"`; el contenedor de children es `flex min-h-0 flex-1 flex-col` para que paneles con scroll interno rellenen altura.
- **`PaginationBar`** (`components/ui/pagination-bar.tsx`): paginación cliente, `PAGE_SIZE = 12`. Usada en `FacturasTable` y `StockTable`.
- **Filtros embebidos**: `FacturasFilters`/`StockFilters` y `FacturasTable`/`StockTable` tienen prop `embedded`. En las páginas se envuelven filtros+tabla en **un solo** `card-wash` (filtros = cabecera con `border-b`, tabla sin card propia) para integrarlos. Controles estilo píldora: selects `rounded-full`, Moneda como segmentado (`SegChip`), Categoría como chips conmutables (`CatChip`).
- **Cap de altura de paneles laterales** (excepciones, previsión): patrón grid `xl:items-stretch` + columna izquierda (tabla) define la altura; la lateral usa wrapper `relative` con hijo `xl:absolute xl:inset-0` → el panel nunca supera la altura de la tabla y hace scroll interno. En móvil fluye normal.
- **`ExcepcionesPanel`** (cliente): buscador instantáneo (`useMemo`) por nº factura/albarán/pedido/descripción/tipo + chips de tipo (URL). Lista con `flex-1` scroll.
- **`ReposicionPanel`** (cliente): lista compacta (no tabla) con filtro por estado del pedido (chips) y orden (entrega próxima / mayor pendiente).
- **Gráficos** (`components/executive/charts.tsx`): animación de construcción recharts (`ANIM`: duration 1100, ease-out) + fade-in de aparición. Leyendas separadas del área del gráfico (bug corregido: se salían de la caja de altura fija) con divisor superior. Ejes de categoría con fuente 11 y ancho ampliado para no recortar nombres largos.

### Factura tipo (documento)
- `components/facturas/factura-documento.tsx` (cliente): representación con formato de factura a partir de `getFacturaDetalle`, renderizada en la página de detalle `facturas/[id]`. Papel siempre claro (colores fijos, no tokens de tema) → clase `.factura-print` + botón `window.print()`. Emisor = proveedor, cliente = Nextwear S.L. (const ficticia). Documento en moneda original con equivalente EUR; respeta las reglas de dinero.

### Vista ejecutiva
Orden: fila 1 = evolución (hero reducido, `tint violet`) + moneda (`tint sky`); fila 2 = KPIs (ya no fijos arriba); fila 3 = proveedor + centro. KPIs (`kpi-cards.tsx`) con barra de acento por tono, `hover-lift`, icono `icon-anim`.

### Convenciones al seguir trabajando
- Contenedores nuevos: usar `card-wash` (+ `tint` si aportan color), no `bg-card` plano.
- Tablas nuevas: cabeceras/celdas con `pl-4`/`pr-4`; columnas de texto largo `whitespace-normal`; paginar con `PaginationBar` si >~12 filas.
- Animaciones contenidas: la firma es la aurora; no añadir loops constantes por todas partes (evita apariencia "IA-generada").
- Verificar siempre: `npm run lint` limpio + `curl` de las 3 rutas (200) en el puerto real del dev server.

## Isométrica (guía de estilo visual vigente)

Criterios aplicados primero a la pestaña Stock e inventario, para extender al resto del dashboard. **Sustituyen** a la paleta morada/índigo descrita más arriba.

### Paleta (extraída del logo NextWear)
- Primario teal `#0a7d96` (AA con texto blanco); texto navy `#0f2236`; fondo base `#f8ece2`.
- Series de gráficos `--chart-1..5`: teal `#0a8fab`, coral `#ff6a3d`, ámbar `#f5a03a`, navy `#1b3f73`, gris `#94a3b8`.
- Estados semánticos (verde/rojo/ámbar/azul) sin cambios. Todo vía variables de `globals.css`; no usar colores sueltos en componentes.
- Dejan de usarse el morado y el índigo. Excepciones deliberadas: la "Factura tipo" imprimible (colores fijos) y el mapa/banderas de proveedores.

### Fondo
- `.app-flow`: degradado teal → ámbar → coral (pastel) en movimiento, ciclo 16 s (`--flow-1..3`).
- `.app-aurora`: blobs coral/ámbar en dos capas que derivan en sentidos opuestos (13 s y 17 s).
- `retail-backdrop.tsx` (montado en `(app)/layout.tsx`): 8 iconos lucide ampliados (bolsa, etiqueta, camiseta, tienda, carrito, paquete, regalo, ticket) con trazo fino en degradado y deriva de 22-30 s. No inventar formas: solo iconos de librería. En móvil solo 3 visibles. Se ocultan al imprimir y con `prefers-reduced-motion`.
- Fondo cálido a propósito: las tarjetas son frías/blancas y deben contrastar con él.
- Barra superior (`top-nav.tsx`): blanca sólida (`bg-white dark:bg-card`) porque el logo tiene fondo blanco.

### Contenedores
- Base `card-wash` + tinte opcional. Tintes: `tint-violet` = teal, `tint-sky` = azul→aqua, `tint-rose` = coral, `tint-amber`, y `tint-logo` (teal → coral en diagonal, para paneles principales). Los nombres son históricos; los colores ya son los del logo.
- `Block` (`executive/dense.tsx`) y `Panel` aceptan `tint="logo"`. `Block` admite además `heading` (nodo propio, p. ej. el `h1` de la página) que sustituye a `eyebrow` + `title`.

### Tablas
- Cabecera `.thead-brand`: fondo teal sólido, texto blanco, mayúsculas, negrita, extremos redondeados. Lleva `!important` en color/fondo/peso porque las utilidades de `TableHead` ganan a la capa `components`. No usar degradado (se ven costuras entre celdas).
- Ya la heredan todas las tablas basadas en `ui/table.tsx`; en tablas `<table>` sueltas añadir `thead-brand` al `<tr>`/`<thead>`.
- Excepción: "Factura tipo" imprimible.

### Filtros
- Patrón de Facturas: barra principal siempre visible (búsqueda con debounce 300 ms, selects en píldora, segmentado, "Limpiar") + botón "Más filtros" plegable con contador de activos para lo secundario.
- Stock: 4 visibles (búsqueda, categoría, centro, nivel); "Tipo de centro" y "Umbral" dentro de "Más filtros". Mismos parámetros de URL que antes.

### Gráficos 3D isométricos (`src/components/stock/iso-charts.tsx`)
- SVG puro, sin dependencias. Proyección isométrica real a 30°: x avanza arriba-derecha, y abajo-derecha (hacia el espectador), z sube (`iso([x,y,z]) = [(x+y)·0.866, (y−x)·0.5 − z]`). El eje horizontal es isométrico; los bloques se apoyan en una losa de suelo. Dibujar de atrás hacia delante.
- Bloque = 3 caras (izquierda oscura, frontal con degradado vertical, superior clara) con `color-mix(base, white/black)` + sombra `feDropShadow`. El color varía por posición entre dos tonos de la paleta (`from`/`to`): coral→ámbar por centros, teal→navy por categorías.
- Etiquetas en una segunda pasada con halo (`paint-order: stroke`) para que ningún bloque las tape; valores compactos ("100,6 mil €"); tooltip `<title>` con el importe exacto en EUR.
- Animación `.iso-bar` (crece desde el suelo, escalonado 70 ms) y brillo en hover.
- Encaje: `viewBox` calculado con la caja real del contenido (esquinas del suelo y cima de la columna más alta, no la última), márgenes laterales asimétricos, sin tope de altura. Un diamante isométrico deja huecos laterales si se estira: compensarlo rellenando el hueco con KPIs.
- API: `IsoColumns` / `IsoHBars` reciben `items: {key,label,value}[]`, `from`, `to`, `titulo`. Valores siempre en EUR.

### KPIs isométricos (`src/components/stock/iso-kpi.tsx`)
- `IsoKpi`: tarjeta con textos centrados (etiqueta, cifra, nota), tinte por significado y un cubo isométrico (46 px) del color del estado con el icono lucide tumbado en la cara superior (`rotate(-30deg) skewX(30deg) scaleY(0.866)`). Hover: el cubo se eleva 3 px. Tooltip ⓘ opcional.
- Pendiente de extender: `StatTile` sigue en Facturas, Proveedores y Vista ejecutiva.

### Composición de la pestaña Stock (referencia)
- Un único `Block tint="logo"` con el `h1` dentro (`heading`), para que suba hasta la barra superior. Dos mitades: columnas isométricas a la izquierda; barras isométricas arriba a la derecha y cuadrícula 2×2 de `IsoKpi` debajo. Después, filtros + tabla en un solo contenedor y panel de previsión con scroll interno.

### Cómo aplicarlo al resto
1. Cabecera de cada pestaña dentro de un `Block tint="logo" heading={…}`.
2. Sustituir `StatTile` por `IsoKpi`.
3. Gráficos de barras/columnas con `IsoColumns`/`IsoHBars`.
4. Tablas con `.thead-brand`; filtros con el patrón principal + "Más filtros".
5. Verificar en el navegador cada cambio visual y tras tocar `globals.css` comprobar que el dev server sirve el CSS nuevo (si no, reiniciarlo).

## Portal (`PORTAL/`)

App Next.js independiente (Next 15, `basePath: "/portal"`) con su propio `package.json`. Segundo proyecto de Vercel (`tfm-nextwear-5dol`, Root Directory `PORTAL`, *Ignored Build Step* `git diff HEAD^ HEAD --quiet -- .`: solo se despliega si cambia `PORTAL/`). El dashboard la expone en `/portal` con un rewrite en `next.config.ts` (`PORTAL_ORIGIN` sobrescribe la URL por defecto). `tsconfig.json` y `eslint.config.mjs` del dashboard excluyen `PORTAL`. Rutas escritas a mano (`<video>`, `<img>`, `<a>`) deben pasar por `asset()` (`PORTAL/app/lib/asset.ts`) para llevar el prefijo.
