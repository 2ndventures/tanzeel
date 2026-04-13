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
    contentInset: 'always',
    scrollEnabled: false,
    backgroundColor: '#3d1e00'
  },
  plugins: {
    Keyboard: {
      resize: 'none',
      style: 'DARK'
    }
  }
};

export default config;
