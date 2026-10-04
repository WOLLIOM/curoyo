/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'export', // static site for Cloudflare Pages (out/)
  images: { unoptimized: true },
  trailingSlash: false,
};

module.exports = nextConfig;
