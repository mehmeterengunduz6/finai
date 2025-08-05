/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build optimizations
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  compress: true,
  
  // Image optimization
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
  },
};

module.exports = nextConfig;