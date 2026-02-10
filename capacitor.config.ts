import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.borischess.app',
  appName: 'Grandmaster 3D',
  webDir: 'dist',
  plugins: {
    AdMob: {
      initializeOnStartup: true
    }
  }
};

export default config;
