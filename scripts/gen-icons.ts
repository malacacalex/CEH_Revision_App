// Rasterizes public/favicon.svg into the PWA / store icons. Run: npx tsx scripts/gen-icons.ts
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

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
console.log('icons written');
