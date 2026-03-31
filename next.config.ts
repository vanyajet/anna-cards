import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from local uploads
  images: {
    unoptimized: true,
  },
  // Turbopack config (Next.js 16 default bundler)
  turbopack: {},
  webpack: (config) => {
    // Needed for some Solana wallet adapters that use browser-only globals
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
