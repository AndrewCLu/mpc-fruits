/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Needed to make snarkJs work client side
    config.resolve.fallback = { net: false, tls: false, fs: false };
    return config;
  },
};

export default nextConfig;
