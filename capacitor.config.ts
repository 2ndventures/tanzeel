import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.simplequran.app',
  appName: 'Simple Quran',
  webDir: 'dist/public',
  server: {
    hostname: 'localhost',
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'always',
    scrollEnabled: false
  }
};

export default config;
