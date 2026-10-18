"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BackgroundVideoCycle from "@/app/components/BackgroundVideoCycle";

const TITLE = "Guangzhou Fashion Co. Ltd";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      sessionStorage.setItem("authed", "true");
      setLeaving(true);
      setTimeout(() => router.push("/dashboard"), 550);
    } else {
      setError("Please enter a username and password.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="relative flex min-h-screen flex-1 items-center overflow-hidden px-6 py-16 text-white md:px-16">
        <BackgroundVideoCycle />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/70" />

        <div className={`relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-12 md:flex-row md:items-center md:justify-between ${leaving ? "animate-out" : ""}`}>
          <div className="max-w-md">
            <svg width="64" height="10" viewBox="0 0 64 10" className="mb-6 text-brand-gold" aria-hidden="true">
              <line
                x1="1"
                y1="5"
                x2="63"
                y2="5"
                stroke="currentColor"
                strokeWidth="2"
                className="animate-draw"
              />
            </svg>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-brand-amber">
              <span aria-label={TITLE}>
                {TITLE.split("").map((ch, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className="animate-letter"
                    style={{ animationDelay: `${300 + i * 45}ms` }}
                  >
                    {ch === " " ? "\u00A0" : ch}
                  </span>
                ))}
              </span>
            </h1>
            <p className="mt-4 text-lg font-medium text-white/90">
              Cross-border retail logistics, delivered.
            </p>
          </div>

          <div className="w-full max-w-sm animate-fade-up rounded-2xl bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-white">Sign in to your account</h2>
            <p className="mt-1 text-sm text-white/70">
              Access shipment tracking, invoices and reports.
            </p>

            <form
              id="login-form"
              data-testid="login-form"
              onSubmit={handleSubmit}
              className="mt-8 flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-username" className="text-sm font-medium text-white/90">
                  Username
                </label>
                <input
                  id="login-username"
                  name="username"
                  data-testid="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="rounded-md border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-password" className="text-sm font-medium text-white/90">
                  Password
                </label>
                <input
                  id="login-password"
                  name="password"
                  data-testid="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-md border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold"
                />
              </div>

              {error && (
                <p id="login-error" data-testid="login-error" className="text-sm font-medium text-brand-gold">
                  {error}
                </p>
              )}

              <button
                id="login-submit"
                data-testid="login-submit"
                type="submit"
                className="mt-2 rounded-md bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-red/90"
              >
                Sign In
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
