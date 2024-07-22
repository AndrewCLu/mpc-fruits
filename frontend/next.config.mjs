/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { net: false, tls: false, fs: false };
    if (!isServer) {
      config.module.exprContextCritical = false;
    }
    return config;
  },
};

export default nextConfig;
