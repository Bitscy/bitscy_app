/** @type {import('next').NextConfig} */
// Serwist's default mode is webpack-only (see serwist/serwist#54).
// Dev runs Turbopack with PWA disabled; production build runs webpack
// (via the --webpack flag in the build script) to generate sw.js.
const withSerwist = require('@serwist/next').default({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
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

module.exports = withSerwist(nextConfig);
