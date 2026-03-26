import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'playwright'],
  experimental: {
    cacheComponents: true,
  },
};

export default nextConfig;
