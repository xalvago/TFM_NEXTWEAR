# Portal de proveedor — Guangzhou Fashion Co. Ltd

Portal web de demostración del proveedor asiático (ficticio) que factura a Nextwear S.L. Es el origen del canal `portal_web` del sistema de Cuentas por Pagar: el robot de UiPath entra en el portal, descarga las facturas pendientes y las captura. Parte del TFM del Máster en Agentes de IA e Hiperautomatización de Procesos (EBIS). Interfaz en inglés.

App Next.js independiente del dashboard (que está en la raíz del repo), con su propio `package.json`.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4. Sin dependencias de gráficos: el gráfico de ventas es SVG propio.
- Sin backend ni base de datos: datos de ejemplo fijos en los componentes. La "autenticación" es de demo (`sessionStorage`).

## Rutas

| Ruta | Fichero | Contenido |
|---|---|---|
| `/` | `app/page.tsx` | Redirige a `/login` |
| `/login` | `app/login/page.tsx` | Formulario sobre vídeo de fondo a pantalla completa (tarjeta de cristal). Acepta cualquier usuario y contraseña no vacíos y guarda `authed` en `sessionStorage`. |
| `/dashboard` | `app/dashboard/page.tsx` | Tarjeta de perfil de la empresa, 4 KPI con foto de fondo, gráfico de barras de ventas 2026 vs 2025 y lista de facturas. |
| `/dashboard/invoices` | `app/dashboard/invoices/page.tsx` | Redirige a `/dashboard#invoices` (la lista de facturas con descarga de PDF está en el dashboard). |

`app/dashboard/layout.tsx` protege las rutas del dashboard (si no hay `authed`, redirige a `/login`) y pone el vídeo de fondo.

## Componentes (`app/components/`)

- `BackgroundVideoCycle` — alterna dos vídeos de fondo con fundido de 2,2 s (se desactiva con `prefers-reduced-motion`). Usado en el login.
- `Header` — marca, bienvenida y cierre de sesión (variantes `login` y `dashboard`).
- `SalesChart` — barras agrupadas 2026 vs 2025 por mes, con tooltip y % interanual.
- `AnimatedNumber` (cifras que cuentan hasta su valor), `SeigaihaPattern` (textura decorativa) y `ExportMotion` (ilustración SVG de prendas colgadas; hoy no se usa en ninguna página).
- `app/lib/asset.ts` — `asset(path)` antepone el `basePath` a rutas escritas a mano.

## Facturas de ejemplo

`public/invoices/` contiene los PDF servibles; la factura `F-2026-00349` figura como *Pending* (descargable) y el resto como *Completed*. `invoices/` (raíz) guarda los PDF originales de los 7 casos de prueba del TFM (limpia, importe distinto, sin pedido, duplicado, nota de crédito, entrega parcial, salto de divisa).

## Despliegue y `basePath`

- `next.config.ts` define `basePath: "/portal"` y `NEXT_PUBLIC_BASE_PATH`.
- Proyecto propio en Vercel (`tfm-nextwear-5dol`, Root Directory `PORTAL`, *Ignored Build Step* `git diff HEAD^ HEAD --quiet -- .`: solo se despliega si cambia `PORTAL/`).
- El dashboard lo expone en `/portal` con un rewrite en su `next.config.ts` (`PORTAL_ORIGIN` sobrescribe la URL).
- `<video>`, `<img>` y `<a>` escritos a mano deben usar `asset()`; `<Link>` y `next/image` ya llevan el prefijo.

```bash
npm install
npm run dev      # http://localhost:3000/portal
npm run build
npm run lint
```

## Origen de los vídeos de fondo

Los vídeos de fondo (`public/videos/`, copias de trabajo en `videos/`) **no son grabaciones reales**: proceden de una imagen inicial a la que se asignó un prompt para generar el vídeo con **Google Flow**.

### `Clothing_moving_on_rail_system_202608301221.mp4`

Generado el 2026-08-30 en Google Flow. Imagen inicial: _pendiente de indicar (fichero de la foto de partida)_.

Prompt:

```text
Cinematic, ultra-smooth seamless endless loop of a modern Asian fashion logistics center, designed as a clean web background responsive for all screen sizes and devices. Aesthetic overhead and medium tracking shot of stylish, colorful clothing hanging on a slick automated futuristic rail system, moving with very gentle, subtle, and continuous motion. Warm ambient lighting with soft bokeh and subtle, clean neon accents. Perfectly smooth seamless video loop where the beginning seamlessly blends into the end with no noticeable cut, jump, or abrupt change. Premium aesthetic, high resolution, slow motion, professional and elegant.
```

Uso: primer vídeo del ciclo de fondo del login (`BackgroundVideoCycle`).

### `1006-142621176.mp4`

Origen y prompt: _pendiente de documentar_. Se usa como segundo vídeo del ciclo del login y como fondo de `/dashboard` (`opacity-40`, `blur-[2px]`).

## Historial de cambios

Ver [`CHANGES.md`](./CHANGES.md).

## Pendientes conocidos

- `public/photos/container.jpg` lleva marca de agua de Freepik: solo apta para demo.
- `public/invoice-MDS-2025.pdf` conserva el nombre antiguo del proveedor (SinoTrans) y `package.json` se llama `sinotrans-portal`.
