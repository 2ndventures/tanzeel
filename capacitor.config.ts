import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.simplequran.app',
  appName: 'Tanzeel',
  webDir: 'dist/public',
  server: {
    hostname: 'localhost',
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'always',
    scrollEnabled: false,
    backgroundColor: '#101828'
  }
};

export default config;
