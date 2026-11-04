# Resultado de la migración — `CLAUDE_CODE_mejoras.md`

Ejecutado 2026-07-13 vía MCP Supabase (proyecto `rnmidwhumdrpxulfsbjo`), bloques 01–07, sin errores en ninguno.

## Desviaciones detectadas frente al doc (resueltas antes de ejecutar)

1. **RLS**: `pg_policies` estaba vacío en las 13 tablas originales (RLS activo, cero policies, acceso solo vía `service_role`). Las 8 tablas nuevas replican ese mismo patrón — `ENABLE ROW LEVEL SECURITY` sin políticas — no se inventaron policies nuevas.
2. **Constraint `tipo_excepcion`**: nombre real confirmado `casos_excepcion_tipo_excepcion_check` (drop + recreate con 10 valores, incluye `iban_no_coincide`).
3. **Storage**: no existía ningún bucket. Se creó `facturas-pdf` (privado).
4. El doc tiene inconsistencia menor: §1 dice "7 tablas nuevas", §9 lista 8. Se ejecutaron las 8 de §9.

## Consultas de validación (doc §8)

| # | Consulta | Resultado |
|---|---|---|
| 1a | `count(*)` en `facturas_albaranes` | **370 filas** |
| 1b | Facturas con `albaran_ids_ref` no vacío | **324 facturas** |
| 2 | IDs de albarán huérfanos (en texto libre, sin match en `albaranes`) | **0 filas** — sin datos sucios |
| 3 | Constraint `tipo_excepcion` tras el ALTER | 10 valores confirmados, incluye `iban_no_coincide` |
| 4 | Candidatos reales a `iban_no_coincide` (`facturas.iban_proveedor <> maestro_proveedores.iban`) | **0 filas** — el dataset actual no tiene ningún caso |
| 5 | Existencia de las 8 tablas nuevas | Las 8 confirmadas: `facturas_albaranes`, `aprobaciones`, `comunicaciones`, `cuentas_contables`, `asientos_contables`, `asientos_lineas`, `pagos`, `log_agentes` |
| 6 | Columnas nuevas en `facturas` | Las 7 confirmadas |

`list_tables` final: **21 tablas** en `public`, todas con RLS activo. Vistas: `stock_actual` (preexistente) + `asientos_descuadrados` (nueva) = 2 vistas.

## Pendiente — requiere decisión explícita (no ejecutado)

La consulta #4 devuelve 0 filas: **no hay ningún caso de IBAN divergente en los datos ya cargados**. El doc sugiere "inyectar 1 o 2 casos en el dataset de demo" para poder enseñar el control `iban_no_coincide` en el vídeo. Esto es escribir datos de negocio ficticios (no estructura), así que no se ha hecho — pídelo explícitamente si lo quieres (p. ej. `UPDATE facturas SET iban_proveedor = '...' WHERE factura_id = '...'` sobre 1-2 filas concretas, con `casos_excepcion` a juego).

## Filas creadas por seed

- `cuentas_contables`: 8 filas (plan de cuentas PGC mínimo).
- Resto de tablas nuevas: 0 filas (esperado, son destino de flujos futuros: aprobaciones, comunicaciones, asientos, pagos, log).


## Correspondencia ficheros del repo ↔ versiones aplicadas en Supabase (actualizado 2026-10-18)

La numeración de los ficheros es del repo; la versión (timestamp) es la que figura en `supabase_migrations.schema_migrations`. Los ficheros 01–09 son los bloques de esta migración inicial; 10–21 se aplicaron a mano y se exportaron al repo; 22–29 se exportaron el 2026-10-18 y 30–32 el 2026-11-04, desde `schema_migrations.statements`.

| Fichero | Versión en Supabase | Nota |
|---|---|---|
| 10–17 | 20260716… – 20260730… | `razon_social_cliente` … `fix_tipo_cambio_invertido` |
| 18_direccion_sede_proveedores | 20260730161233 | |
| 18_unifica_motivos_duplicado | 20260806082309 | prefijo `18_` repetido por orden histórico del repo |
| 19_seed_pedidos_albaranes_casos_conciliacion | 20260731095716 | |
| 20_factura_relacionada_entrega_incompleta | 20260810092635 | |
| 21_casos_excepcion_referencia_multiple | 20260903071420, 20260903072855, 20260903074051 | consolida tres migraciones (relaja CHECK de referencia, `origen_deteccion`, 7 valores de `tipo_excepcion`) |
| 22_allow_anon_read_copiloto | 20260803225122 | |
| 23_allow_anon_read_all_tables | 20260807134628 | |
| 24_matriz_transiciones_estado_factura | 20260915174053 | crea `parametros_sistema`, `transiciones_estado_factura`, `historial_estado_factura` y el trigger |
| 25_rellenar_origen_deteccion | 20260915174736 | |
| 26_facturas_estado_add_nueva_entrada | 20260925082457 | |
| 27_transiciones_nueva_entrada | 20260927113143 | |
| 28_aprobaciones_tipo_baja_confianza | 20261005144732 | |
| 29_maestro_proveedores_swift_banco_corresponsal | 20261006102737 | |
| 30_create_facturas_tc_portal | 20260924081019 | crea la tabla de staging `facturas_tc_portal` (exportado 2026-11-04) |
| 31_drop_facturas_tc_portal | 20260924083227 | elimina `facturas_tc_portal`; efecto neto de 30 + 31 nulo (exportado 2026-11-04) |
| 32_casos_excepcion_tipo_multifactura | 20261022143230 | añade `multifactura` al CHECK de `tipo_excepcion` (8 valores) (exportado 2026-11-04) |

### Notas de la revisión del 2026-11-04

Comparado el SQL de las 35 migraciones del historial con los ficheros (hash md5 del SQL sin comentarios ni espacios):

- **26 de 35**: SQL idéntico; los ficheros solo añaden comentarios.
- **Fichero 21 (agrupa las tres del 03/09)**: cubre el efecto neto, **no literalmente**. Crea `origen_deteccion` como `text` plano (el historial la crea como columna generada y luego hace `drop expression`), no incluye el `comment on column` ni el `update … set origen_deteccion = null`, y añade un `UPDATE factura_id = factura_relacionada_id` que no está en el historial.
- **`15_asientos_contables_erp`** difiere del historial (20260721143010) en el bloque 4 (notas de crédito). El historial agrega por `facturas_lineas`, que las NC no tienen, así que `708` y `472` no se generaban. El fichero usa importes de cabecera (`708` en línea 2, `472` en línea 3): es la versión corregida, aplicada fuera del historial.
- **`18_direccion_sede_proveedores`** difiere del historial (20260730161233): el fichero añade al final un `UPDATE facturas SET direccion_proveedor = mp.direccion_sede …` que no figura en el historial.
- Los ficheros existentes no se han modificado; las diferencias quedan solo documentadas aquí.

### Cambios manuales fuera del historial

Documentados en `supabase/cambios_manuales_2026-11-04.sql` (T-07, borrado de asientos sembrados, alta de la 608, baja de la 708).

Corrección posterior (2026-11-04, tras la verificación): la descripción de `T-07` en `transiciones_estado_factura` tenía **3 espacios al inicio** (114 caracteres). Se corrigió con `UPDATE transiciones_estado_factura SET descripcion = btrim(descripcion) WHERE transicion_id = 'T-07';` (ahora 111 caracteres, igual al texto del `UPDATE` documentado). **Para revertir** (no recomendable): `UPDATE transiciones_estado_factura SET descripcion = '   ' || descripcion WHERE transicion_id = 'T-07';`.

**Historial de Supabase: 35 migraciones. Repositorio: 32 ficheros (el 21 agrupa 3 migraciones, por lo que cubren las 35). Cambios manuales: `cambios_manuales_2026-11-04.sql`.**
