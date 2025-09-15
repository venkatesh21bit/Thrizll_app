# 🌐 Thrizll Web Deployment Guide

## Quick Start

### Option 1: Using Deployment Script (Windows)
```bash
.\deploy-web.bat
```

### Option 2: Manual Build
```bash
# Install dependencies
npm install

# Build for web
npm run build:web

# The web build will be in ./web-build directory
```

## Deployment Options

### 🚀 Vercel Deployment (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   npm run deploy:vercel
   ```

   Or manually:
   ```bash
   npm run build:web
   cd web-build
   vercel --prod
   ```

### 🌐 Netlify Deployment

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Deploy**:
   ```bash
   npm run deploy:netlify
   ```

   Or manually:
   ```bash
   npm run build:web
   cd web-build
   netlify deploy --prod --dir .
   ```

### 📱 Local Preview

To test your web build locally:
```bash
npm run preview:web
```

## Environment Variables

For production deployment, make sure these environment variables are set:

- `EXPO_PUBLIC_API_URL`: Your backend API URL (https://thrizll-app.onrender.com)
- `NODE_ENV`: production
- `EXPO_PUBLIC_WS_URL`: Your WebSocket URL (wss://thrizll-app.onrender.com)

## Web-Specific Features

### ✅ Working on Web:
- User authentication
- Profile creation and editing
- User discovery and swiping
- Chat functionality
- Connection requests
- Real-time messaging (WebSocket)
- Telemetry tracking

### ❌ Limited on Web:
- Lottie animations (disabled for better performance)
- Camera/photo upload (uses file picker instead)
- Push notifications (requires service worker setup)
- Background tasks

## Performance Optimizations

The web build includes:
- Responsive design (mobile-first)
- Optimized bundle size
- Static asset caching
- Progressive Web App (PWA) features
- Cross-browser compatibility

## Troubleshooting

### Build Issues:
```bash
# Clear Expo cache
expo start --clear

# Clean and rebuild
rm -rf web-build
npm run build:web
```

### Deployment Issues:
- Check that all environment variables are set correctly
- Ensure your backend API supports CORS for web requests
- Verify that WebSocket connections work from web browsers

## URLs After Deployment

- **Vercel**: `https://your-app-name.vercel.app`
- **Netlify**: `https://your-app-name.netlify.app`

## Custom Domain

Both Vercel and Netlify support custom domains. Check their documentation for setting up your own domain.

---

🎉 Your Thrizll app is now ready for web deployment!