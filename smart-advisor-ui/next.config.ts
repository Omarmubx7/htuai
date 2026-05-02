import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: true,
    turbo: {
      root: path.join(__dirname),
    },
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  webpack: (config) => {
    // Ensure Prisma client can be resolved
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@prisma/client': path.resolve(__dirname, 'node_modules/.prisma/client'),
    };
    return config;
  },
};

export default nextConfig;
