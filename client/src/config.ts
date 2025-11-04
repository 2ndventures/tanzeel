// API Configuration
// This determines the backend URL based on the environment
// - Development mode (npm run dev): Uses relative URLs to call local backend
// - Production mode (npm run build): Uses published backend for Android/iOS apps

const getApiBaseUrl = (): string => {
  // import.meta.env.DEV is automatically set by Vite
  // DEV = true when running 'npm run dev'
  // DEV = false when running 'npm run build'
  if (import.meta.env.DEV) {
    // Development: use relative URLs (empty string) to call local backend
    return '';
  }
  
  // Production: use published backend for Android/iOS builds
  return 'https://11424-newest-version-web266.replit.app';
};

export const API_BASE_URL = getApiBaseUrl();
