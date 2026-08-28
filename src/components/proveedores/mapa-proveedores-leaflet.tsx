"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PROVEEDORES_GEO } from "@/lib/proveedores-geo";
import { formatEUR, formatInt, MONEDA_LABEL } from "@/lib/finance";
import type { ProveedorRow } from "@/lib/queries/proveedores";

// Misma paleta por moneda que el gráfico de la vista ejecutiva
// (src/components/executive/charts.tsx#MONEDA_COLOR).
const MONEDA_COLOR: Record<string, string> = {
  EUR: "#7c3aed",
  USD: "#d97706",
  CNY: "#2563eb",
};

function pinIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<span style="
      display:block;width:14px;height:14px;border-radius:9999px;
      background:${color};box-shadow:0 0 0 3px color-mix(in srgb, ${color} 25%, white),0 1px 4px rgba(0,0,0,.35);
      border:2px solid white;
    "></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -8],
  });
}

export function MapaProveedoresLeaflet({
  proveedores,
}: {
  proveedores: ProveedorRow[];
}) {
  const puntos = proveedores
    .map((p) => {
      const geo = PROVEEDORES_GEO[p.proveedor_id];
      if (!geo) return null;
      return { proveedor: p, geo };
    })
    .filter((x): x is { proveedor: ProveedorRow; geo: (typeof PROVEEDORES_GEO)[string] } => x !== null);

  return (
    <MapContainer
      center={[30, 20]}
      zoom={2}
      scrollWheelZoom={false}
      className="h-full w-full"
      style={{ background: "var(--muted)" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {puntos.map(({ proveedor, geo }) => (
        <Marker
          key={proveedor.proveedor_id}
          position={[geo.lat, geo.lng]}
          icon={pinIcon(MONEDA_COLOR[proveedor.moneda_facturacion] ?? "#94a3b8")}
        >
          <Popup>
            <div className="flex flex-col gap-1 font-sans text-sm">
              <span className="font-semibold">{proveedor.razon_social}</span>
              <span className="text-muted-foreground">
                {geo.ciudad}, {proveedor.pais}
              </span>
              <span>
                Moneda: {MONEDA_LABEL[proveedor.moneda_facturacion] ?? proveedor.moneda_facturacion}
              </span>
              <span>{formatInt(proveedor.numFacturas)} facturas</span>
              <span>Gasto acumulado: {formatEUR(proveedor.gastoTotalEur)}</span>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
