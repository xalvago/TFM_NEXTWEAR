"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatInt } from "@/lib/finance";
import { cn } from "@/lib/utils";

/** Barra de paginación controlada para tablas. */
export function PaginationBar({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
  noun = "elementos",
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  noun?: string;
}) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3">
      <span className="text-xs text-muted-foreground">
        <span className="font-numeric text-foreground">
          {formatInt(from)}–{formatInt(to)}
        </span>{" "}
        de <span className="font-numeric">{formatInt(total)}</span> {noun}
      </span>

      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <PagerButton
            aria-label="Página anterior"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </PagerButton>

          {pageWindow(page, pageCount).map((p, i) =>
            p === "…" ? (
              <span
                key={`gap-${i}`}
                className="px-1.5 text-xs text-muted-foreground"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                aria-current={p === page ? "page" : undefined}
                onClick={() => onPage(p)}
                className={cn(
                  "size-8 rounded-lg font-numeric text-xs font-medium transition-colors [transition-timing-function:var(--ease-out)]",
                  p === page
                    ? "gradient-brand text-white shadow-[0_3px_10px_-3px_rgba(124,58,237,0.6)]"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {p}
              </button>
            )
          )}

          <PagerButton
            aria-label="Página siguiente"
            disabled={page >= pageCount}
            onClick={() => onPage(page + 1)}
          >
            <ChevronRight size={16} strokeWidth={2} />
          </PagerButton>
        </div>
      )}
    </div>
  );
}

function PagerButton({
  children,
  disabled,
  onClick,
  ...rest
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
      {...rest}
    >
      {children}
    </button>
  );
}

/** Ventana compacta de páginas: 1 … p-1 p p+1 … N */
function pageWindow(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7)
    return Array.from({ length: pageCount }, (_, i) => i + 1);

  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) out.push("…");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < pageCount - 1) out.push("…");
  out.push(pageCount);
  return out;
}
