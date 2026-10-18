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

La numeración de los ficheros es del repo; la versión (timestamp) es la que figura en `supabase_migrations.schema_migrations`. Los ficheros 01–09 son los bloques de esta migración inicial; 10–21 se aplicaron a mano y se exportaron al repo; 22–29 se exportaron el 2026-10-18 desde `schema_migrations.statements`.

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
| — | 20260924081019 / 20260924083227 | `create_facturas_tc_portal` y `drop_facturas_tc_portal`: tabla creada y eliminada, efecto neto nulo; sin fichero |
