import { formatEUR } from "@/lib/finance";

/**
 * Gráficos 3D de bloques en proyección isométrica real (ejes a 30°) en SVG puro:
 * el eje horizontal es isométrico, así que los bloques se disponen en profundidad
 * sobre una losa de suelo. Cada bloque tiene cara izquierda, frontal y superior con
 * degradado de la paleta del dashboard, sombra proyectada y animación de crecimiento.
 * Valor = cantidad × coste unitario (EUR).
 */
export type IsoItem = {
  key: string;
  label: string;
  value: number;
  /** Icono/bandera junto a la etiqueta: recibe la esquina superior izquierda (en px del viewBox). */
  icon?: (x: number, y: number) => React.ReactNode;
};

// x avanza arriba-derecha, y abajo-derecha (hacia el espectador), z sube.
const C = 0.866;
const S = 0.5;
type P3 = [number, number, number];

function iso([x, y, z]: P3): [number, number] {
  return [(x + y) * C, (y - x) * S - z];
}

function poly(pts: P3[], dx: number, dy: number): string {
  return pts
    .map((p) => {
      const [X, Y] = iso(p);
      return `${(X + dx).toFixed(1)},${(Y + dy).toFixed(1)}`;
    })
    .join(" ");
}

/** Caja [x0,x1]×[y0,y1]×[z0,z1]: caras visibles (izquierda x0, frontal y1, superior z1). */
function caras(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  ox: number,
  oy: number
) {
  return {
    izq: poly([[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], ox, oy),
    fre: poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], ox, oy),
    sup: poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], ox, oy),
  };
}

/** Compacta importes para etiquetas pequeñas: 100,6 mil € / 1,2 M €. */
function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} M €`;
  if (a >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")} mil €`;
  return `${Math.round(n)} €`;
}

/** Etiqueta corta para el eje: «Tienda Valencia» → «Valencia». */
function corto(label: string): string {
  const s = label.replace(/^Tienda\s+/i, "");
  const first = s.split(" ")[0];
  return first.length > 11 ? `${first.slice(0, 10)}…` : first;
}

/** Ancho aproximado de un texto sans (px del viewBox): letras anchas y estrechas pesan distinto. */
function anchoTexto(t: string, fontSize: number): number {
  let em = 0;
  for (const ch of t) {
    if ("mwMW".includes(ch)) em += 0.86;
    else if ("iljtfr.,: ".includes(ch)) em += 0.34;
    else if (ch >= "A" && ch <= "Z") em += 0.68;
    else em += 0.57;
  }
  return em * fontSize;
}

function capitalizar(label: string): string {
  if (label === "pantalon") return "Pantalón";
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Color del bloque i de n: mezcla progresiva entre dos tonos de la paleta. */
function tono(a: string, b: string, i: number, n: number): string {
  const pct = n <= 1 ? 0 : Math.round((i / (n - 1)) * 100);
  return `color-mix(in oklab, ${a} ${100 - pct}%, ${b})`;
}

function Faces({ id, base }: { id: string; base: string }) {
  return (
    <>
      <linearGradient id={`${id}-f`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" style={{ stopColor: `color-mix(in oklab, ${base} 78%, white)` }} />
        <stop offset="100%" style={{ stopColor: base }} />
      </linearGradient>
      <linearGradient id={`${id}-fh`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" style={{ stopColor: `color-mix(in oklab, ${base} 70%, white)` }} />
        <stop offset="100%" style={{ stopColor: base }} />
      </linearGradient>
      <linearGradient id={`${id}-t`} x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" style={{ stopColor: `color-mix(in oklab, ${base} 45%, white)` }} />
        <stop offset="100%" style={{ stopColor: `color-mix(in oklab, ${base} 62%, white)` }} />
      </linearGradient>
      <linearGradient id={`${id}-s`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" style={{ stopColor: `color-mix(in oklab, ${base} 78%, black)` }} />
        <stop offset="100%" style={{ stopColor: `color-mix(in oklab, ${base} 60%, black)` }} />
      </linearGradient>
    </>
  );
}

const SOMBRA = (
  <filter id="iso-shadow" x="-30%" y="-30%" width="170%" height="180%">
    <feDropShadow dx="5" dy="7" stdDeviation="4" floodColor="#0f2236" floodOpacity="0.2" />
  </filter>
);

/** Suelo isométrico (losa fina) sobre el que se apoyan los bloques. */
function Suelo({ L, D, ox, oy }: { L: number; D: number; ox: number; oy: number }) {
  const g = caras(0, L, 0, D, -5, 0, ox, oy);
  return (
    <g>
      <polygon points={g.izq} className="fill-foreground/10" />
      <polygon points={g.fre} className="fill-foreground/[0.14]" />
      <polygon points={g.sup} className="fill-white/60 stroke-border" strokeWidth={1} />
    </g>
  );
}

/** Columnas 3D sobre eje isométrico (una por centro). */
export function IsoColumns({
  items,
  from,
  to,
  titulo,
  ejeY,
  ejeX,
}: {
  items: IsoItem[];
  from: string;
  to: string;
  titulo: string;
  /** Asunto del eje vertical (p. ej. «Valor del inventario, EUR»). */
  ejeY?: string;
  /** Asunto del eje horizontal (p. ej. «Centro de coste»). */
  ejeX?: string;
}) {
  const n = items.length;
  const w = 30;
  const d = 30;
  const step = 58;
  const pad = 12;
  const maxH = 115;
  // Fuentes en unidades del viewBox: el gráfico se reduce al encajar, así que se compensa
  // para que se vean al mismo tamaño que las barras horizontales de al lado.
  const FN = 23.1; // nombres de centro y marcas del eje
  const FV = 22.3; // valores sobre las columnas
  const FE = 21; // títulos de eje
  const L = (n - 1) * step + w + 2 * pad;
  const D = d + 2 * pad;
  const maxV = Math.max(...items.map((i) => i.value), 1);

  const pasos = [1e3, 2e3, 5e3, 1e4, 2e4, 2.5e4, 5e4, 1e5, 2e5, 5e5, 1e6];
  const paso = pasos.find((p) => maxV / p <= 4) ?? 1e6;
  const marcas: number[] = [];
  for (let v = paso; v <= maxV * 1.001; v += paso) marcas.push(v);
  // Los ejes van retrasados (y negativa) para que no los tapen los valores de las columnas.
  const atras = 30;
  const zTop = ((marcas[marcas.length - 1] ?? maxV) / maxV) * maxH;
  const xs = [iso([0, -atras, 0])[0], iso([L, D, 0])[0]];
  const tops = items.map((it, i) =>
    iso([pad + i * step + w, pad, Math.max(4, (it.value / maxV) * maxH)])[1]
  );
  const ys = [Math.min(...tops, iso([L, -atras, zTop])[1] - 6), iso([0, D, -5])[1]];
  const mxL = 92; // hueco para las marcas del eje
  const mxR = 8;
  const ox = mxL - Math.min(...xs);
  const mTop = ejeY ? 60 : 40; // título del eje Y en su propia fila, sobre los valores
  const oy = mTop - Math.min(...ys);
  // Cada nombre queda step/2 más arriba que el anterior (eje isométrico): con step/2 > FN
  // nunca se pisan aunque se solapen en horizontal.
  const W = Math.max(...xs) - Math.min(...xs) + mxL + mxR;
  const H = Math.max(...ys) - Math.min(...ys) + mTop + 24 + FN + 6 + (ejeX ? FE + 14 : 0);

  const at = (x: number, y: number, z: number): [number, number] => {
    const [X, Y] = iso([x, y, z]);
    return [X + ox, Y + oy];
  };

  return (
    <svg
      viewBox={`0 0 ${W.toFixed(0)} ${H.toFixed(0)}`}
      role="img"
      aria-label={titulo}
      className="mx-auto h-auto w-full"
    >
      <defs>
        {SOMBRA}
        {items.map((it, i) => (
          <Faces key={it.key} id={`ic-${i}`} base={tono(from, to, i, n)} />
        ))}
      </defs>
      <Suelo L={L} D={D} ox={ox} oy={oy} />

      {/* Ejes sutiles: rejilla en las paredes trasera y lateral con su medida */}
      <g className="stroke-foreground/15" strokeWidth={1} strokeDasharray="3 4" fill="none">
        {marcas.map((v) => {
          const z = (v / maxV) * maxH;
          return (
            <line
              key={v}
              x1={at(0, -atras, z)[0]}
              y1={at(0, -atras, z)[1]}
              x2={at(L, -atras, z)[0]}
              y2={at(L, -atras, z)[1]}
            />
          );
        })}
        <line
          x1={at(0, -atras, 0)[0]}
          y1={at(0, -atras, 0)[1]}
          x2={at(0, -atras, zTop)[0]}
          y2={at(0, -atras, zTop)[1]}
          strokeDasharray="none"
        />
      </g>
      {marcas.map((v) => {
        const [lx, ly] = at(0, -atras, (v / maxV) * maxH);
        return (
          <text
            key={`t-${v}`}
            x={lx - 6}
            y={ly + 3}
            textAnchor="end"
            className="fill-muted-foreground/80 font-numeric"
            style={{ fontSize: FN }}
          >
            {compactCorto(v)}
          </text>
        );
      })}
      {ejeY && (
        <text
          x={2}
          y={FE + 4}
          className="fill-muted-foreground"
          style={{ fontSize: FE, fontWeight: 500 }}
        >
          {ejeY}
        </text>
      )}
      {ejeX && (
        <text
          x={at(L / 2, D, 0)[0]}
          y={at(0, D, 0)[1] + 2 * FN + 16}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: FE, fontWeight: 500 }}
        >
          {ejeX}
        </text>
      )}

      {/* De atrás (x grande) a delante (x pequeño) para que se solapen bien */}
      {[...items.keys()].reverse().map((i) => {
        const it = items[i];
        const h = Math.max(4, (it.value / maxV) * maxH);
        const x0 = pad + i * step;
        const g = caras(x0, x0 + w, pad, pad + d, 0, h, ox, oy);
        return (
          <g key={it.key}>
            <title>{`${it.label}: ${formatEUR(it.value)}`}</title>
            <g
              className="iso-bar"
              filter="url(#iso-shadow)"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <polygon points={g.izq} fill={`url(#ic-${i}-s)`} />
              <polygon points={g.fre} fill={`url(#ic-${i}-f)`} />
              <polygon points={g.sup} fill={`url(#ic-${i}-t)`} />
            </g>
          </g>
        );
      })}

      {/* Etiquetas al final, con halo, para que ningún bloque las tape */}
      {items.map((it, i) => {
        const h = Math.max(4, (it.value / maxV) * maxH);
        const x0 = pad + i * step;
        const [tx, ty] = iso([x0 + w / 2, pad + d / 2, h]);
        const [lx, ly] = iso([x0 + w / 2, D, 0]);
        return (
          <g key={`l-${it.key}`} className="pointer-events-none">
            <text
              x={tx + ox}
              y={ty + oy - 22}
              textAnchor="middle"
              className="fill-foreground font-numeric"
              style={{ fontSize: FV, fontWeight: 600, paintOrder: "stroke" }}
              stroke="var(--card)"
              strokeWidth={5}
              strokeLinejoin="round"
            >
              {compactCorto(it.value)}
            </text>
            <text
              x={lx + ox}
              y={ly + oy + FN + 4}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: FN }}
            >
              {corto(it.label)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Barras 3D horizontales sobre eje isométrico (una por categoría). */
export function IsoHBars({
  items,
  from,
  to,
  titulo,
  idPrefix = "ih",
  showPct = false,
}: {
  items: IsoItem[];
  from: string;
  to: string;
  titulo: string;
  /** Prefijo de los ids de degradado: único si hay varias instancias en la página. */
  idPrefix?: string;
  /** Añade el % sobre el total junto al importe. */
  showPct?: boolean;
}) {
  const n = items.length;
  const bt = 22; // ancho (eje y)
  const hz = 18; // alto (eje z)
  const rowStep = 42;
  const pad = 12;
  const maxL = showPct ? 190 : 250;
  const L = maxL + 2 * pad;
  const D = (n - 1) * rowStep + bt + 2 * pad;
  const maxV = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((a, i) => a + i.value, 0) || 1;

  const xs = [iso([0, 0, 0])[0], iso([L, D, 0])[0]];
  const ys = [iso([L, 0, hz])[1], iso([0, D, -5])[1]];
  const conIcono = items.some((i) => i.icon);
  const left = (showPct ? 112 : 96) + (conIcono ? 30 : 0); // etiquetas de categoría
  const right = showPct ? 168 : 96; // valores
  const ox = left - Math.min(...xs);
  const oy = 16 - Math.min(...ys);
  const W = Math.max(...xs) - Math.min(...xs) + left + right;
  const H = Math.max(...ys) - Math.min(...ys) + 32;

  return (
    <svg
      viewBox={`0 0 ${W.toFixed(0)} ${H.toFixed(0)}`}
      role="img"
      aria-label={titulo}
      className="mx-auto h-auto max-h-[30rem] w-full"
    >
      <defs>
        {SOMBRA}
        {items.map((it, i) => (
          <Faces key={it.key} id={`${idPrefix}-${i}`} base={tono(from, to, i, n)} />
        ))}
      </defs>
      <Suelo L={L} D={D} ox={ox} oy={oy} />

      {/* De atrás (y pequeño) a delante (y grande) */}
      {items.map((it, i) => {
        const len = Math.max(8, (it.value / maxV) * maxL);
        const y0 = pad + i * rowStep;
        const g = caras(pad, pad + len, y0, y0 + bt, 0, hz, ox, oy);
        const [sx, sy] = iso([0, y0 + bt / 2, 0]);
        const [ex, ey] = iso([pad + len, y0 + bt / 2, hz]);
        return (
          <g key={it.key}>
            <title>{`${it.label}: ${formatEUR(it.value)}`}</title>
            {it.icon && it.icon(sx + ox - 10 - anchoTexto(capitalizar(it.label), showPct ? 14 : 12.5) - 26, sy + oy - 6)}
            <text
              x={sx + ox - 10}
              y={sy + oy + 4}
              textAnchor="end"
              className="fill-muted-foreground"
              style={{ fontSize: showPct ? 14 : 12.5 }}
            >
              {capitalizar(it.label)}
            </text>
            <g
              className="iso-bar"
              filter="url(#iso-shadow)"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <polygon points={g.izq} fill={`url(#${idPrefix}-${i}-s)`} />
              <polygon points={g.fre} fill={`url(#${idPrefix}-${i}-fh)`} />
              <polygon points={g.sup} fill={`url(#${idPrefix}-${i}-t)`} />
            </g>
            <text
              x={ex + ox + 10}
              y={ey + oy + 3}
              className="fill-foreground font-numeric"
              style={{ fontSize: showPct ? 13.5 : 12, fontWeight: 600 }}
            >
              {compact(it.value)}
              {showPct && (
                <tspan className="fill-muted-foreground" style={{ fontWeight: 400 }}>
                  {` · ${((it.value / total) * 100).toFixed(1).replace(".", ",")} %`}
                </tspan>
              )}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Líneas isométricas: cada serie (año) es una cinta con pared bajo la línea, situada
 * a su propia profundidad sobre el suelo; los meses avanzan por el eje x. Se dibuja
 * de atrás hacia delante. Valores null cortan la línea (sin dato, no cero).
 */
export function IsoLines({
  groups,
  series,
  titulo,
}: {
  groups: { key: string; label: string; partial?: boolean; values: Record<string, number | null> }[];
  series: { key: string; label: string; color: string }[];
  titulo: string;
}) {
  const n = groups.length;
  const m = series.length;
  const stepX = 92;
  const stepY = 34;
  const pad = 16;
  const maxH = 100;
  const L = (n - 1) * stepX + 2 * pad;
  const D = (m - 1) * stepY + 2 * pad;
  const maxV = Math.max(
    ...groups.flatMap((g) => series.map((s) => g.values[s.key] ?? 0)),
    1
  );

  const xs = [iso([0, 0, 0])[0], iso([L, D, 0])[0]];
  // Caja vertical ajustada a la cima real de los datos (no a la esquina más alta posible).
  let topY = Infinity;
  series.forEach((s, si) =>
    groups.forEach((g, i) => {
      const v = g.values[s.key];
      if (v != null)
        topY = Math.min(topY, iso([pad + i * stepX, pad + si * stepY, (v / maxV) * maxH])[1]);
    })
  );
  const ys = [topY - 22, iso([0, D, -5])[1]];
  const mx = 38; // hueco a la izquierda para las medidas del eje
  const ox = mx - Math.min(...xs);
  const oy = 2 - Math.min(...ys);
  const W = Math.max(...xs) - Math.min(...xs) + mx + 14;
  const H = Math.max(...ys) - Math.min(...ys) + 26;

  // Medidas del eje vertical: marcas «redondas» sobre las paredes trasera e izquierda.
  const pasos = [1e3, 2e3, 5e3, 1e4, 2e4, 2.5e4, 5e4, 1e5, 2e5, 5e5, 1e6];
  const paso = pasos.find((p) => maxV / p <= 4) ?? 1e6;
  const marcas: number[] = [];
  for (let v = paso; v <= maxV * 1.001; v += paso) marcas.push(v);
  const at = (x: number, y: number, z: number): [number, number] => {
    const [X, Y] = iso([x, y, z]);
    return [X + ox, Y + oy];
  };

  const pt = (i: number, si: number, v: number): [number, number] => {
    const [X, Y] = iso([pad + i * stepX, pad + si * stepY, (v / maxV) * maxH]);
    return [X + ox, Y + oy];
  };
  const floor = (i: number, si: number): [number, number] => {
    const [X, Y] = iso([pad + i * stepX, pad + si * stepY, 0]);
    return [X + ox, Y + oy];
  };

  // Tramos contiguos con dato de cada serie.
  const tramos = (s: { key: string }) => {
    const out: number[][] = [];
    let cur: number[] = [];
    groups.forEach((g, i) => {
      if (g.values[s.key] != null) cur.push(i);
      else if (cur.length) {
        out.push(cur);
        cur = [];
      }
    });
    if (cur.length) out.push(cur);
    return out;
  };

  const f = (p: [number, number]) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;

  return (
    <svg
      viewBox={`0 0 ${W.toFixed(0)} ${H.toFixed(0)}`}
      role="img"
      aria-label={titulo}
      className="mx-auto h-auto w-full"
    >
      <defs>
        {SOMBRA}
        {series.map((s) => (
          <linearGradient key={s.key} id={`il-${s.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: s.color, stopOpacity: 0.62 }} />
            <stop offset="100%" style={{ stopColor: s.color, stopOpacity: 0.08 }} />
          </linearGradient>
        ))}
      </defs>
      <Suelo L={L} D={D} ox={ox} oy={oy} />

      {/* Rejilla sutil: pared trasera (y=0) y lateral (x=0) con su medida */}
      <g className="stroke-foreground/15" strokeWidth={1} strokeDasharray="3 4" fill="none">
        {marcas.map((v) => {
          const z = (v / maxV) * maxH;
          const a = at(0, D, z);
          const b = at(0, 0, z);
          const c = at(L, 0, z);
          return <polyline key={v} points={`${a} ${b} ${c}`} />;
        })}
        <line x1={at(0, 0, 0)[0]} y1={at(0, 0, 0)[1]} x2={at(0, 0, maxH)[0]} y2={at(0, 0, maxH)[1]} strokeDasharray="none" />
      </g>
      {marcas.map((v) => {
        const [lx, ly] = at(0, 0, (v / maxV) * maxH);
        return (
          <text
            key={`t-${v}`}
            x={lx - 6}
            y={ly + 3}
            textAnchor="end"
            className="fill-muted-foreground/80 font-numeric"
            style={{ fontSize: 9.5 }}
          >
            {compactCorto(v)}
          </text>
        );
      })}

      {series.map((s, si) => (
        <g key={s.key} className="iso-bar" style={{ animationDelay: `${si * 120}ms` }}>
          {tramos(s).map((idx, k) => {
            const top = idx.map((i) => pt(i, si, groups[i].values[s.key] as number));
            const bottom = [...idx].reverse().map((i) => floor(i, si));
            return (
              <g key={k}>
                <polygon
                  points={[...top, ...bottom].map(f).join(" ")}
                  fill={`url(#il-${s.key})`}
                />
                <polyline
                  points={top.map(f).join(" ")}
                  fill="none"
                  stroke={`color-mix(in oklab, ${s.color} 70%, black)`}
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.35}
                  transform="translate(0 3)"
                />
                <polyline
                  points={top.map(f).join(" ")}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={3.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {idx.map((i) => {
                  const [cx, cy] = pt(i, si, groups[i].values[s.key] as number);
                  return (
                    <g key={i}>
                      <title>{`${groups[i].label} ${s.label}: ${formatEUR(groups[i].values[s.key] as number)}`}</title>
                      <circle cx={cx} cy={cy} r={4.6} fill="white" stroke={s.color} strokeWidth={2.4} />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      ))}

      {/* Valores y meses al final, con halo */}
      {series.map((s, si) =>
        groups.map((g, i) => {
          const v = g.values[s.key];
          if (v == null) return null;
          const [cx, cy] = pt(i, si, v);
          return (
            <text
              key={`v-${s.key}-${i}`}
              x={cx}
              y={cy - 10}
              textAnchor="middle"
              className="fill-foreground font-numeric pointer-events-none"
              style={{ fontSize: 10, fontWeight: 600, paintOrder: "stroke" }}
              stroke="var(--card)"
              strokeWidth={3}
              strokeLinejoin="round"
            >
              {compactCorto(v)}
            </text>
          );
        })
      )}
      {groups.map((g, i) => {
        const [lx, ly] = iso([pad + i * stepX, D, 0]);
        return (
          <text
            key={`m-${g.key}`}
            x={lx + ox}
            y={ly + oy + 17}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 12 }}
          >
            {g.partial ? `${g.label}*` : g.label}
          </text>
        );
      })}
    </svg>
  );
}

/** Importe muy corto para etiquetas pequeñas: 62k / 1,2M. */
function compactCorto(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}
