"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Receipt, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Vista ejecutiva", short: "Ejecutiva", icon: LayoutGrid },
  { href: "/facturas", label: "Facturas y conciliación", short: "Facturas", icon: Receipt },
  { href: "/stock", label: "Stock e inventario", short: "Stock", icon: Boxes },
] as const;

/** Barra de navegación horizontal superior, fija y con efecto glass. */
export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/85 backdrop-blur-xl backdrop-saturate-150 shadow-[0_1px_0_0_rgba(0,0,0,0.02)]">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-3 px-4 sm:h-20 sm:px-6">
        {/* Marca */}
        <Link
          href="/"
          aria-label="NextWear · Cuentas por pagar"
          className="group flex shrink-0 items-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="NextWear"
            className="h-14 w-auto object-contain mix-blend-multiply transition-transform duration-300 [transition-timing-function:var(--ease-out)] group-hover:scale-[1.03] sm:h-16"
          />
        </Link>

        {/* Navegación */}
        <nav
          aria-label="Secciones del panel"
          className="flex flex-1 items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:justify-center"
        >
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200 [transition-timing-function:var(--ease-out)]",
                  active
                    ? "gradient-brand-soft text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary),transparent_78%)]"
                    : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                )}
              >
                <Icon
                  aria-hidden
                  size={17}
                  strokeWidth={1.75}
                  className="icon-anim shrink-0"
                />
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.short}</span>
              </Link>
            );
          })}
        </nav>

        {/* Estado en vivo */}
        <div className="hidden shrink-0 items-center gap-2 rounded-full border border-border/60 bg-secondary/50 px-3 py-1.5 md:flex">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[color:var(--ok)] opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-[color:var(--ok)]" />
          </span>
          <span className="text-xs text-muted-foreground">En vivo · Supabase</span>
        </div>
      </div>
    </header>
  );
}
