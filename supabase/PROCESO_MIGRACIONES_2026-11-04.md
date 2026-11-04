# Proceso: cuadrar repositorio ↔ historial de Supabase (04/11/2026)

Registro de lo hecho, para poder revertir. Proyecto Supabase `rnmidwhumdrpxulfsbjo`. Rama de trabajo: `docs/migraciones-04-11` (creada desde `main` en `fec64d2`).

## Principios
- **Base de datos: solo lecturas, con una única excepción autorizada expresamente por el usuario en el paso 7:** `UPDATE transiciones_estado_factura SET descripcion = btrim(descripcion) WHERE transicion_id = 'T-07'` (quitó 3 espacios iniciales; 114 → 111 caracteres). Revertir: `UPDATE transiciones_estado_factura SET descripcion = '   ' || descripcion WHERE transicion_id = 'T-07';`
- Ninguno de los 29 ficheros de migración existentes se ha tocado.
- Ni commit ni push en la rama hasta confirmación expresa.

## Pasos completados

| Paso | Qué se hizo | Efecto en disco |
|---|---|---|
| 1 | `git checkout -b docs/migraciones-04-11`; inventario de `supabase/` | Solo la rama |
| 2 | `SELECT version, name FROM supabase_migrations.schema_migrations` → 35 migraciones | Ninguno |
| 3 | Comparación SQL repo ↔ historial (md5 del SQL sin comentarios ni espacios) | Ninguno |
| 4 | Creados `30_`, `31_`, `32_` con el SQL exacto del historial (hash verificado) | 3 ficheros nuevos |

### Resultado del paso 3
- 26 de 35 migraciones: SQL idéntico al fichero (el fichero solo añade comentarios).
- 3 agrupadas en `21_casos_excepcion_referencia_multiple.sql`: cubre el efecto neto, no literal (no tiene `drop expression`, crea `origen_deteccion` como `text` plano y añade un `UPDATE factura_id = factura_relacionada_id` que no está en el historial).
- 3 faltaban → pasos 4 (`30`, `31`, `32`).
- 2 con SQL distinto, **sin modificar** (el fichero contiene SQL no registrado en el historial):
  - `15_asientos_contables_erp.sql`: bloque 4 (notas de crédito) usa importes de cabecera con 708 en línea 2 y 472 en línea 3. El historial agrega por `facturas_lineas`, que las NC no tienen. Parece la versión corregida aplicada a mano.
  - `18_direccion_sede_proveedores.sql`: el fichero añade al final un `UPDATE facturas SET direccion_proveedor = mp.direccion_sede …` que no está en el historial.

### Ficheros creados en el paso 4

| Fichero | Versión del historial | md5 (SQL sin comentarios) |
|---|---|---|
| `30_create_facturas_tc_portal.sql` | 20260924081019 | d3f9329382a74411ed57d3ee48cdd373 |
| `31_drop_facturas_tc_portal.sql` | 20260924083227 | 761e7b04f1fc44e3b7897f5a7499c5c3 |
| `32_casos_excepcion_tipo_multifactura.sql` | 20261022143230 | f095690f6d83c3167d1acbc2b50e1357 |

Nota: `30` + `31` tienen efecto neto nulo (crean y borran `facturas_tc_portal`). `MIGRACION_RESULTADO.md` las marcaba como omitidas a propósito; se exportan igualmente por petición expresa.

## Pasos pendientes

| Paso | Qué hará | Efecto en disco |
|---|---|---|
| 5 ✔ | `cambios_manuales_2026-11-04.sql` comparado con el contenido acordado: idéntico | Ninguno |
| 6 ✔ | Verificación: 4 asientos, 10 apuntes, 8 cuentas (con 608, sin 708) OK; T-07 con 3 espacios iniciales | Ninguno |
| 7 ✔ | `UPDATE` btrim sobre T-07 (autorizado) y `MIGRACION_RESULTADO.md` actualizado (filas 30-32, notas de 21/15/18, totales, corrección T-07) | 1 fichero modificado + 1 fila en BD |
| 8 (pendiente) | `git status` + `git diff --stat`; con confirmación: `git add supabase/`, commit y `git push -u origin docs/migraciones-04-11` | Commit y push |

## Cómo revertir

Según hasta dónde se haya llegado:

- **Antes del commit (estado actual y pasos 5-7):** nada que deshacer en Supabase.
  ```bash
  # borrar los 3 ficheros nuevos y este documento
  rm supabase/migrations/30_create_facturas_tc_portal.sql \
     supabase/migrations/31_drop_facturas_tc_portal.sql \
     supabase/migrations/32_casos_excepcion_tipo_multifactura.sql \
     supabase/PROCESO_MIGRACIONES_2026-11-04.md
  # restaurar ficheros modificados (pasos 5 y 7)
  git checkout -- supabase/migrations/MIGRACION_RESULTADO.md supabase/cambios_manuales_2026-11-04.sql
  ```
- **Abandonar la rama entera:**
  ```bash
  git checkout main
  git branch -D docs/migraciones-04-11
  ```
- **Tras commit local, antes de push:** `git reset --hard fec64d2` en la rama (descarta el commit).
- **Tras push:** `git push origin --delete docs/migraciones-04-11` y borrar la rama local. `main` no se toca en ningún momento.

`main` está en `fec64d2` (único cambio previo de hoy: añadir `cambios_manuales_2026-11-04.sql`). Revertirlo no es necesario salvo que se quiera: `git revert fec64d2`.
