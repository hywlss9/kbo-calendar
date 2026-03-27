import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/project/kbo-calendar',
  trailingSlash: true,
  images: { unoptimized: true },
  serverExternalPackages: ['better-sqlite3', 'playwright'],
  turbopack: {},
};

export default nextConfig;
