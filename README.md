# NextWear — Dashboard de Cuentas por Pagar

Dashboard de control financiero y de inventario de Nextwear S.L. (retail ficticio), conectado en vivo a Supabase (Postgres), con un copiloto conversacional (chat LLM) y un portal de proveedores. Es la capa de consulta y control humano de un sistema multiagente de Cuentas por Pagar con conciliación a tres bandas (factura vs. pedido vs. albarán). TFM del Máster en Agentes de IA e Hiperautomatización de Procesos (EBIS).

Ver [`CLAUDE.md`](./CLAUDE.md) para el detalle de modelo de datos, reglas de negocio y decisiones de diseño.

## Secciones

| Ruta | Contenido |
|---|---|
| `/` | Vista ejecutiva: KPIs, gasto mensual con comparación interanual, por centro de coste, proveedor y moneda |
| `/facturas` | Facturas y conciliación: tabla filtrable, panel de excepciones, pagos, borrado de cargas de prueba |
| `/facturas/[id]`, `/pedidos/[id]`, `/albaranes/[id]` | Detalle de documento (factura tipo imprimible, líneas, vínculos) |
| `/stock` | Stock e inventario: valoración, alertas, previsión de reposición, gráficos isométricos |
| `/proveedores` | Proveedores: tarjetas, tabla y globo terráqueo con las sedes |
| `/portal` | Portal de proveedores (app independiente en `PORTAL/`, servida por rewrite) |

## Configuración

1. Copia `.env.example` a `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. Rellena `SUPABASE_SERVICE_ROLE_KEY` (**Project Settings → API → service_role**). Es secreta: solo se usa en route handlers del servidor, nunca llega al cliente.

3. (Opcional) `PORTAL_ORIGIN` sobrescribe la URL del portal usada por el rewrite `/portal`.

## Arrancar

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # build de producción
npm run start    # sirve el build
npm run lint     # ESLint
npx tsc --noEmit # typecheck
```

Health-check de la conexión a Supabase: `GET /api/health`.

## Arquitectura

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + shadcn/ui + Recharts. Gráficos isométricos en SVG propio (`src/components/stock/iso-charts.tsx`) y globo con `d3-geo`.
- **Backend**: Route Handlers (`src/app/api/*`). Supabase se consulta **solo** desde el servidor con la service role key (`src/lib/supabase/server.ts`, con `import "server-only"`).
- **Datos**: capa de queries tipada en `src/lib/queries/*` (ejecutiva, facturas, compras, documentos, pagos, proveedores, stock, cobertura). Lógica de negocio (divisa, neto de notas de crédito) en `src/lib/finance.ts`. Tipos generados en `src/lib/database.types.ts`.
- **Esquema**: migraciones SQL en `supabase/migrations/` (ver `MIGRACION_RESULTADO.md`); esquema de referencia en `ejemplo/`.
- **Solo lectura**: única escritura documentada, `DELETE /api/facturas/nuevas` (botón "Borrar facturas nuevas", deshace cargas de prueba del robot UiPath). Ver regla 4 de `CLAUDE.md`.

### Copiloto conversacional

Chat nativo (`src/components/copilot/`, botón flotante visible en todas las pestañas). No hay proveedor LLM ni route handler propio: la lógica (Gemini + Supabase) vive en la app externa **FinFlow Bot** (Vercel) y este repo la reenvía con un rewrite de `next.config.ts` (`/copilot-proxy/chat` → `https://finflow-bot-vercel.vercel.app/api/chat`). Contrato: `POST {message, history, attachment?}` → `{reply, trace, history}` o `{error}`. Admite adjuntos imagen/PDF (máx. 3 MB). Si cambia la URL del bot, editar `FINFLOW_BOT_ORIGIN` en `next.config.ts`.

### Portal (`PORTAL/`)

App Next.js independiente (Next 15, `basePath: "/portal"`) con su propio `package.json` y proyecto de Vercel. El dashboard la expone en `/portal` con un rewrite. Ver [`PORTAL/README.md`](./PORTAL/README.md).

## Despliegue

Repositorio `xalvago/TFM_NEXTWEAR` (rama `main`) conectado a Vercel: cada push despliega automáticamente.
