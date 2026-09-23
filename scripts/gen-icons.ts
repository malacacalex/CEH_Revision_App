// Rasterizes public/favicon.svg into the PWA, desktop and Android icons. Run: npx tsx scripts/gen-icons.ts
// Desktop (Tauri) icons are then derived from public/icon-1024.png: npx tauri icon public/icon-1024.png -o src-tauri/icons
import sharp from 'sharp';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const svg = readFileSync('public/favicon.svg');
const bg = { r: 246, g: 240, b: 230, alpha: 1 };

async function plain(size: number, out: string) {
  await sharp(svg, { density: 512 }).resize(size, size).png().toFile(out);
}
async function padded(size: number, out: string, scale: number) {
  const inner = Math.round(size * scale);
  const icon = await sharp(svg, { density: 512 }).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toFile(out);
}

await plain(192, 'public/pwa-192.png');
await plain(512, 'public/pwa-512.png');
await padded(512, 'public/pwa-maskable-512.png', 0.7);
await padded(180, 'public/apple-touch-icon.png', 0.85);
await padded(1024, 'public/icon-1024.png', 0.85);

// Android (Capacitor): legacy launcher icons, adaptive-icon foregrounds (108 dp canvas, logo inside the
// 66 dp safe zone) on a beige background, and splash screens at each drawable's existing size.
const RES = 'android/app/src/main/res';
if (existsSync(RES)) {
  const densities: [string, number][] = [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]];
  for (const [d, k] of densities) {
    await padded(Math.round(48 * k), `${RES}/mipmap-${d}/ic_launcher.png`, 0.85);
    await padded(Math.round(48 * k), `${RES}/mipmap-${d}/ic_launcher_round.png`, 0.7);
    const size = Math.round(108 * k);
    const logo = await sharp(svg, { density: 512 }).resize(Math.round(size * 0.6)).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toFile(`${RES}/mipmap-${d}/ic_launcher_foreground.png`);
  }
  writeFileSync(
    `${RES}/values/ic_launcher_background.xml`,
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#F6F0E6</color>\n</resources>\n',
  );
  for (const dir of readdirSync(RES).filter((d) => d.startsWith('drawable'))) {
    const file = join(RES, dir, 'splash.png');
    if (!existsSync(file)) continue;
    const { width = 480, height = 320 } = await sharp(readFileSync(file)).metadata();
    const logo = await sharp(svg, { density: 512 }).resize(Math.round(Math.min(width, height) * 0.35)).png().toBuffer();
    await sharp({ create: { width, height, channels: 4, background: bg } })
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toFile(file);
  }
}
console.log('icons written');
