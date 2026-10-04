import type { CapacitorConfig } from '@capacitor/cli';

// applicationId fest beschlossen (D-023) – nach dem ersten Play-Upload nicht mehr änderbar.
const config: CapacitorConfig = {
  appId: 'app.piertoplanets.game',
  appName: 'Pier to Planets',
  webDir: 'app/dist',
  android: {
    // WebView-Debugging (Chrome Remote Debugging) nur in Debug-Builds (docs/04 § Sicherheit).
    webContentsDebuggingEnabled: undefined,
    backgroundColor: '#14161C',
  },
  plugins: {
    // Randlos ab Android 15: Szene zeichnet hinter die Systemleisten, helle Symbole,
    // Abstände über CSS-Variablen --safe-area-inset-* (docs/05 Layout-Zonen).
    SystemBars: {
      insetsHandling: 'css',
      style: 'DARK',
    },
  },
};

export default config;
