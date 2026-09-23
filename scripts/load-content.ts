import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { assembleContent, type RawContentFiles } from '../src/content/assemble.ts';

export const CONTENT_DIR = resolve(import.meta.dirname, '..', 'content');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** Reads /content from disk into the same shape the app gets from Vite glob imports. */
export function readRawContent(dir = CONTENT_DIR): RawContentFiles {
  const files: RawContentFiles = {};
  for (const full of walk(dir)) {
    const rel = relative(dir, full).replaceAll('\\', '/');
    if (rel === 'tutor-misses.json') continue;
    const text = readFileSync(full, 'utf8');
    if (rel.endsWith('.json')) {
      try {
        files[rel] = JSON.parse(text);
      } catch (e) {
        throw new Error(`${rel}: invalid JSON (${(e as Error).message})`, { cause: e });
      }
    } else if (rel.endsWith('.md')) {
      files[rel] = text;
    }
  }
  return files;
}

export function loadContentFromDisk(dir = CONTENT_DIR) {
  return assembleContent(readRawContent(dir));
}
