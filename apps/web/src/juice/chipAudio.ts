/**
 * Chip / card SFX: recorded samples when we have them, synthesis when we don't.
 *
 * A stream of chips landing one by one needs a slightly different sound every
 * time — one .wav replayed twelve times reads as a loop, not as chips. So every
 * hit, sampled or synthesised, gets pitch and gain jitter: a sample is played
 * through a varied `playbackRate`, a synthesised one is a short filtered noise
 * burst (the clink) plus a fast decaying body (the clay).
 *
 * Samples live in /public/sfx and are declared in SAMPLES. A kind with no file,
 * or whose file fails to load, silently falls back to synthesis — so dropping a
 * new .wav in is the whole job.
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
  | 'card'
  /** Shoving the whole stack in — the big moment. */
  | 'allin'
  /** Knuckles rapping the felt to check. */
  | 'check';

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
  // Fallbacks only — these two are always sampled when the files load.
  allin: { freq: 1600, q: 0.6, duration: 0.5, gain: 0.34, body: 0, sweepTo: 0.35 },
  check: { freq: 900, q: 1.4, duration: 0.09, gain: 0.3, body: 320 },
};

/**
 * Recorded one-shots, by kind. A missing entry (or a file that fails to load)
 * just means that kind stays synthesised.
 *
 * `gain` trims the sample to sit with the rest; `jitter` is how far the
 * playback rate wanders per hit, which is what keeps a line of twelve chips
 * from sounding like the same file on repeat.
 */
const SAMPLES: Partial<Record<ChipSoundKind, { url: string; gain: number; jitter: number }>> = {
  place: { url: '/sfx/chip-place.wav', gain: 0.55, jitter: 0.1 },
  land: { url: '/sfx/chip-land.wav', gain: 0.5, jitter: 0.16 },
  sweep: { url: '/sfx/chip-sweep.wav', gain: 0.6, jitter: 0.05 },
  // One-shots that fire once per action — near-zero jitter so they play as
  // recorded (a trumpet wandering in pitch would sound broken).
  allin: { url: '/sfx/chip-allin.wav', gain: 0.7, jitter: 0.02 },
  check: { url: '/sfx/check-knock.wav', gain: 0.6, jitter: 0.06 },
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

/*
 * Decoded samples, keyed by kind. `null` marks a kind we tried and could not
 * load, so it stays on synthesis instead of retrying on every chip.
 */
const decoded = new Map<ChipSoundKind, AudioBuffer | null>();
const loading = new Set<ChipSoundKind>();

function loadSample(kind: ChipSoundKind, audio: AudioBits): void {
  const sample = SAMPLES[kind];
  if (!sample || decoded.has(kind) || loading.has(kind)) return;
  loading.add(kind);

  void fetch(sample.url)
    .then((res) => {
      if (!res.ok) throw new Error(String(res.status));
      return res.arrayBuffer();
    })
    .then((raw) => audio.ctx.decodeAudioData(raw))
    .then((buffer) => decoded.set(kind, buffer))
    .catch(() => {
      // Missing or undecodable file: this kind stays synthesised.
      decoded.set(kind, null);
    })
    .finally(() => loading.delete(kind));
}

/**
 * Create / resume the context from inside a user gesture. Browsers refuse to
 * start audio anywhere else, so call this from a tap before the first sound.
 * Also warms the samples, so the first chip of the hand is not the one that
 * waits on the network.
 */
export function unlockChipAudio(): void {
  const audio = createBits();
  if (!audio) return;
  if (audio.ctx.state === 'suspended') {
    void audio.ctx.resume().catch(() => {
      // Still locked — the next gesture gets another shot.
    });
  }
  for (const kind of Object.keys(SAMPLES) as ChipSoundKind[]) {
    loadSample(kind, audio);
  }
}

function jitter(amount = JITTER): number {
  return 1 + (Math.random() * 2 - 1) * amount;
}

/**
 * Play the recorded one-shot for this kind.
 *
 * `pitch` rides the playback rate, which shortens the sample as it rises — that
 * is exactly what a smaller chip sounds like, and it keeps the win stream from
 * being the same file twelve times.
 *
 * @returns false when there is nothing decoded yet, so the caller synthesises.
 */
function playSample(
  kind: ChipSoundKind,
  audio: AudioBits,
  opts: { pitch?: number; gain?: number },
): boolean {
  const sample = SAMPLES[kind];
  const buffer = decoded.get(kind);
  if (!sample || !buffer) return false;

  try {
    const { ctx, master } = audio;
    const now = ctx.currentTime;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    // Web Audio refuses a rate of 0 or below; clamp well clear of it.
    source.playbackRate.value = Math.max(
      0.25,
      (opts.pitch ?? 1) * jitter(sample.jitter),
    );

    const env = ctx.createGain();
    env.gain.value = Math.max(0, sample.gain * (opts.gain ?? 1) * jitter(0.08));

    source.connect(env);
    env.connect(master);

    voices++;
    source.onended = () => {
      voices = Math.max(0, voices - 1);
    };
    source.start(now);
    return true;
  } catch {
    return false;
  }
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

  // Kick off the load on the first hit if the unlock never ran; this one still
  // gets synthesised, the next one gets the sample.
  loadSample(kind, audio);
  if (playSample(kind, audio, opts)) return;

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
  decoded.clear();
  loading.clear();
}
