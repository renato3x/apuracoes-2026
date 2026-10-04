import type { NextConfig } from "next";
const config: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "resultados.tse.jus.br" },
      { protocol: "https", hostname: "resultados-sim.tse.jus.br" },
    ],
  },
  poweredByHeader: false,
};
export default config;
