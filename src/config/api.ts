import { Platform } from 'react-native';

// Environment configuration
const ENVIRONMENT = 'production'; // Change to 'development' for local testing

// URLs
const PRODUCTION_URL = 'https://thrizll-app.onrender.com';
const DEVELOPMENT_URL = 'http://localhost:8000';
const DEVELOPMENT_IP = '10.108.24.197'; // Your computer's actual IP address

// Function to determine the correct API base URL
export const getApiBaseUrl = (): string => {
  if (ENVIRONMENT === 'production') {
    return PRODUCTION_URL;
  }
  
  // Development mode
  if (Platform.OS === 'web') {
    return DEVELOPMENT_URL;
  }
  
  return `http://${DEVELOPMENT_IP}:8000`;
};

// Function to determine the correct WebSocket URL
export const getWebSocketUrl = (): string => {
  if (ENVIRONMENT === 'production') {
    return PRODUCTION_URL.replace('https://', 'wss://');
  }
  
  // Development mode
  if (Platform.OS === 'web') {
    return DEVELOPMENT_URL.replace('http://', 'ws://');
  }
  
  return `ws://${DEVELOPMENT_IP}:8000`;
};

export const API_CONFIG = {
  baseUrl: getApiBaseUrl(),
  wsUrl: getWebSocketUrl(),
  timeout: 10000,
  retryAttempts: 3,
  retryDelayMs: 1000,
};
