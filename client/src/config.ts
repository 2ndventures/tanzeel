import { Capacitor } from '@capacitor/core';

// API Configuration
// This determines the backend URL based on the runtime environment
// - Local development: Uses relative URLs (localhost or .replit.dev domains)
// - Production deployment or native apps: Uses full Replit production URL

const getApiBaseUrl = (): string => {
  // Native app (iOS/Android): always use full production URL
  if (Capacitor.isNativePlatform()) {
    return 'https://11424-newest-version-web266.replit.app';
  }
  
  // Web browser: check the actual runtime hostname
  const hostname = window.location.hostname;
  
  // If running on localhost or Replit dev domains, use relative URLs
  if (hostname === 'localhost' || 
      hostname.includes('replit.dev') || 
      hostname.includes('repl.co')) {
    return '';
  }
  
  // Otherwise (production deployment), use full URL
  return 'https://11424-newest-version-web266.replit.app';
};

export const API_BASE_URL = getApiBaseUrl();
