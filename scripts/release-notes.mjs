// Prints the GitHub Release notes for a version: its CHANGELOG section, which file to download,
// the unsigned-build warnings and the checksums. Used by .github/workflows/release.yml.
//   node scripts/release-notes.mjs 0.3.0 release/SHA256SUMS.txt
import { existsSync, readFileSync } from 'node:fs';

const [version, sumsFile] = process.argv.slice(2);
if (!version) {
  console.error('usage: node scripts/release-notes.mjs <version> [SHA256SUMS.txt]');
  process.exit(1);
}

const REPO = 'https://github.com/malacacalex/CEH_Revision_App';
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const start = changelog.search(new RegExp(`^## \\[?${version.replace(/\./g, '\\.')}\\]?`, 'm'));
let changes = 'See the commit history for this version.';
if (start >= 0) {
  const rest = changelog.slice(start);
  const next = rest.slice(3).search(/^## /m);
  changes = (next >= 0 ? rest.slice(0, next + 3) : rest).split('\n').slice(1).join('\n').trim();
}
// Relative links in the changelog would point at the release page: make them absolute.
changes = changes.replace(/\]\((?!https?:)([^)]+)\)/g, `](${REPO}/blob/main/$1)`);

const sums = sumsFile && existsSync(sumsFile) ? readFileSync(sumsFile, 'utf8').trim() : '';
const files = sums ? sums.split('\n').map((l) => l.split(/\s+/)[1]) : [];
const pick = (re) => files.find((f) => re.test(f)) ?? null;
const rows = [
  ['Windows 10/11', pick(/setup\.exe$/), 'installer; `.msi` also provided'],
  ['macOS 11+ (Intel and Apple silicon)', pick(/\.dmg$/), 'drag ShieldUp to Applications'],
  ['Linux (most distributions)', pick(/\.AppImage$/), 'make it executable, run it'],
  ['Debian / Ubuntu', pick(/\.deb$/), '`sudo apt install ./<file>.deb`'],
  ['Android 7+', pick(/\.apk$/), 'allow "install unknown apps" for your browser'],
].filter(([, file]) => file);

const out = [
  `## What's new in ${version}`,
  '',
  changes,
  '',
  '## Download',
  '',
  ...(rows.length > 0 ? ['| Device | File | Notes |', '|---|---|---|', ...rows.map(([d, f, n]) => `| ${d} | \`${f}\` | ${n} |`), ''] : []),
  'No install needed: the web app runs in any browser, works offline and can be added to the home screen (the only option on iPhone/iPad): https://malacacalex.github.io/CEH_Revision_App/',
  '',
  `These builds are **not code-signed**, so Windows SmartScreen, macOS Gatekeeper and Android will warn you the first time. [INSTALL.md](${REPO}/blob/main/INSTALL.md) shows how to get past each warning safely, and how to check the file against the checksums below.`,
  '',
  'Your progress stays on your device. Export a backup (Settings → Backup) before uninstalling or switching devices.',
  '',
  ...(sums ? ['<details><summary>SHA-256 checksums</summary>', '', '```', sums, '```', '', '</details>', ''] : []),
  '---',
  'ShieldUp is an independent, unofficial study aid. It is not affiliated with, sponsored by or endorsed by EC-Council.',
];
console.log(out.join('\n'));
