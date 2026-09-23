import type { CapacitorConfig } from '@capacitor/cli';

// Android app: the same dist/ as the website, served from https://localhost inside the WebView.
const config: CapacitorConfig = {
  appId: 'io.github.malacacalex.shieldup',
  appName: 'ShieldUp',
  webDir: 'dist',
  android: {
    // Progress lives in the WebView's IndexedDB; never allow cleartext traffic.
    allowMixedContent: false,
  },
};

export default config;
