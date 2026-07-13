# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Ver también `AGENTS.md`: **Next.js 16 tiene breaking changes** respecto a versiones previas. Consultar `node_modules/next/dist/docs/` antes de escribir código de Next.

## Stack real instalado

- **Next.js 16.2.10** (App Router) + **React 19.2.4** + TypeScript, con `src/` y alias `@/*`.
- **Tailwind CSS v4** (config vía `@import "tailwindcss"` + `@theme inline` en `src/app/globals.css`; sin `tailwind.config.js` clásico).
- shadcn/ui (compatible Tailwind v4) + Recharts.
- Supabase (`@supabase/supabase-js`) — acceso solo desde route handlers del backend.
- Copiloto: capa agnóstica de proveedor, en modo mock (sin LLM conectado todavía).

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

Dashboard web de control financiero y de inventario para Nextwear S.L. (retail ficticio), conectado en vivo a Supabase (Postgres). Incluye un copiloto conversacional (chat LLM) cuya interfaz y arquitectura se dejan preparadas en esta fase, pero **sin conectar a ningún LLM todavía** (proveedor por decidir).

Es la capa de consulta y control humano (pull) de un sistema multiagente de Cuentas por Pagar con conciliación a tres bandas (factura vs. pedido vs. albarán) — TFM del Máster en Agentes de IA e Hiperautomatización de Procesos (EBIS).

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS + shadcn/ui + Recharts
- Route Handlers de Next.js (`app/api/...`) como único backend — nunca consultar Supabase desde el cliente con la service key
- Supabase (Postgres) vía `@supabase/supabase-js`
- Copiloto: agnóstico del proveedor mediante capa de abstracción (ver sección "Copiloto conversacional"). En esta fase **sin conectar**, con un `MockLLMProvider`; el proveedor real (Claude/OpenAI/Gemini/otro) se enchufa después. Llamado **siempre** desde route handlers, nunca desde el cliente.

## Conexión a Supabase — crítico

- Proyecto `EBIS_TFM_RETAIL_NEXTWEAR`, ref `rnmidwhumdrpxulfsbjo`, región `eu-west-3`.
- Credenciales solo en `.env.local` (documentar en `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Bloque LLM comentado y opcional (`LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`) para rellenar cuando se decida el proveedor — sin ellos el copiloto corre en modo mock.
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
| `pedidos` | 363 | `pedido_id` | `estado` ∈ {abierto, parcialmente_recibido, recibido_completo, cerrado, cancelado}. |
| `pedidos_lineas` | 906 | (`pedido_id`,`sku`) | `cantidad_pedida`, `precio_unitario_acordado`. |
| `albaranes` | 369 | `albaran_id` | `estado` ∈ {registrado, conciliado, discrepancia}. |
| `albaranes_lineas` | 797 | (`albaran_id`,`sku`) | `cantidad_entregada`. |
| `facturas` | 334 | `factura_id` | Tabla central. Doble moneda `_original`/`_eur`. Estado del ciclo. `motivo_excepcion`. |
| `facturas_lineas` | 804 | (`factura_id`,`linea_id`) | Detalle. `flag_revision`/`motivo_flag`, `centro_coste_id` por línea. |
| `stock_movimientos` | 797 | `movimiento_id` | `tipo_movimiento` ∈ {entrada,salida}. `valor_unitario_eur`, `stock_resultante`. |
| `casos_excepcion` | 84 | `caso_id` | Polimórfica (una de `factura_id`/`albaran_id`/`pedido_id`). También `linea_id`. |
| `stock_actual` (VISTA) | — | — | Columnas: `sku`, `centro_coste_id`, `cantidad_disponible`, `fecha_ultima_actualizacion`. **No trae valor**: para valorar, cruzar con `productos.coste_unitario` o el `valor_unitario_eur` de `stock_movimientos`. Solo lectura. |

### Campos clave

- **Doble moneda:** `facturas` (`*_original` / `*_eur`: `base_imponible`, `cuota_iva`, `total_factura`) y `facturas_lineas` (`precio_unitario_*`, `total_linea_*`). Para cualquier suma, total o KPI de dinero usar **siempre** las columnas `_eur` — nunca sumar `_original` de monedas distintas. `moneda_original` ∈ {EUR,USD,CNY}; `tipo_cambio_aplicado`/`fecha_tipo_cambio` dan auditabilidad.
- **`facturas.estado`** (flujo): `pendiente_captura → pendiente_conciliacion → conciliada_ok / en_excepcion → pendiente_aprobacion → aprobada / rechazada → contabilizada → pagada` (+ `anulada`). `en_excepcion` y `pendiente_aprobacion` requieren atención humana y deben ser visibles/filtrables de un vistazo.
- **`facturas.saldo_pendiente_eur`:** saldo neto tras notas de crédito y pagos — usar este campo para "deuda pendiente", no `total_factura_eur`.
- **Notas de crédito:** filas de `facturas` con `es_nota_credito = true` y `factura_original_id` apuntando a la factura rectificada. Importes **negativos** (ej. `total_factura_eur = -758.75`): reducen el gasto total neto. Sumar directamente ya resta.
- **`casos_excepcion` es polimórfica:** exactamente una de `factura_id`/`albaran_id`/`pedido_id` está rellena por fila (opcionalmente `linea_id`). `tipo_excepcion` ∈ {duplicado, importe_distinto, sin_pedido, nota_credito, entrega_parcial, salto_divisa, producto_no_reconocido, entrega_incompleta, mercancia_danada}.
- **`facturas.albaran_ids_ref`** es texto (puede referenciar varios albaranes); `pedido_id_ref` referencia el pedido.

## Estructura del dashboard (3 pestañas)

**1. Vista ejecutiva** — KPIs (gasto total EUR del periodo, nº facturas, % en excepción, saldo pendiente EUR, nº pagos duplicados); gasto mensual EUR con comparación interanual 2024/2025/2026; gasto por centro de coste (tienda física vs ecommerce); gasto por proveedor (top 10) y por moneda de origen.

**2. Facturas y conciliación** — tabla filtrable de facturas (nº, proveedor, fecha, total EUR, estado, moneda; filtros por estado/proveedor/moneda/rango de fechas); panel de excepciones desde `casos_excepcion` con enlace al documento afectado; al abrir una factura, ver sus líneas, pedido y albaranes referenciados, resaltando `flag_revision`.

**3. Stock e inventario** — tabla de `stock_actual` por SKU y centro (filtro por categoría y centro); alertas de stock bajo (umbral configurable); valoración de inventario en EUR (cantidad × coste unitario EUR); cruce con pedidos abiertos/parciales para previsión de reposición.

## Copiloto conversacional — interfaz preparada, sin conectar

En esta fase se construye **solo la interfaz del chat y su arquitectura de backend, sin conectar a ningún LLM todavía**. El proveedor (Claude/OpenAI/Gemini/otro) se decide después, así que el diseño debe ser **agnóstico del proveedor**.

- Panel de chat lateral o modal, disponible en todas las pestañas, totalmente maquetado y funcional en UI (input, historial de mensajes, estados de carga).
- **Capa de abstracción:** interfaz única `LLMProvider` con método `ask(question, schemaContext) -> sqlOrAnswer`, implementada por `MockLLMProvider` (respuestas simuladas/fijas) para probar la UI sin proveedor real. El proveedor real se añade después como otra clase que cumpla la misma interfaz.
- Si no hay proveedor configurado, el chat corre en modo mock y lo indica en la UI ("Copiloto en modo demo — LLM no conectado").
- **Arquitectura backend ya lista (text-to-SQL controlado)** para cuando se conecte:
  1. Route handler recibe la pregunta en lenguaje natural.
  2. Se envía al `LLMProvider` junto con el esquema de tablas (nombres, columnas, tipos, relaciones) como contexto.
  3. El proveedor devuelve SQL de **solo lectura** (SELECT). El backend valida que empiece por `select`, rechaza `insert/update/delete/drop/alter`, añade `LIMIT` y timeout.
  4. Se ejecuta contra Supabase y el resultado se devuelve al proveedor para redactar respuesta en lenguaje natural, o se pinta directo en tabla/gráfico.
- Marcar el punto de conexión en el código con `// TODO: conectar proveedor LLM real aquí`.
- Alternativa si text-to-SQL libre resulta demasiado arriesgado: exponer un set de herramientas/consultas predefinidas parametrizadas y que el LLM elija cuál llamar (function calling), evitando SQL libre.
- Seguridad (aplica cuando se conecte): allow-list de solo SELECT, `LIMIT` de filas, timeout. Nunca ejecutar SQL generado sin validar. Nunca exponer claves al cliente.

Preguntas de ejemplo que deberá resolver una vez conectado: "¿cuánto hemos gastado en proveedores chinos este trimestre?", "¿qué facturas están en excepción por duplicado?", "¿qué stock de sudaderas queda en la tienda de Madrid?", "¿cuál es el saldo pendiente con Textil Norte?".

## Diseño visual

Estética moderna, editorial y limpia. Paleta cálida (crema/hueso de fondo, no blanco puro), acentos sobrios, buena jerarquía tipográfica. Tipografías sugeridas: serif con carácter para titulares (Fraunces o Newsreader) + sans legible para datos + mono (JetBrains Mono) para cifras y SQL. Tarjetas de KPI con número grande, tablas densas pero legibles, gráficos con tooltips. Modo claro por defecto, oscuro opcional. Cuidar espaciado, bordes suaves, microinteracciones discretas — nada de plantilla genérica de admin.

## Reglas de negocio (invariantes del código)

1. Sumas de dinero siempre en EUR (`_eur`), nunca sumar monedas `_original` distintas.
2. Notas de crédito restan (importes negativos): gasto neto = suma directa de `total_factura_eur` (las NC ya vienen negativas).
3. `stock_actual` es una vista de solo lectura: no escribir en ella, el stock se deriva de `stock_movimientos`.
4. Dashboard de solo lectura: sin operaciones de escritura sobre la base.
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
