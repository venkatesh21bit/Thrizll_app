import { Platform } from 'react-native';

// Web-specific configuration
export const WEB_CONFIG = {
  isWeb: Platform.OS === 'web',
  
  // Features that work on web
  features: {
    lottieAnimations: false, // Lottie animations may not work properly on web
    webSockets: true, // WebSockets work on web
    fileUpload: true, // File upload works on web
    camera: false, // Camera requires native permissions
    notifications: false, // Push notifications require service worker
    backgroundTasks: false, // Background tasks are limited on web
  },

  // Web-specific API configuration
  api: {
    baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://thrizll-app.onrender.com',
    wsUrl: process.env.EXPO_PUBLIC_WS_URL || 'wss://thrizll-app.onrender.com',
    timeout: 30000,
  },

  // Web performance optimizations
  performance: {
    enableVirtualization: true,
    lazyLoadImages: true,
    prefetchRoutes: false,
  },

  // Web-specific styling
  styles: {
    maxWidth: 1200, // Max width for desktop
    breakpoints: {
      mobile: 768,
      tablet: 1024,
      desktop: 1200,
    },
  },
};

// Helper function to check if feature is available
export const isFeatureAvailable = (feature: keyof typeof WEB_CONFIG.features): boolean => {
  if (Platform.OS === 'web') {
    return WEB_CONFIG.features[feature];
  }
  return true; // All features available on native
};

// Helper function for responsive design
export const getResponsiveStyle = () => {
  if (Platform.OS !== 'web') return {};
  
  const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
  
  if (width <= WEB_CONFIG.styles.breakpoints.mobile) {
    return { maxWidth: '100%', padding: 16 };
  } else if (width <= WEB_CONFIG.styles.breakpoints.tablet) {
    return { maxWidth: '90%', padding: 24 };
  } else {
    return { maxWidth: WEB_CONFIG.styles.maxWidth, padding: 32 };
  }
};