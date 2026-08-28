/**
 * Coordenadas fijas de la sede de cada proveedor, a partir de la ciudad en
 * `maestro_proveedores.direccion_sede`. Dataset de 10 proveedores fijos: no
 * hace falta geocoding en vivo (sin API key, sin llamada de red, sin coste).
 * Si se añade un proveedor nuevo, añadir su entrada aquí a mano.
 */
export interface ProveedorGeo {
  lat: number;
  lng: number;
  ciudad: string;
}

// Almacén central Nextwear (destino de la ruta animada al hacer hover en un
// pin). Coordenada de referencia en Madrid; no viene de ninguna tabla real.
export const ALMACEN_CENTRAL_NEXTWEAR: ProveedorGeo = {
  lat: 40.4168,
  lng: -3.7038,
  ciudad: "Madrid",
};

export const PROVEEDORES_GEO: Record<string, ProveedorGeo> = {
  "PROV-001": { lat: 43.263, lng: -2.935, ciudad: "Bilbao" },
  "PROV-002": { lat: 39.4699, lng: -0.3763, ciudad: "Valencia" },
  "PROV-003": { lat: 38.2669, lng: -0.6985, ciudad: "Elche" },
  "PROV-004": { lat: 45.4642, lng: 9.19, ciudad: "Milán" },
  "PROV-005": { lat: 41.1579, lng: -8.6291, ciudad: "Oporto" },
  "PROV-006": { lat: 40.4259, lng: -3.7025, ciudad: "Madrid" },
  "PROV-007": { lat: 34.0284, lng: -118.2612, ciudad: "Los Ángeles" },
  "PROV-008": { lat: 23.1291, lng: 113.2644, ciudad: "Guangzhou" },
  "PROV-009": { lat: 22.5431, lng: 114.0579, ciudad: "Shenzhen" },
  "PROV-010": { lat: 43.4623, lng: -3.8099, ciudad: "Santander" },
};
