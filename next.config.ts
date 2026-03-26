import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'playwright'],
  cacheComponents: true,
};

export default nextConfig;
