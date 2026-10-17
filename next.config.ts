import type { NextConfig } from "next";

// Backend del copiloto (FinFlow Bot, app propia en Vercel). Toda la lógica LLM
// vive allí; este repo solo lo reenvía para poder pintar el chat de forma nativa.
const FINFLOW_BOT_ORIGIN = "https://finflow-bot-vercel.vercel.app";

const nextConfig: NextConfig = {
  // Oculta el indicador de desarrollo de Next.js (la "N" flotante).
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/copilot-proxy/chat",
        destination: `${FINFLOW_BOT_ORIGIN}/api/chat`,
      },
    ];
  },
};

export default nextConfig;
