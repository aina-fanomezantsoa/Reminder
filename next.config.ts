import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export statique (ARCHITECTURE.md section 1) : aucun serveur applicatif.
  output: "export",
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
