import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Relative base + HashRouter: the same build works on GitHub Pages, in Tauri and in the Capacitor WebView.
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered from main.tsx, and only on the web (not inside Tauri or Capacitor).
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'ShieldUp — unofficial CEH v13 study app',
        short_name: 'ShieldUp',
        description: 'Local-first study app for the CEH v13 exam. Not affiliated with or endorsed by EC-Council.',
        theme_color: '#8a4b2a',
        background_color: '#f6f0e6',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Mermaid engines our notes never use (ELK layout, mindmap/architecture, math labels): not worth 2 MB offline.
        globIgnores: ['**/elk-*.js', '**/cytoscape*.js', '**/katex*.js', '**/architectureDiagram-*.js', '**/mindmap*.js'],
        // Mermaid chunks are large; the app must work fully offline.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1500,
  },
});
