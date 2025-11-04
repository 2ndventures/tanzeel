// API Configuration
// This determines the backend URL based on the environment

const getApiBaseUrl = (): string => {
  // Check if we're running in Capacitor (native mobile app)
  const isCapacitor = !!(window as any).Capacitor;
  
  // In native mobile apps, always use the published backend
  if (isCapacitor) {
    return 'https://11424-newest-version-web266.replit.app';
  }
  
  // In web browser, use relative URLs (works on Replit and localhost)
  return '';
};

export const API_BASE_URL = getApiBaseUrl();
