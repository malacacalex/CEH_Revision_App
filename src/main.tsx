import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/lora/400.css';
import '@fontsource/lora/700.css';
import '@fontsource/lora/400-italic.css';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App.tsx';
import { loadStoredContent } from './content/updates.ts';
import { isNative, routeExternalLinks } from './platform.ts';

// Offline cache for the website only: installed apps already ship every file, and a service worker
// there would only risk serving stale files after an app update.
if (!isNative()) registerSW({ immediate: true });
routeExternalLinks();

// A downloaded content pack (Settings → Check for updates) replaces the bundled content before first render.
await loadStoredContent();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
