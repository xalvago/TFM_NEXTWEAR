export default function ExportMotion({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden ${className}`}
    >
      {/* garment silhouettes, gently bobbing */}
      <svg
        className="absolute inset-x-0 top-0 h-[62%] w-full"
        viewBox="0 0 320 140"
        preserveAspectRatio="xMidYMid meet"
      >
        <line x1="10" y1="14" x2="310" y2="14" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />
        {[
          { x: 40, delay: "0s" },
          { x: 130, delay: "0.6s" },
          { x: 220, delay: "1.2s" },
        ].map((g, i) => (
          <g
            key={i}
            className="animate-float"
            style={{ animationDelay: g.delay, transformOrigin: `${g.x}px 14px` }}
          >
            <line x1={g.x} y1="14" x2={g.x} y2="26" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" />
            <path
              d={`M${g.x - 26} 26 L${g.x} 14 L${g.x + 26} 26 L${g.x + 20} 40 Q${g.x} 34 ${g.x - 20} 40 Z`}
              fill="currentColor"
              fillOpacity="0.14"
              stroke="currentColor"
              strokeOpacity="0.55"
              strokeWidth="1.5"
            />
            <rect
              x={g.x - 16}
              y="40"
              width="32"
              height="52"
              rx="4"
              fill="currentColor"
              fillOpacity="0.08"
              stroke="currentColor"
              strokeOpacity="0.45"
              strokeWidth="1.5"
            />
          </g>
        ))}
      </svg>

      {/* drifting waves */}
      <div className="absolute inset-x-0 bottom-0 h-[46%] overflow-hidden">
        <svg
          className="animate-drift absolute bottom-0 h-full"
          style={{ width: "calc(200% + 56px)" }}
          viewBox="0 0 800 60"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="export-wave" x="0" y="0" width="56" height="28" patternUnits="userSpaceOnUse">
              <path d="M0 28 A28 28 0 0 1 28 0 A28 28 0 0 1 56 28" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M-14 28 A28 28 0 0 1 14 0 A28 28 0 0 1 42 28" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#export-wave)" opacity="0.4" />
        </svg>

        {/* small vessel sailing across the waves */}
        <svg
          className="absolute bottom-2 h-6 w-10 animate-sail"
          viewBox="0 0 40 24"
        >
          <path d="M4 16 L36 16 L31 22 L9 22 Z" fill="currentColor" fillOpacity="0.55" />
          <line x1="20" y1="16" x2="20" y2="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M20 5 L29 12 L20 12 Z" fill="currentColor" fillOpacity="0.75" />
        </svg>
      </div>
    </div>
  );
}
