import {
  Gift,
  Package,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  Ticket,
  type LucideIcon,
} from "lucide-react";

/**
 * Siluetas retail del fondo: iconos de la librería lucide (ya instalada) ampliados,
 * con trazo en degradado de la paleta del logo y deriva lenta. Sin formas propias.
 * Posiciones en % del viewport; movimiento y opacidad vía clases `.retail-shape`.
 */
type Shape = {
  Icon: LucideIcon;
  size: number;
  top: string;
  left: string;
  rot: number;
  dx: number;
  dy: number;
  spin: number;
  dur: number;
  delay: number;
  grad: "cool" | "warm";
  hideOnSmall?: boolean;
};

const SHAPES: Shape[] = [
  { Icon: ShoppingBag, size: 300, top: "4%", left: "-3%", rot: -10, dx: 72, dy: 54, spin: 12, dur: 22, delay: 0, grad: "cool" },
  { Icon: Tag, size: 220, top: "8%", left: "84%", rot: 14, dx: -64, dy: 79, spin: -15, dur: 25, delay: -12, grad: "warm" },
  { Icon: Shirt, size: 280, top: "46%", left: "90%", rot: 8, dx: -54, dy: -72, spin: 9, dur: 27, delay: -20, grad: "cool", hideOnSmall: true },
  { Icon: Store, size: 260, top: "62%", left: "-4%", rot: -6, dx: 64, dy: -50, spin: 7, dur: 24, delay: -8, grad: "warm" },
  { Icon: ShoppingCart, size: 200, top: "82%", left: "70%", rot: 10, dx: -79, dy: -43, spin: -12, dur: 23, delay: -30, grad: "cool", hideOnSmall: true },
  { Icon: Package, size: 190, top: "30%", left: "46%", rot: -14, dx: 50, dy: 64, spin: 15, dur: 30, delay: -16, grad: "warm", hideOnSmall: true },
  { Icon: Gift, size: 170, top: "88%", left: "22%", rot: 12, dx: 54, dy: -61, spin: -9, dur: 27, delay: -26, grad: "cool", hideOnSmall: true },
  { Icon: Ticket, size: 180, top: "16%", left: "30%", rot: -18, dx: -46, dy: 54, spin: 10, dur: 24, delay: -4, grad: "warm", hideOnSmall: true },
];

export function RetailBackdrop() {
  return (
    <div className="retail-backdrop" aria-hidden>
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="retail-cool" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0a8fab" />
            <stop offset="100%" stopColor="#1fb5b8" />
          </linearGradient>
          <linearGradient id="retail-warm" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff6a3d" />
            <stop offset="100%" stopColor="#ffa550" />
          </linearGradient>
        </defs>
      </svg>
      {SHAPES.map(({ Icon, size, top, left, rot, dx, dy, spin, dur, delay, grad, hideOnSmall }, i) => (
        <div
          key={i}
          className={`retail-shape${hideOnSmall ? " hidden md:block" : ""}`}
          style={
            {
              top,
              left,
              "--rot": `${rot}deg`,
              "--dx": `${dx}px`,
              "--dy": `${dy}px`,
              "--spin": `${spin}deg`,
              "--dur": `${dur}s`,
              "--delay": `${delay}s`,
            } as React.CSSProperties
          }
        >
          <Icon
            width={size}
            height={size}
            strokeWidth={0.45}
            stroke={`url(#retail-${grad})`}
          />
        </div>
      ))}
    </div>
  );
}
