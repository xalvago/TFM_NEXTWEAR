"use client";

import { useState } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const CURRENT = [186, 214, 198, 246, 231, 268];
const PREVIOUS = [158, 172, 179, 201, 196, 219];

const WIDTH = 560;
const HEIGHT = 170;
const PAD_TOP = 14;
const PAD_BOTTOM = 8;
const PAD_LEFT = 30;
const PAD_RIGHT = 6;

const CHART_H = HEIGHT - PAD_TOP - PAD_BOTTOM;
const CHART_W = WIDTH - PAD_LEFT - PAD_RIGHT;
const MAX = Math.max(...CURRENT, ...PREVIOUS) * 1.15;

const STEP = CHART_W / (MONTHS.length - 1);

function pointX(i: number) {
  return PAD_LEFT + i * STEP;
}

function pointY(v: number) {
  return PAD_TOP + CHART_H - (v / MAX) * CHART_H;
}

// Catmull-Rom to cubic-bezier smoothing for a natural, gráfica.jpg-style curve.
function smoothPath(values: number[]) {
  const pts = values.map((v, i) => [pointX(i), pointY(v)]);
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export default function SalesChart({ className = "" }: { className?: string }) {
  const [hover, setHover] = useState<number | null>(null);

  const baseline = HEIGHT - PAD_BOTTOM;
  const yTicks = [MAX, MAX / 2, 0];
  const active = hover !== null ? { month: MONTHS[hover], cur: CURRENT[hover], prev: PREVIOUS[hover] } : null;
  const delta = active ? Math.round(((active.cur - active.prev) / active.prev) * 100) : 0;

  const curLine = smoothPath(CURRENT);
  const prevLine = smoothPath(PREVIOUS);
  const curArea = `${curLine} L ${pointX(MONTHS.length - 1)},${baseline} L ${pointX(0)},${baseline} Z`;

  return (
    <div className={className}>
      <div
        className="animate-chart-in flex shrink-0 items-center gap-5 text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-text/35"
        style={{ animationDelay: "1650ms" }}
      >
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-red shadow-[0_0_0_3px_rgba(230,0,18,0.12)]" /> 2026
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-text/25" /> 2025
        </span>
      </div>

      <div className="relative mt-4 min-h-[220px] flex-1 lg:min-h-0">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-full w-full overflow-visible"
          preserveAspectRatio="none"
          role="img"
          aria-label="Monthly sales, current year vs previous year"
        >
          <defs>
            <linearGradient id="salesAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-red)" stopOpacity="0.22" />
              <stop offset="45%" stopColor="var(--color-brand-red)" stopOpacity="0.07" />
              <stop offset="100%" stopColor="var(--color-brand-red)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hoverGuide" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
              <stop offset="50%" stopColor="currentColor" stopOpacity="0.14" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map((t, i) => {
            const y = pointY(t);
            return (
              <g
                key={i}
                className="animate-chart-in"
                style={{ animationDelay: `${1700 + i * 50}ms` }}
              >
                <line
                  x1={PAD_LEFT}
                  x2={WIDTH - PAD_RIGHT}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.05"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
                <text x={0} y={y + 3} fontSize="9" fontWeight={500} fill="currentColor" fillOpacity="0.32" letterSpacing="0.02em">
                  €{Math.round(t)}k
                </text>
              </g>
            );
          })}

          {/* area under current year */}
          <path
            d={curArea}
            fill="url(#salesAreaFill)"
            className="animate-chart-in"
            style={{ animationDelay: "1800ms" }}
          />

          {/* previous year — soft muted reference line */}
          <path
            d={prevLine}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.18"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-chart-in"
            style={{ animationDelay: "1760ms" }}
          />

          {/* current year — solid line, drawn on */}
          <path
            d={curLine}
            fill="none"
            stroke="var(--color-brand-red)"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-draw-line"
            pathLength={1}
            style={{
              strokeDasharray: 1,
              strokeDashoffset: 0,
              animationDelay: "1850ms",
              filter: "drop-shadow(0 6px 10px rgba(230, 0, 18, 0.16))",
            }}
          />

          {MONTHS.map((_, i) => {
            const cx = pointX(i);
            const isHover = hover === i;
            return (
              <g key={i}>
                <line
                  x1={cx}
                  x2={cx}
                  y1={PAD_TOP}
                  y2={baseline}
                  stroke="url(#hoverGuide)"
                  strokeOpacity={isHover ? 1 : 0}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="transition-opacity duration-300 ease-out"
                />
                <circle
                  cx={cx}
                  cy={pointY(PREVIOUS[i])}
                  r={isHover ? 3 : 2}
                  fill="white"
                  stroke="currentColor"
                  strokeOpacity="0.3"
                  strokeWidth="1.2"
                  className="transition-all duration-300 ease-out"
                />
                <circle
                  cx={cx}
                  cy={pointY(CURRENT[i])}
                  r={isHover ? 5 : 2.5}
                  fill="var(--color-brand-red)"
                  stroke="white"
                  strokeWidth="1.5"
                  className="transition-all duration-300 ease-out"
                  style={{ filter: isHover ? "drop-shadow(0 3px 6px rgba(230, 0, 18, 0.35))" : "none" }}
                />
                <rect
                  x={cx - STEP / 2}
                  y={0}
                  width={STEP}
                  height={HEIGHT}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            );
          })}

          <line
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={baseline}
            y2={baseline}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="1"
            strokeLinecap="round"
            className="animate-chart-in"
            style={{ animationDelay: "1700ms" }}
          />
        </svg>

        {active && (
          <div
            key={hover}
            className="animate-tooltip-in pointer-events-none absolute top-0 min-w-[124px] rounded-2xl border border-black/5 bg-white/75 px-3.5 py-2.5 text-[11px] shadow-[0_20px_40px_-16px_rgba(0,0,0,0.28)] backdrop-blur-xl"
            style={{
              left: `${(pointX(hover!) / WIDTH) * 100}%`,
              transform: `translateX(${hover! > MONTHS.length - 2 ? "-100%" : "-50%"})`,
            }}
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-text/40">{active.month}</p>
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-neutral-text/60">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-red" /> 2026
              </span>
              <span className="font-semibold text-neutral-text">€{active.cur}k</span>
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-neutral-text/40">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-text/25" /> 2025
              </span>
              <span className="text-neutral-text/55">€{active.prev}k</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between border-t border-black/5 pt-1.5">
              <span className="text-[9px] font-medium uppercase tracking-wide text-neutral-text/35">YoY</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  delta >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-brand-red/10 text-brand-red"
                }`}
              >
                {delta >= 0 ? "+" : ""}
                {delta}%
              </span>
            </div>
          </div>
        )}
      </div>

      <div
        className="animate-chart-in mt-2 flex shrink-0 text-[9px] font-medium uppercase tracking-wide text-neutral-text/35"
        style={{ paddingLeft: PAD_LEFT - STEP / 2, animationDelay: "1950ms" }}
      >
        {MONTHS.map((m) => (
          <span key={m} style={{ width: STEP }} className="text-center">
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}
