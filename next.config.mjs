/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['googleapis', 'xlsx'],
  },
};

export default nextConfig;
