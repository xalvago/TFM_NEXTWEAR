"use client";

import dynamic from "next/dynamic";
import type { ProveedorRow } from "@/lib/queries/proveedores";

// Leaflet toca `window`/`document` al montar: nunca debe renderizarse en SSR.
const MapaProveedoresLeaflet = dynamic(
  () => import("./mapa-proveedores-leaflet").then((m) => m.MapaProveedoresLeaflet),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Cargando mapa…
      </div>
    ),
  }
);

export function MapaProveedores({ proveedores }: { proveedores: ProveedorRow[] }) {
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-b-2xl">
      <MapaProveedoresLeaflet proveedores={proveedores} />
    </div>
  );
}
