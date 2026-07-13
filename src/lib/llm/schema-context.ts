/**
 * Resumen del esquema que se pasaría a un proveedor real como contexto de
 * sistema para generar SQL de solo lectura. Estático porque el esquema es
 * estable; regenerar si cambian tablas/columnas (ver CLAUDE.md §Modelo de datos).
 */
export function buildSchemaContext(): string {
  return `
Esquema Postgres (schema public), solo lectura. Cadena: proveedor → pedido → albarán → factura.

- maestro_proveedores(proveedor_id, razon_social, pais, moneda_facturacion, canal_recepcion, activo)
- productos(sku, descripcion, categoria, coleccion, talla, color, coste_unitario)
- centros_coste(centro_coste_id, nombre, tipo[tienda_fisica|ecommerce|almacen_central], pais)
- tipos_cambio(fecha, moneda_origen[USD|CNY], moneda_destino, tasa_cambio)
- pedidos(pedido_id, proveedor_id, centro_coste_id, fecha_pedido, estado)
- pedidos_lineas(pedido_id, sku, cantidad_pedida, precio_unitario_acordado)
- albaranes(albaran_id, pedido_id, proveedor_id, centro_coste_id, fecha_entrega, estado)
- albaranes_lineas(albaran_id, sku, cantidad_entregada)
- facturas(factura_id, numero_factura, proveedor_id, fecha_expedicion, moneda_original,
  total_factura_original, total_factura_eur, saldo_pendiente_eur, es_nota_credito,
  factura_original_id, estado, pedido_id_ref, albaran_ids_ref)
- facturas_lineas(factura_id, linea_id, sku, centro_coste_id, cantidad, total_linea_eur, flag_revision)
- stock_movimientos(movimiento_id, sku, centro_coste_id, fecha, tipo_movimiento, cantidad, valor_unitario_eur)
- casos_excepcion(caso_id, factura_id, albaran_id, pedido_id, tipo_excepcion, descripcion) — polimórfica
- stock_actual (VISTA): sku, centro_coste_id, cantidad_disponible, fecha_ultima_actualizacion

Reglas: sumar dinero SIEMPRE en columnas _eur. Notas de crédito (es_nota_credito=true)
tienen importes negativos y restan. saldo_pendiente_eur es la deuda neta, no total_factura_eur.
`.trim();
}
