import { Platform } from 'react-native';

// Function to determine the correct API base URL
export const getApiBaseUrl = (): string => {
  // If running on web, use localhost
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }
  
  // For development, you need to replace this with your computer's actual IP address
  // To find your IP: Run 'ipconfig' in Command Prompt and look for IPv4 Address
  // Common IP ranges: 192.168.x.x or 10.0.x.x
  const DEVELOPMENT_IP = '10.95.235.197'; // Your computer's actual IP address
  
  return `http://${DEVELOPMENT_IP}:8000`;
};

// Function to determine the correct WebSocket URL
export const getWebSocketUrl = (): string => {
  // If running on web, use localhost
  if (Platform.OS === 'web') {
    return 'ws://localhost:8000';
  }
  
  const DEVELOPMENT_IP = '172.26.226.197'; // Your computer's actual IP address
  
  return `ws://${DEVELOPMENT_IP}:8000`;
};

export const API_CONFIG = {
  baseUrl: getApiBaseUrl(),
  wsUrl: getWebSocketUrl(),
  timeout: 10000,
  retryAttempts: 3,
  retryDelayMs: 1000,
};
