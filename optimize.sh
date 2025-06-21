#!/bin/bash

echo "🚀 Optimizing Next.js development environment..."

# Set environment variables for better performance
export NEXT_TELEMETRY_DISABLED=1
export NODE_ENV=development
export NODE_OPTIONS="--max-old-space-size=4096"

# Clean up any existing build cache
echo "🧹 Cleaning build cache..."
rm -rf .next node_modules/.cache

# Start the optimized development server
echo "⚡ Starting optimized development server..."
echo "📊 Using Turbopack for faster builds"
echo "🎯 Environment: development"
echo "💾 Memory limit: 4GB"

npm run dev 