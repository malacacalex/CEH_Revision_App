import { APP_VERSION, PAGES_URL, REPO_API_URL } from '../config.ts';
import { db } from '../db/db.ts';
import { platform } from '../platform.ts';
import { ContentBundleSchema, type ContentBundle } from '../schemas/content.ts';
import { bundledContent, content, setActiveContent } from './bundle.ts';
import { validateContent } from './validate.ts';

/**
 * In-app updates. These are the app's only network calls, and they only run when the user presses
 * "Check for updates" (§2 privacy rule):
 *  - content: the web deployment's content-pack.json, validated with the same zod schemas and rules as
 *    the build, then stored in IndexedDB and used from the next start;
 *  - app (installed builds only): the latest GitHub release, shown as a download link.
 */
const PACK_KEY = 'content-pack';

/** Compares x.y.z versions (a leading "v" and any "-suffix" are ignored): negative if a < b, 0 if equal, positive if a > b. */
export function compareVersions(a: string, b: string): number {
  const parts = (v: string) => v.replace(/^v/, '').split('-')[0]!.split('.').map((n) => Number(n) || 0);
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Parses and checks a downloaded pack. Returns the bundle, or the reason it cannot be used. */
export function checkPack(json: unknown): { bundle: ContentBundle } | { error: string } {
  const parsed = ContentBundleSchema.safeParse(json);
  if (!parsed.success) {
    return { error: 'The content pack does not match this app version. Update the app to get the new content.' };
  }
  const { errors } = validateContent(parsed.data);
  if (errors.length > 0) return { error: `The content pack failed ${errors.length} validation check(s); it was not applied.` };
  return { bundle: parsed.data };
}

/** Startup: use a stored pack if it is newer than the content built into this app; drop it otherwise. */
export async function loadStoredContent(): Promise<void> {
  try {
    const row = await db.settings.get(PACK_KEY);
    if (!row) return;
    const parsed = ContentBundleSchema.safeParse(row.value);
    if (parsed.success && compareVersions(parsed.data.version.version, bundledContent.version.version) > 0) {
      setActiveContent(parsed.data);
    } else {
      // Older than (or same as) the bundled content after an app update, or unreadable by this version.
      await db.settings.delete(PACK_KEY);
    }
  } catch {
    // IndexedDB unavailable: keep the bundled content.
  }
}

export type ContentUpdateResult =
  | { status: 'updated'; version: string }
  | { status: 'current'; version: string }
  | { status: 'error'; message: string };

export function contentPackUrl(): string {
  // The website serves the pack next to itself; installed apps fetch it from the website.
  return platform() === 'web' ? new URL('content-pack.json', window.location.href).href : `${PAGES_URL}content-pack.json`;
}

export async function checkContentUpdate(fetcher: typeof fetch = fetch): Promise<ContentUpdateResult> {
  let json: unknown;
  try {
    const res = await fetcher(contentPackUrl(), { cache: 'no-store' });
    if (!res.ok) return { status: 'error', message: `The update server answered ${res.status}. Try again later.` };
    json = await res.json();
  } catch {
    return { status: 'error', message: 'Could not reach the update server. Check your connection and try again.' };
  }
  const checked = checkPack(json);
  if ('error' in checked) return { status: 'error', message: checked.error };
  const current = content.bundle.version.version;
  if (compareVersions(checked.bundle.version.version, current) <= 0) return { status: 'current', version: current };
  await db.settings.put({ key: PACK_KEY, value: checked.bundle });
  return { status: 'updated', version: checked.bundle.version.version };
}

export type AppUpdateResult =
  | { status: 'available'; version: string; url: string }
  | { status: 'current' }
  | { status: 'error'; message: string };

/** Installed builds only: the website and PWA update themselves. */
export async function checkAppUpdate(fetcher: typeof fetch = fetch): Promise<AppUpdateResult> {
  try {
    const res = await fetcher(`${REPO_API_URL}/releases/latest`, { cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } });
    if (res.status === 404) return { status: 'current' }; // no release published yet
    if (!res.ok) return { status: 'error', message: `GitHub answered ${res.status}. Try again later.` };
    const release = (await res.json()) as { tag_name?: unknown; html_url?: unknown };
    if (typeof release.tag_name !== 'string' || typeof release.html_url !== 'string') return { status: 'error', message: 'Unexpected answer from GitHub.' };
    return compareVersions(release.tag_name, APP_VERSION) > 0 ? { status: 'available', version: release.tag_name.replace(/^v/, ''), url: release.html_url } : { status: 'current' };
  } catch {
    return { status: 'error', message: 'Could not reach GitHub. Check your connection and try again.' };
  }
}
