import { StyleSheet, Platform, Dimensions } from 'react-native';

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Web-specific style utilities
export const webStyles = StyleSheet.create({
  // Container styles for web
  webContainer: {
    maxWidth: Platform.OS === 'web' ? 1200 : '100%',
    marginHorizontal: Platform.OS === 'web' ? 'auto' : 0,
    width: '100%',
  },
  
  // Responsive layout
  responsiveContainer: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 400 : '100%', // Mobile-like width on desktop
    marginHorizontal: Platform.OS === 'web' ? 'auto' : 0,
    minHeight: Platform.OS === 'web' ? screenHeight : 'auto',
  },
  
  // Web-safe shadows (web doesn't support all shadow props)
  webShadow: Platform.select({
    web: {
      // @ts-ignore - Web-specific CSS properties
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
  }),
});

// Web-specific scroll styles (not using StyleSheet.create to avoid TS errors)
export const getWebScrollStyle = () => ({
  flex: 1,
  ...(Platform.OS === 'web' && {
    // @ts-ignore - Web-specific CSS properties  
    overflow: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollBehavior: 'smooth',
    height: '100%',
  }),
});

// Scrollable content container
export const getScrollableContentStyle = () => ({
  flex: 1,
  ...(Platform.OS === 'web' && {
    // @ts-ignore - Web-specific CSS properties
    overflowY: 'auto',
    height: '100vh',
    maxHeight: '100vh',
  }),
});

// Web header style
export const getWebHeaderStyle = () => ({
  ...(Platform.OS === 'web' && {
    // @ts-ignore - Web-specific CSS properties
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  }),
});

// Responsive breakpoints
export const breakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1200,
};

// Utility function to get responsive value
export const getResponsiveValue = (mobile: any, tablet?: any, desktop?: any) => {
  if (Platform.OS !== 'web') return mobile;
  
  const width = screenWidth;
  
  if (width >= breakpoints.desktop && desktop !== undefined) {
    return desktop;
  } else if (width >= breakpoints.tablet && tablet !== undefined) {
    return tablet;
  }
  return mobile;
};

// Utility function for web-safe styles
export const getWebSafeStyle = (style: any) => {
  if (Platform.OS !== 'web') return style;
  
  // Remove React Native specific properties that don't work on web
  const webSafeStyle = { ...style };
  
  // Remove shadow properties and replace with boxShadow
  if (style.shadowColor || style.shadowOffset || style.shadowOpacity || style.shadowRadius) {
    delete webSafeStyle.shadowColor;
    delete webSafeStyle.shadowOffset;
    delete webSafeStyle.shadowOpacity;
    delete webSafeStyle.shadowRadius;
    delete webSafeStyle.elevation;
    
    // @ts-ignore - Web-specific CSS properties
    webSafeStyle.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  }
  
  return webSafeStyle;
};

// Web-specific button styles
export const getWebButtonStyle = () => ({
  ...(Platform.OS === 'web' && {
    // @ts-ignore - Web-specific CSS properties
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    userSelect: 'none',
  }),
});

// Web-specific text styles
export const getWebTextStyle = () => ({
  ...(Platform.OS === 'web' && {
    // @ts-ignore - Web-specific CSS properties
    userSelect: 'text',
    cursor: 'text',
  }),
});

// Common web component styles
export const webComponentStyles = StyleSheet.create({
  // Chat screen responsive layout
  chatContainer: {
    flex: 1,
    maxWidth: Platform.OS === 'web' ? 800 : '100%',
    marginHorizontal: Platform.OS === 'web' ? 'auto' : 0,
    backgroundColor: '#000',
  },
  
  // Discover screen responsive layout
  discoverContainer: {
    flex: 1,
    maxWidth: Platform.OS === 'web' ? 600 : '100%',
    marginHorizontal: Platform.OS === 'web' ? 'auto' : 0,
  },
  
  // Profile screen responsive layout
  profileContainer: {
    flex: 1,
    maxWidth: Platform.OS === 'web' ? 500 : '100%',
    marginHorizontal: Platform.OS === 'web' ? 'auto' : 0,
  },
});