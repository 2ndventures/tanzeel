// API Configuration
// This determines the backend URL based on the environment
import { Capacitor } from '@capacitor/core';

const getApiBaseUrl = (): string => {
  // Check if we're running in Capacitor (native mobile app)
  // Use the official Capacitor API for reliable platform detection
  const isNativePlatform = Capacitor.isNativePlatform();
  
  // In native mobile apps, always use the published backend
  if (isNativePlatform) {
    return 'https://11424-newest-version-web266.replit.app';
  }
  
  // In web browser, use relative URLs (works on Replit and localhost)
  return '';
};

export const API_BASE_URL = getApiBaseUrl();
