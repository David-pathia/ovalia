import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Polices du PDF d'avis de valeur, lues sur le disque au moment du rendu.
  outputFileTracingIncludes: {
    '/dashboard/biens/[id]/avis/pdf': ['./src/features/avis/fonts/**']
  },
  serverExternalPackages: ['@react-pdf/renderer'],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false
  }
};

export default nextConfig;
