/**
 * Procedural chip / card SFX.
 *
 * No samples on purpose: a stream of chips landing one by one needs a slightly
 * different sound every time, and a single .wav replayed twelve times reads as
 * a loop instead of as chips. Every hit is a short filtered noise burst (the
 * clink) plus a fast decaying body (the clay), with pitch and gain jitter.
 *
 * Everything degrades to a silent no-op: no AudioContext, a suspended context
 * that never got a user gesture, or a throwing browser all just do nothing.
 */

import { getSfxMuted } from './soundPrefs';

export type ChipSoundKind =
  /** A chip dropped on the felt — betting. */
  | 'place'
  /** A chip landing on a stack — arrival of a flying chip. */
  | 'land'
  /** Chips pushed forward across the felt. */
  | 'slide'
  /** The whole pot swept toward a winner. */
  | 'sweep'
  /** A card sliding out of the deck / turning over. */
  | 'card';

type Recipe = {
  /** Bandpass centre for the noise burst, in Hz. */
  freq: number;
  q: number;
  /** Seconds. */
  duration: number;
  gain: number;
  /** Body partial in Hz — the clay "tock". 0 disables it. */
  body: number;
  /** Sweep the filter to this multiple of `freq` over the burst. */
  sweepTo?: number;
};

const RECIPES: Record<ChipSoundKind, Recipe> = {
  place: { freq: 2500, q: 1.9, duration: 0.07, gain: 0.5, body: 520 },
  land: { freq: 3200, q: 2.4, duration: 0.05, gain: 0.42, body: 680 },
  slide: { freq: 1500, q: 0.9, duration: 0.2, gain: 0.26, body: 0, sweepTo: 0.45 },
  sweep: { freq: 1800, q: 0.7, duration: 0.42, gain: 0.3, body: 0, sweepTo: 0.3 },
  card: { freq: 1250, q: 1.1, duration: 0.13, gain: 0.22, body: 0, sweepTo: 2.2 },
};

/** Chips landing on top of each other never sound identical. */
const JITTER = 0.14;

/** Beyond this the stream turns to mush and starts clipping. */
const MAX_VOICES = 10;

type AudioBits = {
  ctx: AudioContext;
  master: GainNode;
  noise: AudioBuffer;
};

let bits: AudioBits | null = null;
let unavailable = false;
let voices = 0;

function createBits(): AudioBits | null {
  if (bits) return bits;
  if (unavailable || typeof window === 'undefined') return null;

  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) {
      unavailable = true;
      return null;
    }

    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = 0.9;

    // Keeps a full pot landing at once from clipping the output.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 12;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.12;

    master.connect(limiter);
    limiter.connect(ctx.destination);

    const frames = Math.floor(ctx.sampleRate * 0.5);
    const noise = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

    bits = { ctx, master, noise };
    return bits;
  } catch {
    unavailable = true;
    return null;
  }
}

/**
 * Create / resume the context from inside a user gesture. Browsers refuse to
 * start audio anywhere else, so call this from a tap before the first sound.
 */
export function unlockChipAudio(): void {
  const audio = createBits();
  if (!audio) return;
  if (audio.ctx.state === 'suspended') {
    void audio.ctx.resume().catch(() => {
      // Still locked — the next gesture gets another shot.
    });
  }
}

function jitter(amount = JITTER): number {
  return 1 + (Math.random() * 2 - 1) * amount;
}

/**
 * Play one chip / card hit.
 *
 * @param pitch multiplies the recipe frequency — the win stream walks this up
 *              so each chip in the line sits a little higher than the last.
 */
export function playChipSound(
  kind: ChipSoundKind,
  opts: { pitch?: number; gain?: number } = {},
): void {
  if (getSfxMuted()) return;

  const audio = createBits();
  if (!audio) return;
  if (audio.ctx.state === 'suspended') {
    void audio.ctx.resume().catch(() => {});
    return;
  }
  if (voices >= MAX_VOICES) return;

  try {
    const recipe = RECIPES[kind];
    const { ctx, master, noise } = audio;
    const now = ctx.currentTime;
    const pitch = (opts.pitch ?? 1) * jitter();
    const level = recipe.gain * (opts.gain ?? 1) * jitter(0.1);
    const end = now + recipe.duration;

    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.playbackRate.value = jitter(0.2);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = recipe.q;
    const startFreq = recipe.freq * pitch;
    filter.frequency.setValueAtTime(startFreq, now);
    if (recipe.sweepTo) {
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(60, startFreq * recipe.sweepTo),
        end,
      );
    }

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(level, now + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, end);

    source.connect(filter);
    filter.connect(env);
    env.connect(master);

    voices++;
    source.onended = () => {
      voices = Math.max(0, voices - 1);
    };
    source.start(now);
    source.stop(end);

    if (recipe.body > 0) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(recipe.body * pitch, now);
      osc.frequency.exponentialRampToValueAtTime(recipe.body * pitch * 0.6, end);

      const bodyEnv = ctx.createGain();
      bodyEnv.gain.setValueAtTime(0.0001, now);
      bodyEnv.gain.linearRampToValueAtTime(level * 0.55, now + 0.003);
      bodyEnv.gain.exponentialRampToValueAtTime(0.0001, now + recipe.duration * 0.7);

      osc.connect(bodyEnv);
      bodyEnv.connect(master);
      osc.start(now);
      osc.stop(end);
    }
  } catch {
    // A hostile audio stack must never break the table.
  }
}

/** Test seam — drops the cached context so a new one is built on next play. */
export function _resetChipAudioForTests(): void {
  bits = null;
  unavailable = false;
  voices = 0;
}
