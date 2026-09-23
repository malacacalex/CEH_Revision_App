import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContent } from '../src/content/validate.ts';
import { loadContentFromDisk } from './load-content.ts';

// Writes public/content-pack.json: the whole validated content bundle, served next to the app so installed
// copies (desktop, Android) can fetch newer content on the user's request without a reinstall.
const { bundle, issues } = loadContentFromDisk();
if (!bundle) {
  console.error(`✗ Content failed schema checks (${issues.length} issue(s)); run content:validate.`);
  process.exit(1);
}
const { errors } = validateContent(bundle);
if (errors.length > 0) {
  console.error(`✗ ${errors.length} validation error(s); run content:validate.`);
  process.exit(1);
}

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'content-pack.json');
mkdirSync(dirname(out), { recursive: true });
const json = JSON.stringify(bundle);
writeFileSync(out, json);
console.log(`✓ content-pack.json ${bundle.version.version}: ${(json.length / 1024).toFixed(0)} KiB`);
