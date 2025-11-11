import { Capacitor } from '@capacitor/core';

// API Configuration
// This determines the backend URL based on the environment
// - Development (npm run dev): Uses relative URLs to call local backend
// - Production (deployed URL or iOS/Android app): Uses full Replit URL

const getApiBaseUrl = (): string => {
  // Native app (iOS/Android) OR production build: use full URL
  if (Capacitor.isNativePlatform() || !import.meta.env.DEV) {
    return 'https://11424-newest-version-web266.replit.app';
  }
  
  // Development web browser: use relative URLs
  return '';
};

export const API_BASE_URL = getApiBaseUrl();
