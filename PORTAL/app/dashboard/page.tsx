"use client";

import { useState } from "react";
import Image from "next/image";
import { asset } from "@/app/lib/asset";
import AnimatedNumber from "@/app/components/AnimatedNumber";
import SalesChart from "@/app/components/SalesChart";
import SeigaihaPattern from "@/app/components/SeigaihaPattern";

function SpainFlag({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 3 2" className={className} aria-hidden="true">
      <rect width="3" height="2" fill="#AA151B" />
      <rect y="0.5" width="3" height="1" fill="#F1BF00" />
    </svg>
  );
}

function ChinaSeal({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" role="img" aria-label="Guangzhou Fashion seal">
      <circle cx="24" cy="24" r="23" fill="white" fillOpacity="0.92" />
      <circle cx="24" cy="24" r="22" fill="none" stroke="var(--color-brand-red)" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="16.5" fill="none" stroke="var(--color-brand-red)" strokeWidth="1" />
      <text
        x="24"
        y="24"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="19"
        fontWeight="700"
        fill="var(--color-brand-red)"
        style={{ fontFamily: "'Noto Sans SC', 'Microsoft YaHei', sans-serif" }}
      >
        运
      </text>
    </svg>
  );
}

const PROFILE_TAGS = ["Client since 2019", "Gold Partner tier", "EU – China corridor"];

const PROFILE_FACTS = [
  { label: "Country", value: "Spain" },
  { label: "Account manager", value: "Laura Chen" },
  { label: "Primary trade lane", value: "Shenzhen ⇄ Rotterdam" },
  { label: "Incoterm", value: "FOB Shenzhen" },
  { label: "Payment terms", value: "Net 30 days" },
  { label: "Primary carrier", value: "Guangzhou Fashion Co. Ltd" },
  { label: "Annual volume", value: "1,240 TEU" },
];

const METRICS = [
  {
    id: "metric-active-shipments",
    label: "Active shipments",
    value: 128,
    trend: 8,
    icon: "truck" as const,
    photo: "/photos/barco.jpg",
    position: "center",
    tint: "from-slate-900/85 via-slate-900/55 to-slate-900/20",
    glow: "hover:shadow-[0_12px_28px_-12px_rgba(15,23,42,0.55)]",
  },
  {
    id: "metric-pending-deliveries",
    label: "Pending deliveries",
    value: 34,
    trend: -3,
    icon: "package" as const,
    photo: "/photos/ropa.jpg",
    position: "center",
    tint: "from-amber-950/85 via-amber-900/50 to-amber-900/10",
    glow: "hover:shadow-[0_12px_28px_-12px_rgba(200,162,75,0.55)]",
  },
  {
    id: "metric-total-invoices",
    label: "Total invoices",
    value: 312,
    trend: 5,
    icon: "file" as const,
    photo: "/photos/invoice.jpg",
    position: "center",
    tint: "from-slate-950/80 via-slate-950/35 to-slate-950/10",
    glow: "hover:shadow-[0_12px_28px_-12px_rgba(230,0,18,0.5)]",
  },
  {
    id: "metric-open-tickets",
    label: "Open tickets",
    value: 5,
    trend: -12,
    icon: "alert" as const,
    photo: "/photos/container.jpg",
    position: "right",
    tint: "from-neutral-text/95 via-neutral-text/80 to-neutral-text/50",
    glow: "hover:shadow-[0_12px_28px_-12px_rgba(26,26,26,0.5)]",
  },
];

type InvoiceStatus = "downloaded" | "pending";

const INVOICES: {
  id: string;
  provider: string;
  file: string;
  status: InvoiceStatus;
  date: string;
  amount: string;
}[] = [
  { id: "F-2026-00349", provider: "Nextwear HQ", file: "F-2026-00349.pdf", status: "pending", date: "Apr 1, 2026", amount: "1.568,16 CNY (1€ = 7,63 CNY)" },
  { id: "F-2026-00286", provider: "Guangzhou Fashion Co. Ltd", file: "F-2026-00286.pdf", status: "downloaded", date: "03 jun 2026", amount: "225,51 € (1€ = 7,60 CNY)" },
  { id: "F-2026-00240", provider: "Guangzhou Fashion Co. Ltd", file: "F-2026-00240.pdf", status: "downloaded", date: "02 may 2026", amount: "366,34 € (1€ = 7,57 CNY)" },
  { id: "F-2026-00248", provider: "Guangzhou Fashion Co. Ltd", file: "F-2026-00248.pdf", status: "downloaded", date: "23 abr 2026", amount: "421,66 € (1€ = 7,55 CNY)" },
];

const INVOICES_PER_PAGE = 5;

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M4 18h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetricIcon({ name }: { name: "truck" | "package" | "file" | "alert" }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none" as const, "aria-hidden": true };
  switch (name) {
    case "truck":
      return (
        <svg {...common}>
          <path d="M2 7h11v9H2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M13 10h4l4 3v3h-8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="6.5" cy="18" r="1.8" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17" cy="18" r="1.8" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "package":
      return (
        <svg {...common}>
          <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M3 8.5V16l9 4.5 9-4.5V8.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M12 13v7.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "file":
      return (
        <svg {...common}>
          <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8 13h8M8 17h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "alert":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 7.5v5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="1" fill="currentColor" />
        </svg>
      );
  }
}

function TrendBadge({ value }: { value: number }) {
  const positive = value >= 0;
  const base = positive ? "bg-white/15 text-emerald-300" : "bg-white/15 text-rose-200";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${base}`}>
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d={positive ? "M6 15 12 9l6 6" : "M6 9l6 6 6-6"}
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {Math.abs(value)}%
    </span>
  );
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gold/15 px-2 py-0.5 text-[10px] font-semibold text-brand-gold">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-gold opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-gold" />
        </span>
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Completed
    </span>
  );
}

export default function DashboardPage() {
  const totalSales = 268;
  const [invoicePage, setInvoicePage] = useState(0);
  const invoicePageCount = Math.ceil(INVOICES.length / INVOICES_PER_PAGE);
  const pagedInvoices = INVOICES.slice(
    invoicePage * INVOICES_PER_PAGE,
    invoicePage * INVOICES_PER_PAGE + INVOICES_PER_PAGE,
  );

  return (
    <div id="dashboard-content" data-testid="dashboard-content" className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      {/* Profile + KPIs */}
      <div className="shrink-0 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1.05fr_2fr]">
        {/* Company profile */}
        <section
          id="overview"
          className="animate-notify relative flex flex-col overflow-hidden rounded-2xl bg-neutral-900 p-4 text-white shadow-lg lg:p-5"
          style={{ animationDelay: "250ms" }}
        >
          <div className="relative z-10 flex flex-1 flex-col">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-md ring-1 ring-white/40 lg:h-14 lg:w-14"
                >
                  <Image
                    src="/nextwear-logo.png"
                    alt="Nextwear"
                    width={160}
                    height={92}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                    Client profile
                  </p>
                  <h1 className="text-lg font-bold tracking-tight lg:text-xl">Nextwear</h1>
                </div>
              </div>
              <ChinaSeal className="h-9 w-9 shrink-0 self-start opacity-90 lg:h-11 lg:w-11" />
            </div>

            <p className="mt-2 text-xs leading-snug text-white/75 lg:mt-3">
              Apparel export account · served by Guangzhou Fashion Co. Ltd across the
              China&nbsp;–&nbsp;Europe retail corridor.
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5 lg:mt-3">
              {PROFILE_TAGS.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-medium text-white/85 ring-1 ring-white/20 backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="my-3 h-px bg-white/10" />

            <div className="grid flex-1 grid-cols-2 content-start gap-x-4 gap-y-2 lg:grid-cols-3">
              {PROFILE_FACTS.map((fact, i) => (
                <div
                  key={fact.label}
                  className="animate-notify"
                  style={{ animationDelay: `${550 + i * 70}ms` }}
                >
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-white/50">
                    {fact.label}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-white/90">
                    {fact.value}
                    {fact.label === "Country" && (
                      <SpainFlag className="h-2.5 w-4 shrink-0 rounded-[1.5px] shadow-sm ring-1 ring-white/30" />
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section aria-labelledby="kpi-heading" className="flex flex-col">
          <h2
            id="kpi-heading"
            className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-text/45"
          >
            Operations overview
          </h2>
          <div className="mt-2.5 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 sm:grid-rows-2 xl:grid-cols-4 xl:grid-rows-1">
            {METRICS.map((metric, i) => (
              <div
                key={metric.id}
                id={metric.id}
                data-testid={metric.id}
                className={`animate-notify group relative flex min-h-[68px] overflow-hidden rounded-xl p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 ${metric.glow}`}
                style={{ animationDelay: `${450 + i * 140}ms` }}
              >
                {metric.photo && (
                  <img
                    src={asset(metric.photo)}
                    alt=""
                    aria-hidden="true"
                    style={{ objectPosition: metric.position }}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <div className={`absolute inset-0 bg-gradient-to-br ${metric.tint}`} />

                <div className="relative z-10 flex w-full flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/20">
                      <MetricIcon name={metric.icon} />
                    </div>
                    <TrendBadge value={metric.trend} />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-white/75">{metric.label}</p>
                    <p className="mt-0.5 text-lg font-bold text-white sm:text-xl">
                      <AnimatedNumber value={metric.value} />
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Sales chart + Invoices */}
      <section className="grid grid-cols-1 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-3">
        <div className="card-elevated animate-notify flex min-h-[380px] flex-col rounded-xl border border-white/60 bg-white p-4 lg:col-span-2 lg:min-h-[320px]" style={{ animationDelay: "900ms" }}>
          <div className="flex shrink-0 items-start justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-text">Sales performance</h2>
              <p className="text-[11px] text-neutral-text/55">Monthly exported volume vs. same period last year.</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-neutral-text">
                €<AnimatedNumber value={totalSales} />k
              </p>
              <span className="text-[10px] font-semibold text-emerald-600">+15% vs. previous month</span>
            </div>
          </div>
          <SalesChart className="mt-4 flex flex-1 flex-col lg:min-h-0" />
        </div>

        <div
          id="invoices"
          data-testid="invoices-content"
          className="card-elevated animate-notify flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-white/60 bg-white lg:min-h-[320px]"
          style={{ animationDelay: "1050ms" }}
        >
          <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-neutral-text to-neutral-text/85 px-4 py-3 text-white">
            <SeigaihaPattern className="pointer-events-none absolute inset-0 h-full w-full text-white opacity-[0.06]" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h2 id="invoices-heading" className="text-sm font-semibold">
                  Customer invoices
                </h2>
                <p className="mt-0.5 text-[11px] text-white/60">Documents available for your account.</p>
              </div>
              <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-semibold ring-1 ring-white/20">
                {INVOICES.length} total
              </span>
            </div>
          </div>

          <ul className="flex-1 divide-y divide-neutral-text/10 overflow-y-auto bg-neutral-bg/40 lg:min-h-0">
            {pagedInvoices.map((invoice, i) => (
              <li
                key={`${invoice.id}-${invoicePage * INVOICES_PER_PAGE + i}`}
                className={`animate-notify flex items-center justify-between gap-2 border-l-2 bg-white px-4 py-2.5 transition hover:translate-x-0.5 hover:bg-neutral-bg/70 ${
                  invoice.status === "pending" ? "border-brand-gold" : "border-transparent"
                }`}
                style={{ animationDelay: `${1400 + i * 90}ms` }}
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="truncate text-xs font-medium text-neutral-text">{invoice.id}</p>
                    <p className="shrink-0 text-xs font-semibold text-neutral-text/80">{invoice.amount}</p>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-neutral-text/50">
                    {invoice.provider} · {invoice.date}
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={invoice.status} />
                  </div>
                </div>
                {invoice.status === "pending" ? (
                  <a
                    id={`invoice-download-${invoice.id}`}
                    data-testid={`invoice-download-${invoice.id}`}
                    href={asset(`/invoices/${invoice.file}`)}
                    download
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-red text-white transition hover:bg-brand-red/90"
                    aria-label={`Download ${invoice.id}`}
                  >
                    <DownloadIcon />
                  </a>
                ) : (
                  <button
                    id={`invoice-download-${invoice.id}-${invoicePage * INVOICES_PER_PAGE + i}`}
                    data-testid={`invoice-download-${invoice.id}-${invoicePage * INVOICES_PER_PAGE + i}`}
                    type="button"
                    disabled
                    className="flex h-6 w-6 shrink-0 cursor-not-allowed items-center justify-center rounded-md bg-neutral-text/10 text-neutral-text/30"
                    aria-label={`${invoice.id} already downloaded`}
                  >
                    <DownloadIcon />
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="flex shrink-0 items-center justify-between border-t border-neutral-text/10 bg-white px-4 py-2">
            <button
              type="button"
              onClick={() => setInvoicePage((p) => Math.max(0, p - 1))}
              disabled={invoicePage === 0}
              className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-text/60 transition hover:bg-neutral-bg disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronIcon direction="left" />
            </button>
            <span className="text-[10px] font-medium text-neutral-text/50">
              Page {invoicePage + 1} of {invoicePageCount}
            </span>
            <button
              type="button"
              onClick={() => setInvoicePage((p) => Math.min(invoicePageCount - 1, p + 1))}
              disabled={invoicePage >= invoicePageCount - 1}
              className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-text/60 transition hover:bg-neutral-bg disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Next page"
            >
              <ChevronIcon direction="right" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
