// Tipos generados desde Supabase (proyecto rnmidwhumdrpxulfsbjo, schema public).
// Regenerar tras cambios de esquema: `supabase gen types typescript` o vía MCP Supabase.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      albaranes: {
        Row: {
          albaran_id: string
          centro_coste_id: string | null
          estado: string | null
          fecha_entrega: string | null
          pedido_id: string | null
          proveedor_id: string | null
        }
        Insert: {
          albaran_id: string
          centro_coste_id?: string | null
          estado?: string | null
          fecha_entrega?: string | null
          pedido_id?: string | null
          proveedor_id?: string | null
        }
        Update: {
          albaran_id?: string
          centro_coste_id?: string | null
          estado?: string | null
          fecha_entrega?: string | null
          pedido_id?: string | null
          proveedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "albaranes_centro_coste_id_fkey"
            columns: ["centro_coste_id"]
            isOneToOne: false
            referencedRelation: "centros_coste"
            referencedColumns: ["centro_coste_id"]
          },
          {
            foreignKeyName: "albaranes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "albaranes_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "maestro_proveedores"
            referencedColumns: ["proveedor_id"]
          },
        ]
      }
      albaranes_lineas: {
        Row: {
          albaran_id: string
          cantidad_entregada: number
          sku: string
        }
        Insert: {
          albaran_id: string
          cantidad_entregada: number
          sku: string
        }
        Update: {
          albaran_id?: string
          cantidad_entregada?: number
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "albaranes_lineas_albaran_id_fkey"
            columns: ["albaran_id"]
            isOneToOne: false
            referencedRelation: "albaranes"
            referencedColumns: ["albaran_id"]
          },
          {
            foreignKeyName: "albaranes_lineas_sku_fkey"
            columns: ["sku"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["sku"]
          },
        ]
      }
      aprobaciones: {
        Row: {
          aprobacion_id: string
          aprobado_por: string | null
          canal: string | null
          caso_id: string | null
          comentario: string | null
          decision: string | null
          factura_id: string
          fecha_decision: string | null
          fecha_solicitud: string | null
          tipo: string | null
          umbral_aplicado: number | null
        }
        Insert: {
          aprobacion_id: string
          aprobado_por?: string | null
          canal?: string | null
          caso_id?: string | null
          comentario?: string | null
          decision?: string | null
          factura_id: string
          fecha_decision?: string | null
          fecha_solicitud?: string | null
          tipo?: string | null
          umbral_aplicado?: number | null
        }
        Update: {
          aprobacion_id?: string
          aprobado_por?: string | null
          canal?: string | null
          caso_id?: string | null
          comentario?: string | null
          decision?: string | null
          factura_id?: string
          fecha_decision?: string | null
          fecha_solicitud?: string | null
          tipo?: string | null
          umbral_aplicado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "aprobaciones_caso_id_fkey"
            columns: ["caso_id"]
            isOneToOne: false
            referencedRelation: "casos_excepcion"
            referencedColumns: ["caso_id"]
          },
          {
            foreignKeyName: "aprobaciones_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["factura_id"]
          },
        ]
      }
      asientos_contables: {
        Row: {
          asiento_id: string
          clave_idempotencia: string
          estado_registro: string | null
          factura_id: string
          fecha_asiento: string | null
          fecha_registro: string | null
          id_erp_externo: string | null
          intentos: number | null
          tipo_asiento: string | null
          ultimo_error: string | null
        }
        Insert: {
          asiento_id: string
          clave_idempotencia: string
          estado_registro?: string | null
          factura_id: string
          fecha_asiento?: string | null
          fecha_registro?: string | null
          id_erp_externo?: string | null
          intentos?: number | null
          tipo_asiento?: string | null
          ultimo_error?: string | null
        }
        Update: {
          asiento_id?: string
          clave_idempotencia?: string
          estado_registro?: string | null
          factura_id?: string
          fecha_asiento?: string | null
          fecha_registro?: string | null
          id_erp_externo?: string | null
          intentos?: number | null
          tipo_asiento?: string | null
          ultimo_error?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asientos_contables_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["factura_id"]
          },
        ]
      }
      asientos_lineas: {
        Row: {
          asiento_id: string
          centro_coste_id: string | null
          concepto: string | null
          cuenta: string
          debe_eur: number | null
          haber_eur: number | null
          linea_num: number
        }
        Insert: {
          asiento_id: string
          centro_coste_id?: string | null
          concepto?: string | null
          cuenta: string
          debe_eur?: number | null
          haber_eur?: number | null
          linea_num: number
        }
        Update: {
          asiento_id?: string
          centro_coste_id?: string | null
          concepto?: string | null
          cuenta?: string
          debe_eur?: number | null
          haber_eur?: number | null
          linea_num?: number
        }
        Relationships: [
          {
            foreignKeyName: "asientos_lineas_asiento_id_fkey"
            columns: ["asiento_id"]
            isOneToOne: false
            referencedRelation: "asientos_contables"
            referencedColumns: ["asiento_id"]
          },
          {
            foreignKeyName: "asientos_lineas_centro_coste_id_fkey"
            columns: ["centro_coste_id"]
            isOneToOne: false
            referencedRelation: "centros_coste"
            referencedColumns: ["centro_coste_id"]
          },
          {
            foreignKeyName: "asientos_lineas_cuenta_fkey"
            columns: ["cuenta"]
            isOneToOne: false
            referencedRelation: "cuentas_contables"
            referencedColumns: ["cuenta"]
          },
        ]
      }
      casos_excepcion: {
        Row: {
          albaran_id: string | null
          caso_id: string
          descripcion: string | null
          estado_resolucion: string | null
          factura_id: string | null
          fecha_resolucion: string | null
          linea_id: string | null
          notas_resolucion: string | null
          pedido_id: string | null
          resuelto_por: string | null
          tipo_excepcion: string | null
        }
        Insert: {
          albaran_id?: string | null
          caso_id: string
          descripcion?: string | null
          estado_resolucion?: string | null
          factura_id?: string | null
          fecha_resolucion?: string | null
          linea_id?: string | null
          notas_resolucion?: string | null
          pedido_id?: string | null
          resuelto_por?: string | null
          tipo_excepcion?: string | null
        }
        Update: {
          albaran_id?: string | null
          caso_id?: string
          descripcion?: string | null
          estado_resolucion?: string | null
          factura_id?: string | null
          fecha_resolucion?: string | null
          linea_id?: string | null
          notas_resolucion?: string | null
          pedido_id?: string | null
          resuelto_por?: string | null
          tipo_excepcion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "casos_excepcion_albaran_id_fkey"
            columns: ["albaran_id"]
            isOneToOne: false
            referencedRelation: "albaranes"
            referencedColumns: ["albaran_id"]
          },
          {
            foreignKeyName: "casos_excepcion_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["factura_id"]
          },
          {
            foreignKeyName: "casos_excepcion_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["pedido_id"]
          },
        ]
      }
      centros_coste: {
        Row: {
          centro_coste_id: string
          nombre: string
          pais: string | null
          tipo: string
        }
        Insert: {
          centro_coste_id: string
          nombre: string
          pais?: string | null
          tipo: string
        }
        Update: {
          centro_coste_id?: string
          nombre?: string
          pais?: string | null
          tipo?: string
        }
        Relationships: []
      }
      comunicaciones: {
        Row: {
          asunto: string | null
          canal: string | null
          caso_id: string | null
          comunicacion_id: string
          cuerpo: string | null
          direccion_destino: string | null
          factura_id: string | null
          fecha_envio: string | null
          fecha_respuesta: string | null
          generado_por_llm: boolean | null
          proveedor_id: string
          respuesta_recibida: boolean | null
        }
        Insert: {
          asunto?: string | null
          canal?: string | null
          caso_id?: string | null
          comunicacion_id: string
          cuerpo?: string | null
          direccion_destino?: string | null
          factura_id?: string | null
          fecha_envio?: string | null
          fecha_respuesta?: string | null
          generado_por_llm?: boolean | null
          proveedor_id: string
          respuesta_recibida?: boolean | null
        }
        Update: {
          asunto?: string | null
          canal?: string | null
          caso_id?: string | null
          comunicacion_id?: string
          cuerpo?: string | null
          direccion_destino?: string | null
          factura_id?: string | null
          fecha_envio?: string | null
          fecha_respuesta?: string | null
          generado_por_llm?: boolean | null
          proveedor_id?: string
          respuesta_recibida?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "comunicaciones_caso_id_fkey"
            columns: ["caso_id"]
            isOneToOne: false
            referencedRelation: "casos_excepcion"
            referencedColumns: ["caso_id"]
          },
          {
            foreignKeyName: "comunicaciones_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["factura_id"]
          },
          {
            foreignKeyName: "comunicaciones_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "maestro_proveedores"
            referencedColumns: ["proveedor_id"]
          },
        ]
      }
      cuentas_contables: {
        Row: {
          cuenta: string
          descripcion: string | null
          tipo: string | null
        }
        Insert: {
          cuenta: string
          descripcion?: string | null
          tipo?: string | null
        }
        Update: {
          cuenta?: string
          descripcion?: string | null
          tipo?: string | null
        }
        Relationships: []
      }
      facturas: {
        Row: {
          albaran_ids_ref: string | null
          base_imponible_eur: number | null
          base_imponible_original: number | null
          campos_baja_confianza: Json | null
          canal_entrada: string | null
          confianza_extraccion: number | null
          confianza_tipo_documento: number | null
          cuota_iva_eur: number | null
          cuota_iva_original: number | null
          direccion_cliente: string | null
          direccion_proveedor: string | null
          documento_url: string | null
          es_nota_credito: boolean | null
          estado: string | null
          factura_id: string
          factura_original_id: string | null
          fecha_expedicion: string | null
          fecha_tipo_cambio: string | null
          fecha_vencimiento: string | null
          forma_pago: string | null
          hash_documento: string | null
          iban_proveedor: string | null
          idioma_documento: string | null
          moneda_original: string | null
          motivo_excepcion: string | null
          motor_extraccion: string | null
          nif_cliente: string | null
          nif_proveedor: string | null
          numero_factura: string | null
          pedido_id_ref: string | null
          proveedor_id: string | null
          razon_social_cliente: string | null
          razon_social_proveedor: string | null
          saldo_pendiente_eur: number | null
          serie: string | null
          tipo_cambio_aplicado: number | null
          tipo_iva: number | null
          total_factura_eur: number | null
          total_factura_original: number | null
        }
        Insert: {
          albaran_ids_ref?: string | null
          base_imponible_eur?: number | null
          base_imponible_original?: number | null
          campos_baja_confianza?: Json | null
          canal_entrada?: string | null
          confianza_extraccion?: number | null
          confianza_tipo_documento?: number | null
          cuota_iva_eur?: number | null
          cuota_iva_original?: number | null
          direccion_cliente?: string | null
          direccion_proveedor?: string | null
          documento_url?: string | null
          es_nota_credito?: boolean | null
          estado?: string | null
          factura_id: string
          factura_original_id?: string | null
          fecha_expedicion?: string | null
          fecha_tipo_cambio?: string | null
          fecha_vencimiento?: string | null
          forma_pago?: string | null
          hash_documento?: string | null
          iban_proveedor?: string | null
          idioma_documento?: string | null
          moneda_original?: string | null
          motivo_excepcion?: string | null
          motor_extraccion?: string | null
          nif_cliente?: string | null
          nif_proveedor?: string | null
          numero_factura?: string | null
          pedido_id_ref?: string | null
          proveedor_id?: string | null
          razon_social_cliente?: string | null
          razon_social_proveedor?: string | null
          saldo_pendiente_eur?: number | null
          serie?: string | null
          tipo_cambio_aplicado?: number | null
          tipo_iva?: number | null
          total_factura_eur?: number | null
          total_factura_original?: number | null
        }
        Update: {
          albaran_ids_ref?: string | null
          base_imponible_eur?: number | null
          base_imponible_original?: number | null
          campos_baja_confianza?: Json | null
          canal_entrada?: string | null
          confianza_extraccion?: number | null
          confianza_tipo_documento?: number | null
          cuota_iva_eur?: number | null
          cuota_iva_original?: number | null
          direccion_cliente?: string | null
          direccion_proveedor?: string | null
          documento_url?: string | null
          es_nota_credito?: boolean | null
          estado?: string | null
          factura_id?: string
          factura_original_id?: string | null
          fecha_expedicion?: string | null
          fecha_tipo_cambio?: string | null
          fecha_vencimiento?: string | null
          forma_pago?: string | null
          hash_documento?: string | null
          iban_proveedor?: string | null
          idioma_documento?: string | null
          moneda_original?: string | null
          motivo_excepcion?: string | null
          motor_extraccion?: string | null
          nif_cliente?: string | null
          nif_proveedor?: string | null
          numero_factura?: string | null
          pedido_id_ref?: string | null
          proveedor_id?: string | null
          razon_social_cliente?: string | null
          razon_social_proveedor?: string | null
          saldo_pendiente_eur?: number | null
          serie?: string | null
          tipo_cambio_aplicado?: number | null
          tipo_iva?: number | null
          total_factura_eur?: number | null
          total_factura_original?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "facturas_factura_original_id_fkey"
            columns: ["factura_original_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["factura_id"]
          },
          {
            foreignKeyName: "facturas_pedido_id_ref_fkey"
            columns: ["pedido_id_ref"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "facturas_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "maestro_proveedores"
            referencedColumns: ["proveedor_id"]
          },
        ]
      }
      facturas_albaranes: {
        Row: {
          albaran_id: string
          factura_id: string
        }
        Insert: {
          albaran_id: string
          factura_id: string
        }
        Update: {
          albaran_id?: string
          factura_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facturas_albaranes_albaran_id_fkey"
            columns: ["albaran_id"]
            isOneToOne: false
            referencedRelation: "albaranes"
            referencedColumns: ["albaran_id"]
          },
          {
            foreignKeyName: "facturas_albaranes_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["factura_id"]
          },
        ]
      }
      facturas_lineas: {
        Row: {
          autoevaluacion_pasada: boolean | null
          cantidad: number | null
          categoria_contable: string | null
          centro_coste_id: string | null
          clasificado_por: string | null
          coleccion_asignada: string | null
          confianza_clasificacion: number | null
          descripcion: string | null
          descuento_pct: number | null
          factura_id: string
          flag_revision: boolean | null
          linea_id: string
          motivo_flag: string | null
          precio_unitario_eur: number | null
          precio_unitario_original: number | null
          sku: string | null
          tipo_iva_linea: number | null
          total_linea_eur: number | null
          total_linea_original: number | null
        }
        Insert: {
          autoevaluacion_pasada?: boolean | null
          cantidad?: number | null
          categoria_contable?: string | null
          centro_coste_id?: string | null
          clasificado_por?: string | null
          coleccion_asignada?: string | null
          confianza_clasificacion?: number | null
          descripcion?: string | null
          descuento_pct?: number | null
          factura_id: string
          flag_revision?: boolean | null
          linea_id: string
          motivo_flag?: string | null
          precio_unitario_eur?: number | null
          precio_unitario_original?: number | null
          sku?: string | null
          tipo_iva_linea?: number | null
          total_linea_eur?: number | null
          total_linea_original?: number | null
        }
        Update: {
          autoevaluacion_pasada?: boolean | null
          cantidad?: number | null
          categoria_contable?: string | null
          centro_coste_id?: string | null
          clasificado_por?: string | null
          coleccion_asignada?: string | null
          confianza_clasificacion?: number | null
          descripcion?: string | null
          descuento_pct?: number | null
          factura_id?: string
          flag_revision?: boolean | null
          linea_id?: string
          motivo_flag?: string | null
          precio_unitario_eur?: number | null
          precio_unitario_original?: number | null
          sku?: string | null
          tipo_iva_linea?: number | null
          total_linea_eur?: number | null
          total_linea_original?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "facturas_lineas_centro_coste_id_fkey"
            columns: ["centro_coste_id"]
            isOneToOne: false
            referencedRelation: "centros_coste"
            referencedColumns: ["centro_coste_id"]
          },
          {
            foreignKeyName: "facturas_lineas_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["factura_id"]
          },
          {
            foreignKeyName: "facturas_lineas_sku_fkey"
            columns: ["sku"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["sku"]
          },
        ]
      }
      log_agentes: {
        Row: {
          accion: string | null
          agente: string | null
          caso_id: string | null
          creado_en: string | null
          duracion_ms: number | null
          entrada_resumen: string | null
          factura_id: string | null
          log_id: string
          modelo_llm: string | null
          resultado: string | null
          salida_resumen: string | null
          tokens_entrada: number | null
          tokens_salida: number | null
        }
        Insert: {
          accion?: string | null
          agente?: string | null
          caso_id?: string | null
          creado_en?: string | null
          duracion_ms?: number | null
          entrada_resumen?: string | null
          factura_id?: string | null
          log_id: string
          modelo_llm?: string | null
          resultado?: string | null
          salida_resumen?: string | null
          tokens_entrada?: number | null
          tokens_salida?: number | null
        }
        Update: {
          accion?: string | null
          agente?: string | null
          caso_id?: string | null
          creado_en?: string | null
          duracion_ms?: number | null
          entrada_resumen?: string | null
          factura_id?: string | null
          log_id?: string
          modelo_llm?: string | null
          resultado?: string | null
          salida_resumen?: string | null
          tokens_entrada?: number | null
          tokens_salida?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "log_agentes_caso_id_fkey"
            columns: ["caso_id"]
            isOneToOne: false
            referencedRelation: "casos_excepcion"
            referencedColumns: ["caso_id"]
          },
          {
            foreignKeyName: "log_agentes_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["factura_id"]
          },
        ]
      }
      maestro_proveedores: {
        Row: {
          activo: boolean | null
          canal_recepcion: string | null
          categorias_habituales: string | null
          email_recepcion_facturas: string | null
          forma_pago: string | null
          iban: string | null
          iban_fecha_actualizacion: string | null
          moneda_facturacion: string
          nif: string | null
          pais: string | null
          portal_url: string | null
          proveedor_id: string
          razon_social: string
        }
        Insert: {
          activo?: boolean | null
          canal_recepcion?: string | null
          categorias_habituales?: string | null
          email_recepcion_facturas?: string | null
          forma_pago?: string | null
          iban?: string | null
          iban_fecha_actualizacion?: string | null
          moneda_facturacion: string
          nif?: string | null
          pais?: string | null
          portal_url?: string | null
          proveedor_id: string
          razon_social: string
        }
        Update: {
          activo?: boolean | null
          canal_recepcion?: string | null
          categorias_habituales?: string | null
          email_recepcion_facturas?: string | null
          forma_pago?: string | null
          iban?: string | null
          iban_fecha_actualizacion?: string | null
          moneda_facturacion?: string
          nif?: string | null
          pais?: string | null
          portal_url?: string | null
          proveedor_id?: string
          razon_social?: string
        }
        Relationships: []
      }
      pagos: {
        Row: {
          asiento_id: string | null
          es_pago_parcial: boolean | null
          estado_pago: string | null
          factura_id: string
          fecha_pago: string | null
          fecha_vencimiento: string | null
          iban_destino: string | null
          iban_origen: string | null
          importe_eur: number | null
          importe_original: number | null
          medio_pago: string | null
          moneda: string | null
          motivo_retencion: string | null
          pago_id: string
          referencia_bancaria: string | null
        }
        Insert: {
          asiento_id?: string | null
          es_pago_parcial?: boolean | null
          estado_pago?: string | null
          factura_id: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          iban_destino?: string | null
          iban_origen?: string | null
          importe_eur?: number | null
          importe_original?: number | null
          medio_pago?: string | null
          moneda?: string | null
          motivo_retencion?: string | null
          pago_id: string
          referencia_bancaria?: string | null
        }
        Update: {
          asiento_id?: string | null
          es_pago_parcial?: boolean | null
          estado_pago?: string | null
          factura_id?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          iban_destino?: string | null
          iban_origen?: string | null
          importe_eur?: number | null
          importe_original?: number | null
          medio_pago?: string | null
          moneda?: string | null
          motivo_retencion?: string | null
          pago_id?: string
          referencia_bancaria?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_asiento_id_fkey"
            columns: ["asiento_id"]
            isOneToOne: false
            referencedRelation: "asientos_contables"
            referencedColumns: ["asiento_id"]
          },
          {
            foreignKeyName: "pagos_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["factura_id"]
          },
        ]
      }
      pedidos: {
        Row: {
          centro_coste_id: string | null
          estado: string | null
          fecha_entrega_prevista: string | null
          fecha_pedido: string
          moneda: string | null
          pedido_id: string
          proveedor_id: string | null
        }
        Insert: {
          centro_coste_id?: string | null
          estado?: string | null
          fecha_entrega_prevista?: string | null
          fecha_pedido: string
          moneda?: string | null
          pedido_id: string
          proveedor_id?: string | null
        }
        Update: {
          centro_coste_id?: string | null
          estado?: string | null
          fecha_entrega_prevista?: string | null
          fecha_pedido?: string
          moneda?: string | null
          pedido_id?: string
          proveedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_centro_coste_id_fkey"
            columns: ["centro_coste_id"]
            isOneToOne: false
            referencedRelation: "centros_coste"
            referencedColumns: ["centro_coste_id"]
          },
          {
            foreignKeyName: "pedidos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "maestro_proveedores"
            referencedColumns: ["proveedor_id"]
          },
        ]
      }
      pedidos_lineas: {
        Row: {
          cantidad_pedida: number
          pedido_id: string
          precio_unitario_acordado: number | null
          sku: string
        }
        Insert: {
          cantidad_pedida: number
          pedido_id: string
          precio_unitario_acordado?: number | null
          sku: string
        }
        Update: {
          cantidad_pedida?: number
          pedido_id?: string
          precio_unitario_acordado?: number | null
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_lineas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "pedidos_lineas_sku_fkey"
            columns: ["sku"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["sku"]
          },
        ]
      }
      productos: {
        Row: {
          categoria: string | null
          coleccion: string | null
          color: string | null
          coste_unitario: number | null
          descripcion: string
          ean: string | null
          sku: string
          talla: string | null
        }
        Insert: {
          categoria?: string | null
          coleccion?: string | null
          color?: string | null
          coste_unitario?: number | null
          descripcion: string
          ean?: string | null
          sku: string
          talla?: string | null
        }
        Update: {
          categoria?: string | null
          coleccion?: string | null
          color?: string | null
          coste_unitario?: number | null
          descripcion?: string
          ean?: string | null
          sku?: string
          talla?: string | null
        }
        Relationships: []
      }
      stock_movimientos: {
        Row: {
          cantidad: number | null
          centro_coste_id: string | null
          fecha: string | null
          movimiento_id: string
          referencia_documento: string | null
          sku: string | null
          stock_resultante: number | null
          tipo_movimiento: string | null
          valor_unitario_eur: number | null
        }
        Insert: {
          cantidad?: number | null
          centro_coste_id?: string | null
          fecha?: string | null
          movimiento_id: string
          referencia_documento?: string | null
          sku?: string | null
          stock_resultante?: number | null
          tipo_movimiento?: string | null
          valor_unitario_eur?: number | null
        }
        Update: {
          cantidad?: number | null
          centro_coste_id?: string | null
          fecha?: string | null
          movimiento_id?: string
          referencia_documento?: string | null
          sku?: string | null
          stock_resultante?: number | null
          tipo_movimiento?: string | null
          valor_unitario_eur?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movimientos_centro_coste_id_fkey"
            columns: ["centro_coste_id"]
            isOneToOne: false
            referencedRelation: "centros_coste"
            referencedColumns: ["centro_coste_id"]
          },
          {
            foreignKeyName: "stock_movimientos_sku_fkey"
            columns: ["sku"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["sku"]
          },
        ]
      }
      tipos_cambio: {
        Row: {
          fecha: string
          fuente: string | null
          moneda_destino: string
          moneda_origen: string
          tasa_cambio: number
        }
        Insert: {
          fecha: string
          fuente?: string | null
          moneda_destino?: string
          moneda_origen: string
          tasa_cambio: number
        }
        Update: {
          fecha?: string
          fuente?: string | null
          moneda_destino?: string
          moneda_origen?: string
          tasa_cambio?: number
        }
        Relationships: []
      }
    }
    Views: {
      asientos_descuadrados: {
        Row: {
          asiento_id: string | null
          total_debe: number | null
          total_haber: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asientos_lineas_asiento_id_fkey"
            columns: ["asiento_id"]
            isOneToOne: false
            referencedRelation: "asientos_contables"
            referencedColumns: ["asiento_id"]
          },
        ]
      }
      stock_actual: {
        Row: {
          cantidad_disponible: number | null
          centro_coste_id: string | null
          fecha_ultima_actualizacion: string | null
          sku: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movimientos_centro_coste_id_fkey"
            columns: ["centro_coste_id"]
            isOneToOne: false
            referencedRelation: "centros_coste"
            referencedColumns: ["centro_coste_id"]
          },
          {
            foreignKeyName: "stock_movimientos_sku_fkey"
            columns: ["sku"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["sku"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
