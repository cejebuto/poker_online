/**
 * Regenerates short UI SFX WAVs under public/sfx/.
 * Run: node apps/web/scripts/generate-sfx.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../public/sfx');
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

function mix(a, b) {
  const n = Math.max(a.length, b.length);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = (a[i] || 0) + (b[i] || 0);
  }
  return out;
}

fs.mkdirSync(outDir, { recursive: true });

writeWav('tick.wav', tone({ freq: 880, durationMs: 45, volume: 0.28, type: 'triangle', releaseMs: 20 }));
writeWav('step.wav', tone({ freq: 660, durationMs: 35, volume: 0.22, type: 'triangle', releaseMs: 16 }));
writeWav(
  'confirm.wav',
  concat([
    tone({ freq: 523.25, durationMs: 55, volume: 0.32, type: 'sine', releaseMs: 25 }),
    tone({ freq: 783.99, durationMs: 80, volume: 0.3, type: 'sine', releaseMs: 40 }),
  ]),
);
writeWav(
  'error.wav',
  concat([
    tone({ freq: 220, durationMs: 60, volume: 0.28, type: 'square', releaseMs: 20 }),
    tone({ freq: 160, durationMs: 70, volume: 0.24, type: 'square', releaseMs: 30 }),
  ]),
);
writeWav(
  'throw.wav',
  mix(
    tone({ freq: 320, durationMs: 90, volume: 0.2, type: 'sine', attackMs: 2, releaseMs: 50 }),
    tone({ freq: 960, durationMs: 70, volume: 0.18, type: 'triangle', attackMs: 1, releaseMs: 40 }),
  ),
);

console.log('Wrote SFX to', outDir);
