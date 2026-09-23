import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShieldDB, db, useDatabase } from '../../src/db/db.ts';
import { bundledContent, content, setActiveContent } from '../../src/content/bundle.ts';
import { checkAppUpdate, checkContentUpdate, checkPack, compareVersions, contentPackUrl, loadStoredContent } from '../../src/content/updates.ts';
import type { ContentBundle } from '../../src/schemas/content.ts';

vi.stubGlobal('window', { location: { href: 'https://example.test/CEH_Revision_App/#/settings' } });

const withVersion = (version: string): ContentBundle => ({ ...bundledContent, version: { version, date: '2026-10-01' } });
const bumped = (): string => {
  const [a, b, c] = bundledContent.version.version.split('.').map(Number);
  return `${a}.${b! + 1}.${c}`;
};

function fakeFetch(status: number, body: unknown): typeof fetch {
  return (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

beforeEach(async () => {
  useDatabase(new ShieldDB(`updates-${Math.random()}`));
  setActiveContent(bundledContent);
  await db.open();
});

describe('compareVersions', () => {
  it('orders numerically, ignoring a leading v', () => {
    expect(compareVersions('0.10.0', '0.9.9')).toBeGreaterThan(0);
    expect(compareVersions('v1.2.3', '1.2.3')).toBe(0);
    expect(compareVersions('1.2.3', '1.3.0')).toBeLessThan(0);
    expect(compareVersions('0.0.1', '0.0.0-test')).toBeGreaterThan(0);
  });
});

describe('checkPack', () => {
  it('accepts the bundled content', () => {
    expect('bundle' in checkPack(JSON.parse(JSON.stringify(bundledContent)))).toBe(true);
  });
  it('rejects packs this app version cannot read', () => {
    expect(checkPack({ ...bundledContent, newField: 1 })).toEqual({ error: expect.stringContaining('Update the app') });
    expect(checkPack('nope')).toHaveProperty('error');
  });
  it('rejects packs that break content rules', () => {
    const broken = structuredClone(bundledContent);
    broken.modules[0]!.questions = [...broken.modules[0]!.questions, broken.modules[0]!.questions[0]!]; // duplicate id
    expect(checkPack(broken)).toEqual({ error: expect.stringContaining('validation') });
  });
});

describe('content updates', () => {
  it('serves the pack next to the website', () => {
    expect(contentPackUrl()).toBe('https://example.test/CEH_Revision_App/content-pack.json');
  });

  it('stores a newer pack and uses it from the next start', async () => {
    const v = bumped();
    expect(await checkContentUpdate(fakeFetch(200, withVersion(v)))).toEqual({ status: 'updated', version: v });
    expect(content.bundle.version.version).toBe(bundledContent.version.version); // not applied mid-session
    await loadStoredContent();
    expect(content.bundle.version.version).toBe(v);
  });

  it('reports up to date and stores nothing for the same version', async () => {
    const r = await checkContentUpdate(fakeFetch(200, bundledContent));
    expect(r.status).toBe('current');
    expect(await db.settings.get('content-pack')).toBeUndefined();
  });

  it('drops a stored pack once the app ships newer or equal content', async () => {
    await db.settings.put({ key: 'content-pack', value: withVersion('0.0.1') });
    await loadStoredContent();
    expect(content.bundle).toBe(bundledContent);
    expect(await db.settings.get('content-pack')).toBeUndefined();
  });

  it('turns server and network failures into messages', async () => {
    expect(await checkContentUpdate(fakeFetch(503, {}))).toEqual({ status: 'error', message: expect.stringContaining('503') });
    const offline = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    expect(await checkContentUpdate(offline)).toEqual({ status: 'error', message: expect.stringContaining('connection') });
  });
});

describe('app updates', () => {
  it('links to a newer release', async () => {
    const r = await checkAppUpdate(fakeFetch(200, { tag_name: 'v99.0.0', html_url: 'https://github.com/x/releases/tag/v99.0.0' }));
    expect(r).toEqual({ status: 'available', version: '99.0.0', url: 'https://github.com/x/releases/tag/v99.0.0' });
  });
  it('is current when the release is not newer or none exists', async () => {
    expect(await checkAppUpdate(fakeFetch(200, { tag_name: 'v0.0.0', html_url: 'u' }))).toEqual({ status: 'current' });
    expect(await checkAppUpdate(fakeFetch(404, {}))).toEqual({ status: 'current' });
  });
});
