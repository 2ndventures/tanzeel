// API Configuration
// This determines the backend URL based on the environment

const getApiBaseUrl = (): string => {
  // In production builds (including Android/iOS apps), use the published backend
  // import.meta.env.PROD is true when building with 'npm run build'
  if (import.meta.env.PROD) {
    return 'https://11424-newest-version-web266.replit.app';
  }
  
  // In development mode, use relative URLs (works on Replit dev server and localhost)
  return '';
};

export const API_BASE_URL = getApiBaseUrl();
