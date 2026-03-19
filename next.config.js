/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['49.12.224.70'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  }
};

module.exports = nextConfig;
