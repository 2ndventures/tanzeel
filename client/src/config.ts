import { Capacitor } from '@capacitor/core';

// API Configuration
// This determines the backend URL based on the environment
// - Web browser: Uses relative URLs to call local backend
// - iOS/Android app: Uses published Replit backend

const getApiBaseUrl = (): string => {
  // Check if running in native iOS/Android app
  if (Capacitor.isNativePlatform()) {
    // Native app: must use full URL to reach Replit backend
    return 'https://11424-newest-version-web266.replit.app';
  }
  
  // Web browser: use relative URLs (empty string) to call local backend
  return '';
};

export const API_BASE_URL = getApiBaseUrl();
