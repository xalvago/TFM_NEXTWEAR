// Constantes compartidas entre componentes cliente y servidor.
// Módulo universal: sin "use client" ni "server-only".
export const UMBRAL_STOCK_BAJO_DEFECTO = 150;

// Dataset base real: 340 facturas, factura_id FAC-00001..FAC-00340 sin
// huecos (verificado en Supabase el 2026-08-28). Usado por
// src/app/api/facturas/nuevas/route.ts para detectar qué factura_id son
// "nuevos" (insertados por el robot UiPath) sin depender de que el usuario
// escriba una referencia a mano.
export const BASELINE_FACTURA_SEQ = 340;
