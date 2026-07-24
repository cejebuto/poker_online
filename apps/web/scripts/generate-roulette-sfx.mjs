/**
 * Generates roulette-only SFX under public/sfx/roulette/.
 * Does NOT touch poker samples in public/sfx/.
 *
 * Run: node apps/web/scripts/generate-roulette-sfx.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../public/sfx/roulette');
const sampleRate = 22050;

function writeWav(file, samples) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE((s * 0x7fff) | 0, 44 + i * 2);
  }
  fs.writeFileSync(path.join(outDir, file), buffer);
}

function tone({
  freq,
  durationMs,
  volume = 0.35,
  type = 'sine',
  attackMs = 4,
  releaseMs = 30,
}) {
  const n = Math.floor((sampleRate * durationMs) / 1000);
  const attack = Math.floor((sampleRate * attackMs) / 1000);
  const release = Math.floor((sampleRate * releaseMs) / 1000);
  const samples = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let wave;
    if (type === 'square') {
      wave = Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
      wave *= 0.45;
    } else if (type === 'triangle') {
      const p = (t * freq) % 1;
      wave = 4 * Math.abs(p - 0.5) - 1;
    } else if (type === 'noise') {
      wave = Math.random() * 2 - 1;
    } else {
      wave = Math.sin(2 * Math.PI * freq * t);
    }
    let env = 1;
    if (i < attack) env = i / Math.max(1, attack);
    if (i > n - release) env = Math.max(0, (n - i) / Math.max(1, release));
    samples[i] = wave * volume * env;
  }
  return samples;
}

function concat(parts) {
  let len = 0;
  for (const p of parts) len += p.length;
  const out = new Float64Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function mix(a, b, scale = 1) {
  const n = Math.max(a.length, b.length);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = ((a[i] || 0) + (b[i] || 0)) * scale;
  }
  return out;
}

/** Seamless-ish ratchet loop for the spinning wheel (~1.6s). */
function spinLoop() {
  const durationMs = 1600;
  const n = Math.floor((sampleRate * durationMs) / 1000);
  const out = new Float64Array(n);
  const tickEvery = Math.floor(sampleRate * 0.045); // ~22 clicks/s
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    // Soft rumble under the ticks.
    const rumble =
      Math.sin(2 * Math.PI * 55 * t) * 0.08 + Math.sin(2 * Math.PI * 90 * t) * 0.05;
    // Periodic click (ratchet).
    const phase = i % tickEvery;
    let click = 0;
    if (phase < sampleRate * 0.006) {
      const local = phase / sampleRate;
      const env = Math.exp(-local * 180);
      click = (Math.random() * 2 - 1) * 0.35 * env;
      click += Math.sin(2 * Math.PI * 1400 * local) * 0.22 * env;
    }
    // Crossfade edges so loop seams less.
    let edge = 1;
    const fade = Math.floor(sampleRate * 0.02);
    if (i < fade) edge = i / fade;
    if (i > n - fade) edge = (n - i) / fade;
    out[i] = (rumble + click) * edge * 0.85;
  }
  return out;
}

fs.mkdirSync(outDir, { recursive: true });

writeWav(
  'chip-select.wav',
  tone({ freq: 920, durationMs: 50, volume: 0.26, type: 'triangle', releaseMs: 18 }),
);

writeWav(
  'bet-place.wav',
  mix(
    tone({ freq: 280, durationMs: 90, volume: 0.22, type: 'sine', attackMs: 2, releaseMs: 45 }),
    tone({ freq: 720, durationMs: 70, volume: 0.2, type: 'triangle', attackMs: 1, releaseMs: 35 }),
  ),
);

writeWav(
  'clear.wav',
  mix(
    tone({ freq: 480, durationMs: 90, volume: 0.18, type: 'sine', attackMs: 3, releaseMs: 50 }),
    tone({ freq: 240, durationMs: 100, volume: 0.14, type: 'triangle', releaseMs: 55 }),
  ),
);

writeWav(
  'error.wav',
  concat([
    tone({ freq: 200, durationMs: 55, volume: 0.26, type: 'square', releaseMs: 18 }),
    tone({ freq: 150, durationMs: 70, volume: 0.22, type: 'square', releaseMs: 28 }),
  ]),
);

writeWav('spin-loop.wav', spinLoop());

writeWav(
  'ball-drop.wav',
  mix(
    tone({ freq: 180, durationMs: 90, volume: 0.28, type: 'sine', attackMs: 1, releaseMs: 50 }),
    concat([
      tone({ freq: 1100, durationMs: 35, volume: 0.2, type: 'triangle', releaseMs: 20 }),
      tone({ freq: 660, durationMs: 80, volume: 0.18, type: 'sine', releaseMs: 40 }),
    ]),
  ),
);

writeWav(
  'win.wav',
  concat([
    tone({ freq: 523.25, durationMs: 90, volume: 0.3, type: 'sine', releaseMs: 30 }),
    tone({ freq: 659.25, durationMs: 90, volume: 0.3, type: 'sine', releaseMs: 30 }),
    tone({ freq: 783.99, durationMs: 160, volume: 0.32, type: 'sine', releaseMs: 70 }),
  ]),
);

writeWav(
  'lose.wav',
  concat([
    tone({ freq: 392, durationMs: 100, volume: 0.26, type: 'triangle', releaseMs: 35 }),
    tone({ freq: 277.18, durationMs: 160, volume: 0.24, type: 'triangle', releaseMs: 60 }),
  ]),
);

console.log('Wrote roulette SFX to', outDir);
