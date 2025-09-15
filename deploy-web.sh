#!/bin/bash

echo "🌐 Thrizll Web Deployment Script"
echo "================================"

# Check if required tools are installed
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed. Aborting." >&2; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "❌ npx is required but not installed. Aborting." >&2; exit 1; }

echo "📦 Installing dependencies..."
npm install

echo "🧹 Cleaning previous build..."
rm -rf web-build

echo "🏗️  Building for web..."
npx expo export:web

if [ $? -eq 0 ]; then
    echo "✅ Web build successful!"
    echo "📁 Build output is in ./web-build"
    
    echo ""
    echo "🚀 Deployment options:"
    echo "1. Vercel: cd web-build && vercel --prod"
    echo "2. Netlify: cd web-build && netlify deploy --prod --dir ."
    echo "3. Local preview: cd web-build && npx serve -s ."
    echo ""
    echo "🌐 Your app is ready for web deployment!"
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi