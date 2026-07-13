import { TopNav } from "@/components/top-nav";
import { CopilotLauncher } from "@/components/copilot/copilot-launcher";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-full w-full flex-col">
      <div className="app-aurora" aria-hidden />

      <div className="relative z-10 flex min-h-full w-full flex-col">
        <TopNav />

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-20 pt-6 sm:px-6 md:pt-8">
          {children}
        </main>

        <footer className="mx-auto w-full max-w-[1400px] px-4 pb-6 sm:px-6">
          <p className="text-xs text-muted-foreground">
            NextWear · Torre de control de Cuentas por Pagar — Nextwear S.L.
            Dashboard de solo lectura; importes normalizados a EUR.
          </p>
        </footer>
      </div>

      <CopilotLauncher />
    </div>
  );
}
