"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { ProveedorGeo } from "@/lib/proveedores-geo";

/**
 * "Etiqueta viajera": al hacer hover en un pin de proveedor, dibuja una
 * ruta punteada hacia el almacén central y anima un swing-tag (la etiqueta
 * de precio/talla de una prenda) recorriéndola en bucle.
 *
 * La posición se anima aquí vía L.marker.setLatLng en un rAF (Leaflet no
 * tiene un equivalente a offset-path de CSS para mover un marker sobre una
 * polyline); el balanceo del tag es CSS puro (.map-tag-icon__swing en
 * globals.css), independiente del recorrido.
 */

const CICLO_MS = 3400;

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function iconoEtiqueta(color: string) {
  return L.divIcon({
    className: "",
    html: `<div class="map-tag-icon"><div class="map-tag-icon__swing">
      <svg width="22" height="24" viewBox="-11 -11 22 22">
        <line x1="0" y1="-9" x2="0" y2="-2" stroke="${color}" stroke-width="1.4" />
        <rect x="-7" y="-2" width="14" height="10" rx="2" fill="${color}" />
        <circle cx="0" cy="1.6" r="1.1" fill="white" />
      </svg>
    </div></div>`,
    iconSize: [22, 24],
    iconAnchor: [11, 20],
  });
}

export function RutaEtiquetaViajera({
  origen,
  destino,
  color,
  activo,
}: {
  origen: ProveedorGeo;
  destino: ProveedorGeo;
  color: string;
  activo: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!activo) return;

    const linea = L.polyline(
      [
        [origen.lat, origen.lng],
        [destino.lat, destino.lng],
      ],
      { color, weight: 2, opacity: 0.85, dashArray: "4 6" }
    ).addTo(map);

    const marker = L.marker([origen.lat, origen.lng], {
      icon: iconoEtiqueta(color),
      interactive: false,
      keyboard: false,
    }).addTo(map);

    const inicio = performance.now();
    let raf = 0;

    function tick(ahora: number) {
      const t = ((ahora - inicio) % CICLO_MS) / CICLO_MS;
      let distT: number;
      let opacidad: number;
      if (t < 0.6) {
        distT = smoothstep(t / 0.6);
        opacidad = 1;
      } else if (t < 0.88) {
        distT = 1;
        opacidad = 1;
      } else if (t < 0.94) {
        distT = 1;
        opacidad = 1 - (t - 0.88) / 0.06;
      } else {
        distT = 0;
        opacidad = 0;
      }

      marker.setLatLng([lerp(origen.lat, destino.lat, distT), lerp(origen.lng, destino.lng, distT)]);
      const el = marker.getElement();
      if (el) el.style.opacity = String(opacidad);

      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      map.removeLayer(linea);
      map.removeLayer(marker);
    };
  }, [activo, map, origen.lat, origen.lng, destino.lat, destino.lng, color]);

  return null;
}
