import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@appointiq/engine', '@appointiq/ghl', '@appointiq/sandbox'],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
