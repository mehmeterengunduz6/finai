import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Experimental features for better performance
  experimental: {
    // Optimize package imports for better tree-shaking
    optimizePackageImports: ['recharts', 'lucide-react'],
  },

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

export default nextConfig;
