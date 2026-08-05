import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tanzeelquran.app',
  appName: 'Tanzeel',
  webDir: 'dist/public',
  server: {
    hostname: 'localhost',
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
    backgroundColor: '#000000'
  },
  plugins: {
    SystemBars: {
      insetsHandling: 'disable'
    },
    Keyboard: {
      resize: 'none',
      style: 'DARK'
    }
  }
};

export default config;
