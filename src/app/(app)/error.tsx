"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl bg-card p-8 text-center shadow-card">
        <span className="eyebrow text-[color:var(--exception)]">
          Error de carga
        </span>
        <h2 className="font-display text-xl">No se pudieron cargar los datos</h2>
        <p className="text-sm text-muted-foreground">
          Revisa la conexión a Supabase y que <code>SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          esté configurada en <code>.env.local</code>.
        </p>
        <p className="font-numeric text-xs text-muted-foreground/80 break-all">
          {error.message}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-transform active:scale-[0.97]"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
