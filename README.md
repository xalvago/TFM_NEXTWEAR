# FinFlow — Dashboard de Cuentas por Pagar (Nextwear S.L.)

Dashboard de control financiero y de inventario, conectado en vivo a Supabase, con un copiloto conversacional en modo demo (sin LLM conectado todavía). TFM del Máster en Agentes de IA e Hiperautomatización de Procesos (EBIS). Ver [`CLAUDE.md`](./CLAUDE.md) para el detalle completo de modelo de datos, reglas de negocio y decisiones de diseño.

## Configuración

1. Copia `.env.example` a `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. Rellena `SUPABASE_SERVICE_ROLE_KEY` con la service role key del proyecto Supabase (**Project Settings → API → service_role**). Es secreta: solo se usa en route handlers del servidor, nunca llega al cliente.

3. (Opcional, copiloto real) Rellena `LLM_PROVIDER` / `LLM_API_KEY` / `LLM_MODEL` cuando se decida el proveedor. Mientras estén vacías, el copiloto corre en modo mock.

## Arrancar

```bash
npm install
npm run dev      # http://localhost:3000
```

Otros comandos:

```bash
npm run build    # build de producción
npm run start    # sirve el build
npm run lint     # ESLint
npx tsc --noEmit # typecheck
```

Health-check de la conexión a Supabase: `GET /api/health` (SELECT de prueba a `facturas`).

## Arquitectura

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + shadcn/ui + Recharts.
- **Backend**: Route Handlers de Next.js (`src/app/api/*`). Supabase se consulta **solo** desde el servidor con la service role key (`src/lib/supabase/server.ts`, con `import "server-only"` para que el bundler impida su uso desde el cliente).
- **Datos**: capa de queries tipada en `src/lib/queries/*` (ejecutiva, facturas, stock), server-only, que agrega/filtra sobre las tablas de Supabase. Lógica de negocio (conversión de divisa, neto de notas de crédito) centralizada en `src/lib/finance.ts`.
- **Dashboard de solo lectura**: no hay mutaciones sobre la base desde la app.

### Copiloto conversacional (modo demo)

Arquitectura agnóstica de proveedor, pensada para enchufar un LLM real más adelante sin rehacer la UI:

- `src/lib/llm/types.ts` — interfaz `LLMProvider` (`ask(question, schemaContext) → AskResult`).
- `src/lib/llm/mock-provider.ts` — `MockLLMProvider`: reconoce por palabras clave un set de preguntas de ejemplo y responde con **datos reales** de Supabase (no inventa números), mostrando además el SQL ilustrativo que un proveedor real generaría.
- `src/lib/llm/sql-guard.ts` — `validateReadOnlySql`: allow-list de solo `SELECT`, rechaza `insert/update/delete/drop/alter` y similares, fuerza `LIMIT`. Se aplica ya al SQL ilustrativo del mock; debe aplicarse también al SQL de cualquier proveedor real antes de ejecutarlo.
- `src/lib/llm/index.ts` — `getLLMProvider()`: único punto de decisión mock vs. real, según `process.env.LLM_PROVIDER`. Marcado con `// TODO: conectar proveedor LLM real aquí`.
- `src/app/api/copiloto/route.ts` — route handler que expone el pipeline.
- `src/components/copilot/*` — UI del chat (botón flotante + panel lateral, disponible en las 3 pestañas), con badge "Modo demo · LLM no conectado", tabla de resultados y SQL colapsable.

Preguntas que resuelve hoy en modo demo: gasto en proveedores chinos del trimestre, facturas en excepción por duplicado, stock de sudaderas en Tienda Madrid Centro, saldo pendiente con Textil Norte S.L.
