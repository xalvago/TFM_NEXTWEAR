import type { NextConfig } from "next";

// El portal se publica como proyecto propio en Vercel y se expone bajo /portal en el
// dominio del dashboard (rewrite en el next.config.ts del dashboard).
const BASE_PATH = "/portal";

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
};

export default nextConfig;
