/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: false,
    turbo: false, // Desactiva Turbopack y usa Webpack
  },
};

module.exports = nextConfig;
