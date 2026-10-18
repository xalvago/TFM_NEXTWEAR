"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoCentroid, geoDistance, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Topology } from "topojson-specification";
import { ALMACEN_CENTRAL_NEXTWEAR, PROVEEDORES_GEO } from "@/lib/proveedores-geo";
import type { ProveedorRow } from "@/lib/queries/proveedores";

// Misma paleta por moneda que el resto del dashboard.
const MONEDA_COLOR: Record<string, string> = {
  EUR: "var(--chart-1)",
  USD: "var(--chart-3)",
  CNY: "var(--chart-2)",
};

const S = 400; // lado del viewBox
const R0 = S / 2 - 14; // radio con el globo entero
const MIN_ANGULO = 0.3; // rad (~17°): zoom máximo, para que un solo proveedor no pierda contexto

type Vista = { lng: number; lat: number; k: number };

/** Encuadre: centra el globo en las sedes visibles y acerca lo que permita verlas todas. */
function encuadre(puntos: [number, number][]): Vista {
  if (puntos.length === 0) return { lng: -15, lat: 30, k: R0 };
  const c = geoCentroid({ type: "MultiPoint", coordinates: puntos });
  const d = Math.max(MIN_ANGULO, ...puntos.map((p) => geoDistance(c, p)));
  // En ortográfica un punto a distancia angular d del centro cae a R·sin(d) del centro.
  const k = d >= 1.1 ? R0 : Math.min(R0 * 9, (R0 * 0.78) / Math.sin(d));
  return { lng: c[0], lat: c[1], k: Math.max(R0, k) };
}

/** Diferencia de longitud por el camino corto (evita dar la vuelta al mundo). */
function deltaLng(a: number, b: number) {
  return ((((b - a) % 360) + 540) % 360) - 180;
}

/**
 * Globo terráqueo con las sedes de los proveedores. Al filtrar o buscar, gira y se
 * acerca para mostrar justo las sedes de las tarjetas visibles; sin filtro, enseña
 * todas. Proyección ortográfica en SVG (d3-geo), sin teselas ni llamadas de red.
 */
export function GloboProveedores({
  proveedores,
  visibles,
}: {
  proveedores: ProveedorRow[];
  /** Proveedores que muestran las tarjetas en este momento. */
  visibles: ProveedorRow[];
}) {
  const [paises, setPaises] = useState<FeatureCollection<Geometry> | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>({ lng: -15, lat: 30, k: R0 });
  const actual = useRef<Vista>(vista);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    let vivo = true;
    import("world-atlas/countries-110m.json").then((m) => {
      if (!vivo) return;
      const topo = m.default as unknown as Topology;
      setPaises(
        feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry>
      );
    });
    return () => {
      vivo = false;
    };
  }, []);

  const idsVisibles = useMemo(() => new Set(visibles.map((p) => p.proveedor_id)), [visibles]);

  // Puntos a encuadrar: las sedes de las tarjetas visibles (el almacén queda en el globo, sin forzar el zoom).
  const objetivo = useMemo(() => {
    const pts = visibles
      .map((p) => PROVEEDORES_GEO[p.proveedor_id])
      .filter(Boolean)
      .map((g) => [g.lng, g.lat] as [number, number]);
    return encuadre(pts);
  }, [visibles]);

  // Animación hacia el nuevo encuadre: por tiempo (no por fotograma) para que dure lo mismo en cualquier equipo.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dur = reduce ? 0 : 950;
    const desde = { ...actual.current };
    const t0 = performance.now();
    const paso = (ahora: number) => {
      const t = dur === 0 ? 1 : Math.min(1, (ahora - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      const v = {
        lng: desde.lng + deltaLng(desde.lng, objetivo.lng) * e,
        lat: desde.lat + (objetivo.lat - desde.lat) * e,
        k: desde.k + (objetivo.k - desde.k) * e,
      };
      actual.current = v;
      setVista(v);
      raf.current = t < 1 ? requestAnimationFrame(paso) : null;
    };
    raf.current = requestAnimationFrame(paso);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
  }, [objetivo]);

  const proy = geoOrthographic()
    .translate([S / 2, S / 2])
    .scale(vista.k)
    .rotate([-vista.lng, -vista.lat])
    .clipAngle(90);
  const path = geoPath(proy);
  const centro: [number, number] = [vista.lng, vista.lat];
  const enCara = (p: [number, number]) => geoDistance(centro, p) < Math.PI / 2 - 0.03;
  const almacen: [number, number] = [ALMACEN_CENTRAL_NEXTWEAR.lng, ALMACEN_CENTRAL_NEXTWEAR.lat];
  const pocos = visibles.length <= 4;
  const zoom = vista.k / R0;

  const puntos = proveedores
    .map((p) => {
      const g = PROVEEDORES_GEO[p.proveedor_id];
      return g ? { p, g, xy: [g.lng, g.lat] as [number, number] } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Sedes casi superpuestas (p. ej. Guangzhou y Shenzhen): la más al sur lleva la etiqueta debajo.
  const debajo = new Set<string>();
  const pantalla = puntos
    .filter(({ p, xy }) => idsVisibles.has(p.proveedor_id) && enCara(xy))
    .map(({ p, xy }) => ({ id: p.proveedor_id, pos: proy(xy) }))
    .filter((x): x is { id: string; pos: [number, number] } => x.pos !== null);
  for (const a of pantalla)
    for (const b of pantalla)
      if (a.id !== b.id && Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1]) < 34 && a.pos[1] > b.pos[1])
        debajo.add(a.id);

  return (
    <svg
      viewBox={`0 0 ${S} ${S}`}
      role="img"
      aria-label={`Globo con las sedes de ${visibles.length} proveedores`}
      className="mx-auto block h-auto w-full max-w-[26rem]"
    >
      <defs>
        <radialGradient id="globo-mar" cx="35%" cy="30%" r="80%">
          <stop offset="0%" style={{ stopColor: "color-mix(in oklab, var(--chart-1) 8%, white)" }} />
          <stop offset="100%" style={{ stopColor: "color-mix(in oklab, var(--chart-1) 26%, white)" }} />
        </radialGradient>
        <radialGradient id="globo-sombra" cx="38%" cy="32%" r="75%">
          <stop offset="60%" stopColor="black" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.22" />
        </radialGradient>
        <clipPath id="globo-recorte">
          <circle cx={S / 2} cy={S / 2} r={R0} />
        </clipPath>
        <filter id="globo-halo" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#0f2236" floodOpacity="0.22" />
        </filter>
      </defs>

      <g filter="url(#globo-halo)">
        <circle cx={S / 2} cy={S / 2} r={R0} fill="url(#globo-mar)" />
      </g>

      {/* Ventana circular: con zoom el globo se ve como a través de una lupa, sin perder la forma */}
      <g clipPath="url(#globo-recorte)">
        <path
          d={path(geoGraticule10()) ?? ""}
          fill="none"
          style={{ stroke: "color-mix(in oklab, var(--chart-1) 25%, white)" }}
          strokeWidth={0.5}
        />
        {paises && (
          <path
            d={path(paises as unknown as Feature) ?? ""}
            style={{
              fill: "color-mix(in oklab, var(--chart-3) 20%, #f7f0e3)",
              stroke: "color-mix(in oklab, var(--chart-3) 45%, #f7f0e3)",
            }}
            strokeWidth={0.5 / Math.sqrt(zoom)}
            strokeLinejoin="round"
          />
        )}

        {/* Rutas sede → almacén central de las tarjetas visibles */}
        {puntos
          .filter(({ p }) => idsVisibles.has(p.proveedor_id))
          .map(({ p, xy }) => (
            <path
              key={`r-${p.proveedor_id}`}
              d={path({ type: "LineString", coordinates: [xy, almacen] }) ?? ""}
              fill="none"
              stroke={MONEDA_COLOR[p.moneda_facturacion] ?? "var(--chart-5)"}
              strokeWidth={hoverId === p.proveedor_id ? 2 : 1}
              strokeDasharray="4 4"
              strokeLinecap="round"
              opacity={hoverId === null || hoverId === p.proveedor_id ? 0.85 : 0.25}
            />
          ))}
      <circle cx={S / 2} cy={S / 2} r={R0} fill="url(#globo-sombra)" pointerEvents="none" />

      {/* Almacén central */}
      {enCara(almacen) &&
        (() => {
          const xy = proy(almacen);
          if (!xy) return null;
          return (
            <g transform={`translate(${xy[0].toFixed(2)} ${xy[1].toFixed(2)})`}>
              <title>{`Almacén central Nextwear · ${ALMACEN_CENTRAL_NEXTWEAR.ciudad}`}</title>
              <rect x={-6} y={-6} width={12} height={12} rx={3} fill="#191a24" stroke="white" strokeWidth={1.6} />
              <path d="M-3 -0.5 0 -3l3 2.5V3h-6Z" fill="none" stroke="white" strokeWidth={1} />
            </g>
          );
        })()}

      {/* Sedes: las de las tarjetas visibles en color; el resto, atenuadas */}
      {puntos.map(({ p, g, xy }) => {
        if (!enCara(xy)) return null;
        const pos = proy(xy);
        if (!pos) return null;
        const on = idsVisibles.has(p.proveedor_id);
        const color = MONEDA_COLOR[p.moneda_facturacion] ?? "var(--chart-5)";
        const hover = hoverId === p.proveedor_id;
        return (
          <g
            key={p.proveedor_id}
            transform={`translate(${pos[0].toFixed(2)} ${pos[1].toFixed(2)})`}
            onMouseEnter={() => setHoverId(p.proveedor_id)}
            onMouseLeave={() => setHoverId((id) => (id === p.proveedor_id ? null : id))}
            className={on ? "cursor-pointer" : "pointer-events-none"}
          >
            <title>{`${p.razon_social} · ${g.ciudad}, ${p.pais}`}</title>
            {on && <circle r={hover ? 11 : 8} style={{ fill: color }} opacity={0.22} />}
            <circle
              r={on ? (hover ? 5.5 : 4.5) : 2.4}
              style={{ fill: on ? color : "var(--muted-foreground)" }}
              opacity={on ? 1 : 0.35}
              stroke="white"
              strokeWidth={on ? 1.6 : 0.8}
            />
            {on && (pocos || hover) && (
              <text
                y={debajo.has(p.proveedor_id) ? 20 : -11}
                textAnchor="middle"
                className="fill-foreground"
                style={{ fontSize: 10.5, fontWeight: 600, paintOrder: "stroke" }}
                stroke="white"
                strokeWidth={3}
                strokeLinejoin="round"
              >
                {g.ciudad}
              </text>
            )}
          </g>
        );
      })}
      </g>

      <circle
        cx={S / 2}
        cy={S / 2}
        r={R0}
        fill="none"
        style={{ stroke: "color-mix(in oklab, var(--chart-1) 40%, white)" }}
        strokeWidth={1.2}
        pointerEvents="none"
      />
    </svg>
  );
}
