/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Proxy Lightning Address resolution to our API route.
      // External wallets GET /.well-known/lnurlp/<username> per the LNURL-pay spec.
      {
        source: '/.well-known/lnurlp/:username',
        destination: '/api/lnurlp/:username',
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

module.exports = withPWA(nextConfig);
