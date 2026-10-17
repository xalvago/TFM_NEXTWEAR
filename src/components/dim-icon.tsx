import {
  AppWindow,
  DollarSign,
  Euro,
  Globe,
  JapaneseYen,
  Mail,
  ShoppingCart,
  Store,
  Warehouse,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Iconos de contexto para las dimensiones del gasto (moneda, país, canal de
 * recepción, destino de la compra). Sin estado ni hooks: sirven en servidor y cliente.
 * Los países usan banderas SVG propias porque Windows no pinta emojis de bandera.
 */

const MONEDA_ICON: Record<string, LucideIcon> = {
  EUR: Euro,
  USD: DollarSign,
  CNY: JapaneseYen, // ¥ también representa el yuan
};

export const CANAL_ICON: Record<string, LucideIcon> = {
  email: Mail,
  portal_web: AppWindow,
  api: Webhook,
};

export const DESTINO_ICON: Record<string, LucideIcon> = {
  tienda_fisica: Store,
  ecommerce: ShoppingCart,
  almacen_central: Warehouse,
};

function Glyph({
  icon: Icon,
  size,
  className,
}: {
  icon: LucideIcon;
  size: number;
  className?: string;
}) {
  return (
    <Icon
      aria-hidden
      size={size}
      strokeWidth={1.85}
      className={cn("shrink-0", className)}
    />
  );
}

export function MonedaIcon({
  moneda,
  size = 13,
  className,
}: {
  moneda: string | null | undefined;
  size?: number;
  className?: string;
}) {
  return <Glyph icon={MONEDA_ICON[moneda ?? ""] ?? DollarSign} size={size} className={className} />;
}

export function CanalIcon({
  canal,
  size = 13,
  className,
}: {
  canal: string | null | undefined;
  size?: number;
  className?: string;
}) {
  return <Glyph icon={CANAL_ICON[canal ?? ""] ?? Globe} size={size} className={className} />;
}

export function DestinoIcon({
  tipo,
  size = 13,
  className,
}: {
  tipo: string | null | undefined;
  size?: number;
  className?: string;
}) {
  return <Glyph icon={DESTINO_ICON[tipo ?? ""] ?? Store} size={size} className={className} />;
}

// Banderas en viewBox 20x14, simplificadas pero reconocibles.
const FLAGS: Record<string, React.ReactNode> = {
  "España": (
    <>
      <rect width="20" height="14" fill="#c60b1e" />
      <rect y="3.5" width="20" height="7" fill="#ffc400" />
    </>
  ),
  Italia: (
    <>
      <rect width="20" height="14" fill="#fff" />
      <rect width="6.67" height="14" fill="#009246" />
      <rect x="13.33" width="6.67" height="14" fill="#ce2b37" />
    </>
  ),
  Portugal: (
    <>
      <rect width="20" height="14" fill="#ff0000" />
      <rect width="8" height="14" fill="#006600" />
      <circle cx="8" cy="7" r="2.6" fill="#ffd400" />
    </>
  ),
  China: (
    <>
      <rect width="20" height="14" fill="#de2910" />
      <polygon
        points="4,2 4.9,4.6 7.6,4.6 5.4,6.2 6.2,8.8 4,7.2 1.8,8.8 2.6,6.2 0.4,4.6 3.1,4.6"
        fill="#ffde00"
      />
    </>
  ),
  // Bandera de la UE (para la moneda euro): fondo azul y corona de 12 estrellas.
  UE: (
    <>
      <rect width="20" height="14" fill="#003399" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <circle key={i} cx={10 + 4.2 * Math.sin(a)} cy={7 - 4.2 * Math.cos(a)} r="0.8" fill="#ffcc00" />
        );
      })}
    </>
  ),
  "Estados Unidos": (
    <>
      <rect width="20" height="14" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((y) => (
        <rect key={y} y={y * 1.077} width="20" height="1.077" fill="#b22234" />
      ))}
      <rect width="9" height="7.5" fill="#3c3b6e" />
    </>
  ),
};

export function PaisFlag({
  pais,
  size = 16,
  className,
}: {
  pais: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const flag = pais ? FLAGS[pais] : undefined;
  if (!flag) return <Glyph icon={Globe} size={size - 2} className={className} />;
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 14"
      width={size}
      height={(size * 14) / 20}
      className={cn("shrink-0 rounded-[2px] ring-1 ring-black/10", className)}
    >
      {flag}
    </svg>
  );
}

/** Bandera como <svg> anidado, para dibujarla dentro de otro SVG (gráficos isométricos). */
export function FlagAt({
  flag,
  x,
  y,
  width = 20,
}: {
  flag: string;
  x: number;
  y: number;
  width?: number;
}) {
  const f = FLAGS[flag];
  if (!f) return null;
  return (
    <svg x={x} y={y} width={width} height={(width * 14) / 20} viewBox="0 0 20 14" aria-hidden>
      {f}
      <rect width="20" height="14" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.6" />
    </svg>
  );
}

/** Bandera asociada a cada moneda de origen. */
export const MONEDA_FLAG: Record<string, string> = {
  EUR: "UE",
  USD: "Estados Unidos",
  CNY: "China",
};
