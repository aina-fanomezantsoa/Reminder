import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Export statique (ARCHITECTURE.md section 1) : aucun serveur applicatif.
  output: 'export',
  images: { unoptimized: true },
  // GitHub Pages sert le site sous /<repo> : défini par le workflow de déploiement, vide en local.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
