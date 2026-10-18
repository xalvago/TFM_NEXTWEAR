import type { NextConfig } from "next";

// Backend del copiloto (FinFlow Bot, app propia en Vercel). Toda la lógica LLM
// vive allí; este repo solo lo reenvía para poder pintar el chat de forma nativa.
const FINFLOW_BOT_ORIGIN = "https://finflow-bot-vercel.vercel.app";

// Portal (carpeta PORTAL/): proyecto propio en Vercel, expuesto bajo /portal. Solo se activa
// si PORTAL_ORIGIN está definida (p. ej. https://tfm-nextwear-portal.vercel.app); sin ella el
// dashboard se comporta exactamente igual que antes.
const PORTAL_ORIGIN = process.env.PORTAL_ORIGIN?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Oculta el indicador de desarrollo de Next.js (la "N" flotante).
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/copilot-proxy/chat",
        destination: `${FINFLOW_BOT_ORIGIN}/api/chat`,
      },
      ...(PORTAL_ORIGIN
        ? [
            { source: "/portal", destination: `${PORTAL_ORIGIN}/portal` },
            { source: "/portal/:path*", destination: `${PORTAL_ORIGIN}/portal/:path*` },
          ]
        : []),
    ];
  },
};

export default nextConfig;
