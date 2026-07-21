#!/usr/bin/env node
// Render the PWA icons (poker chip on the app's theme background).
// Dependency-free PNG encoder — run after changing the icon design:
//   node scripts/generate-pwa-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'public');

const BG = [15, 23, 42]; // #0f172a — manifest theme_color
const CHIP = [220, 38, 38]; // #dc2626
const EDGE = [248, 250, 252]; // #f8fafc
const SS = 4; // supersampling factor, for antialiased edges

const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Colour of the chip design at a point in the unit square, or null for background. */
function sample(u, v) {
  const dx = u - 0.5;
  const dy = v - 0.5;
  const r = Math.hypot(dx, dy);

  if (r > 0.44) return null;
  if (r > 0.40) return EDGE;
  // Six edge spots around the rim.
  if (r > 0.30) {
    const sector = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * 12);
    return sector % 2 === 0 ? EDGE : CHIP;
  }
  if (r > 0.26) return EDGE;
  return CHIP;
}

function render(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const inv = 1 / (SS * SS);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = sample((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size) ?? BG;
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(r * inv);
      rgba[i + 1] = Math.round(g * inv);
      rgba[i + 2] = Math.round(b * inv);
      rgba[i + 3] = 255;
    }
  }
  return encodePng(size, rgba);
}

for (const size of [192, 512]) {
  const file = join(OUT_DIR, `pwa-${size}.png`);
  writeFileSync(file, render(size));
  console.log(`wrote ${file} (${size}x${size})`);
}
