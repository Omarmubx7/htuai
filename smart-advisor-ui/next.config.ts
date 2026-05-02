import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: true,
    turbo: {
      root: path.join(__dirname),
    },
    serverExternalPackages: ['@prisma/client'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
