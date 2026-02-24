/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@toth/shared'],
  output: 'standalone',
};

module.exports = nextConfig;
