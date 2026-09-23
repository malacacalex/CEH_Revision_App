/**
 * The same build runs as a website/PWA, inside Tauri (desktop) and inside Capacitor (Android).
 * Everything that differs between them lives here; native modules are loaded lazily so the web
 * bundle never pays for them.
 */
export type Platform = 'web' | 'tauri' | 'android';

interface NativeGlobals {
  __TAURI_INTERNALS__?: unknown;
  Capacitor?: { isNativePlatform?: () => boolean };
}

export function platform(): Platform {
  const w = globalThis as unknown as NativeGlobals;
  if (w.__TAURI_INTERNALS__) return 'tauri';
  if (w.Capacitor?.isNativePlatform?.()) return 'android';
  return 'web';
}

export const isNative = (): boolean => platform() !== 'web';

/** Opens a web or mailto link outside the app (system browser / mail client). */
export async function openExternal(url: string): Promise<void> {
  switch (platform()) {
    case 'tauri': {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
      return;
    }
    case 'android':
      // Capacitor hands navigations to other hosts (and mailto:) to the system as an Android intent.
      window.location.href = url;
      return;
    default:
      window.open(url, '_blank', 'noopener');
  }
}

/**
 * Native webviews ignore target="_blank" (Tauri) or would navigate away from the app, so external links
 * are routed through openExternal. Installed once at startup, only in native builds.
 */
export function routeExternalLinks(): void {
  if (!isNative()) return;
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0) return;
    const a = (e.target as Element | null)?.closest?.('a[href]');
    if (!(a instanceof HTMLAnchorElement)) return;
    const url = new URL(a.href, window.location.href);
    const external = url.protocol === 'mailto:' || ((url.protocol === 'https:' || url.protocol === 'http:') && url.origin !== window.location.origin);
    if (!external) return;
    e.preventDefault();
    void openExternal(url.href);
  });
}

/**
 * Saves a text file the user asked for (backup, review export).
 * Web: browser download. Desktop: native "Save as" dialog. Android: share sheet (Drive, email, Files…).
 * Returns false when the user cancelled.
 */
export async function saveTextFile(filename: string, text: string): Promise<boolean> {
  switch (platform()) {
    case 'tauri': {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<boolean>('save_text_file', { filename, contents: text });
    }
    case 'android': {
      const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
      const { uri } = await Filesystem.writeFile({ path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
      try {
        await Share.share({ title: filename, files: [uri] });
      } catch (e) {
        // The plugin rejects with "Share canceled" when the sheet is dismissed.
        if (e instanceof Error && /cancel/i.test(e.message)) return false;
        throw e;
      }
      return true;
    }
    default: {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    }
  }
}
