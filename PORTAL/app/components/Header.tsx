"use client";

import { useRouter } from "next/navigation";

type HeaderProps = {
  variant: "login" | "dashboard";
};

export default function Header({ variant }: HeaderProps) {
  const router = useRouter();

  function handleLogout() {
    sessionStorage.removeItem("authed");
    router.push("/login");
  }

  return (
    <header
      id="app-header"
      data-testid="app-header"
      className={
        variant === "dashboard"
          ? "sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-neutral-900/95 px-4 py-3 text-white shadow-md backdrop-blur-md sm:px-6 lg:px-8"
          : "sticky top-0 z-20 flex items-center justify-between border-b border-brand-gold/30 bg-white/85 px-6 py-4 backdrop-blur-md"
      }
    >
      <div className="flex min-w-0 items-center gap-2">
        <div
          aria-hidden="true"
          className={
            variant === "dashboard"
              ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-brand-red to-brand-gold text-xs font-bold text-white shadow-sm"
              : "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-brand-red to-brand-gold text-sm font-bold text-white shadow-sm"
          }
        >
          S
        </div>
        <span
          className={
            variant === "dashboard"
              ? "truncate text-sm font-semibold tracking-tight text-white/90"
              : "truncate text-lg font-semibold tracking-tight text-neutral-text"
          }
        >
          Guangzhou Fashion Co. Ltd
        </span>
      </div>

      {variant === "login" ? (
        <div
          id="language-selector"
          data-testid="language-selector"
          className="flex items-center gap-2 text-sm font-medium text-neutral-text/70"
        >
          <span className="cursor-default text-brand-red">EN</span>
          <span className="text-neutral-text/30">|</span>
          <span className="cursor-default">中文</span>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-3">
          <span
            id="welcome-message"
            data-testid="welcome-message"
            className="hidden text-xs font-medium text-white/70 sm:inline"
          >
            Welcome, Retail Client
          </span>
          <button
            id="logout-btn"
            name="logout"
            data-testid="logout-btn"
            type="button"
            onClick={handleLogout}
            className="shrink-0 rounded-md bg-brand-red px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-red/90"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
