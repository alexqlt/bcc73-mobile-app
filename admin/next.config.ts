import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    serverActions: {
      // Photos d'actualités jusqu'à 5 Mo (limite du bucket news-photos) + le reste du formulaire.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
