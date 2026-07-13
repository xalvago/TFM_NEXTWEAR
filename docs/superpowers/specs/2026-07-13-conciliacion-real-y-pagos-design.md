# Conciliación real (facturas_albaranes) + sección Pagos — design

## Contexto

Tras la migración de `ejemplo/CLAUDE_CODE_mejoras.md` (ver `supabase/migrations/`), la BD tiene datos que el dashboard aún no refleja:
- `facturas_albaranes` (370 filas, JOIN real factura↔albarán) — hoy `getFacturaDetalle` sigue parseando el texto libre `albaran_ids_ref`.
- `casos_excepcion.estado_resolucion` (default 'abierto' en las 84 filas) — no se muestra en ningún sitio.
- `pagos` (0 filas) — no hay UI que la lea. Ningún estado de factura es `pagada` hoy (287 `pendiente_conciliacion`, 47 `en_excepcion`).

Objetivo: reflejar el JOIN real y el estado de resolución (dato ya poblado), añadir una sección de Pagos filtrable, y sembrar 2 facturas demo en estado `pagada` con su fila en `pagos` para que la UI no se vea vacía.

## Alcance

Dentro: cambios en `src/lib/queries/facturas.ts`, `src/lib/finance.ts`, `src/components/facturas/*`, `src/app/(app)/facturas/page.tsx`, nuevo `src/lib/queries/pagos.ts` + componentes de Pagos, 2 UPDATE + 2 INSERT de datos demo vía MCP Supabase, regenerar `database.types.ts` si cambia el esquema (no cambia — solo datos).

Fuera: nueva pestaña de navegación, pesos de asientos_contables/DPO/forecast (futuro), edición/escritura desde la UI (dashboard sigue siendo solo lectura), tocar `factura-documento.tsx` (documento fiscal, no lleva metadata de conciliación).

## A. Conciliación real

- `getFacturaDetalle` (`src/lib/queries/facturas.ts`): eliminar `parseAlbaranIds` + query `.in()` a `albaranes`. Sustituir por `.from("facturas_albaranes").select("albaranes(albaran_id, estado, fecha_entrega)").eq("factura_id", facturaId)`, mapeando el array de relaciones a `AlbaranRef[]`.
- `CasoExcepcionItem`: añadir `estado_resolucion: string | null`. Se rellena en `getCasosExcepcion` (añadir columna al `.select`) y en el mapeo manual de `casos` dentro de `getFacturaDetalle` (añadir `estado_resolucion` al `.select` de esa query y al objeto mapeado).
- `finance.ts`: añadir `iban_no_coincide: "IBAN no coincide"` a `TIPO_EXCEPCION_LABEL`. Nuevo `ESTADO_RESOLUCION_LABEL` (abierto/en_revision/resuelto_ok/resuelto_fraude/descartado) y `estadoResolucionTone()` (mismo patrón que `estadoTone`: resuelto_ok→ok, resuelto_fraude→exception, abierto/en_revision→pending, descartado→neutral).
- `ExcepcionesPanel`: cada `<li>` añade un segundo `StateBadge` con tono/label de resolución junto al de tipo. El haystack de búsqueda incluye el label de resolución.
- `facturas/[id]/page.tsx`: el panel "Casos de excepción" del rail añade el mismo badge de resolución.

## B. Sección Pagos

- `src/lib/queries/pagos.ts` (nuevo): `getPagos(filtros?: { estadoPago?: string })`. Query: `pagos` + `facturas(numero_factura, razon_social_proveedor)` (denormalizado en `facturas`, sin JOIN a `maestro_proveedores`). Devuelve `PagoListItem[]`: `pago_id, factura_id, numero_factura, razon_social, fecha_pago, fecha_vencimiento, importe_eur, estado_pago, es_pago_parcial, medio_pago`.
- `finance.ts`: `PAGO_ESTADO_LABEL` (programado/retenido/ejecutado/rechazado/anulado) + `pagoEstadoTone()` (ejecutado→ok, rechazado→exception, programado/retenido→pending, anulado→neutral).
- `src/components/pagos/pagos-section.tsx` (nuevo, client): filtro por chips segmentados de `estado_pago` (patrón `SegChip` ya usado en `filters.tsx` para moneda), vía searchParam `pagoEstado` (namespace propio, no choca con los filtros de facturas).
- `src/components/pagos/pagos-table.tsx` (nuevo): mismo patrón visual que `FacturasTable` (Table/TableHeader/TableRow, link a `/facturas/[factura_id]`), sin paginación (dataset pequeño). Columnas: Factura, Proveedor, Fecha pago, Vencimiento, Importe EUR, Medio, Estado (badge), Parcial (badge si `es_pago_parcial`).
- `facturas/page.tsx`: añadir `getPagos(sp.pagoEstado)` al `Promise.all`, nuevo `<Panel eyebrow="Tesorería" title="Pagos">` de ancho completo debajo del grid existente, conteniendo `PagosSection`.

## C. Datos demo

Vía MCP Supabase (`apply_migration`, nombre `08_seed_pagos_demo`, guardado también en `supabase/migrations/08_seed_pagos_demo.sql`):
- Elegir 2 `facturas` en `estado='pendiente_conciliacion'` (no `en_excepcion`, no `es_nota_credito`) con `total_factura_eur > 0`.
- `UPDATE facturas SET estado='pagada', saldo_pendiente_eur=0 WHERE factura_id IN (...)`.
- `INSERT INTO pagos`: `estado_pago='ejecutado'`, `importe_eur=total_factura_eur`, `importe_original=total_factura_original`, `moneda=moneda_original`, `fecha_pago=fecha_vencimiento`, `fecha_vencimiento=fecha_vencimiento`, `medio_pago='transferencia'`, `es_pago_parcial=false`, `iban_destino=` IBAN del proveedor si existe. `asiento_id` queda `NULL` (FK opcional, no se rellena `asientos_contables` en este alcance).

## Verificación

- `npm run lint` limpio.
- `curl` a `/facturas` y `/facturas/[id]` de una de las 2 facturas demo → 200, contenido visible (Pagos section con 1 fila, badge "Pagada").
- Filtro Estado="Pagada" en `/facturas` → devuelve las 2 facturas demo.
- Chip "Ejecutado" en sección Pagos → misma 2 filas.
- Detalle de una factura con caso de excepción existente → badge de resolución visible junto al de tipo.
- Detalle de una factura con albarán real → tarjeta de albarán sigue mostrándose igual que antes (mismos datos, ahora vía JOIN en vez de parseo de texto).
