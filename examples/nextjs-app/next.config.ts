import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Disable Turbopack to use webpack with proper externals
  turbopack: (() => {
    const config: any = {};
    return config;
  })(),
};

export default nextConfig;
