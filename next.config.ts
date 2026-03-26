import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'playwright'],
  cacheComponents: true,
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/*.db', '**/*.db-shm', '**/*.db-wal', '**/node_modules/**'],
    };
    return config;
  },
};

export default nextConfig;
