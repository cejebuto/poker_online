/**
 * Spin loop with decelerating stop. Web Audio only — never touches poker chipAudio.
 * Sample: /sfx/roulette/spin-loop.wav
 */

const SPIN_URL = '/sfx/roulette/spin-loop.wav';
/** Match CSS disc transition (~6s) / server spinningMs (6.5s) — stop a bit early for ball-drop. */
export const SPIN_AUDIO_MS = 6000;
const RAMP_MS = 1200;

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let loopBuffer: AudioBuffer | null = null;
let loadPromise: Promise<AudioBuffer | null> | null = null;

let source: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;
let rampTimer: ReturnType<typeof setTimeout> | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let spinGen = 0;

function getCtx(): Ctx {
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

async function loadLoop(): Promise<AudioBuffer | null> {
  if (loopBuffer) return loopBuffer;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const res = await fetch(SPIN_URL);
      const raw = await res.arrayBuffer();
      const audio = getCtx();
      loopBuffer = await audio.decodeAudioData(raw.slice(0));
      return loopBuffer;
    } catch {
      loadPromise = null;
      return null;
    }
  })();
  return loadPromise;
}

/** Call from the first user tap so browsers allow later network-driven spin SFX. */
export function unlockRouletteAudio(): void {
  try {
    const audio = getCtx();
    if (audio.state === 'suspended') void audio.resume();
    void loadLoop();
  } catch {
    // ignore
  }
}

function clearTimers(): void {
  if (rampTimer) {
    clearTimeout(rampTimer);
    rampTimer = null;
  }
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }
}

function hardStopSource(): void {
  try {
    source?.stop();
  } catch {
    // already stopped
  }
  try {
    source?.disconnect();
  } catch {
    // ignore
  }
  try {
    gainNode?.disconnect();
  } catch {
    // ignore
  }
  source = null;
  gainNode = null;
}

export function stopSpinLoop(): void {
  spinGen += 1;
  clearTimers();
  hardStopSource();
}

/**
 * Start looping spin SFX; after `durationMs - RAMP_MS` ramp volume (and slight
 * rate) down, then stop. Invokes `onSettled` once when the loop fully stops
 * (for ball-drop). Safe to call again mid-spin — cancels the previous run.
 */
export async function startSpinLoop(opts: {
  muted: boolean;
  durationMs?: number;
  onSettled?: () => void;
}): Promise<void> {
  const { muted, durationMs = SPIN_AUDIO_MS, onSettled } = opts;
  stopSpinLoop();
  if (muted) {
    // Still schedule settle so visual/audio win-lose stay in phase when muted.
    const gen = spinGen;
    stopTimer = setTimeout(() => {
      if (gen !== spinGen) return;
      onSettled?.();
    }, durationMs);
    return;
  }

  const gen = ++spinGen;
  try {
    const audio = getCtx();
    if (audio.state === 'suspended') await audio.resume();
    const buf = await loadLoop();
    if (!buf || gen !== spinGen) return;

    const g = audio.createGain();
    g.gain.value = 0.42;
    g.connect(audio.destination);

    const src = audio.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.playbackRate.value = 1;
    src.connect(g);
    src.start(0);

    source = src;
    gainNode = g;

    const rampAt = Math.max(0, durationMs - RAMP_MS);
    rampTimer = setTimeout(() => {
      if (gen !== spinGen || !gainNode || !source) return;
      const now = audio.currentTime;
      try {
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(0.001, now + RAMP_MS / 1000);
        source.playbackRate.cancelScheduledValues(now);
        source.playbackRate.setValueAtTime(source.playbackRate.value, now);
        source.playbackRate.linearRampToValueAtTime(0.55, now + RAMP_MS / 1000);
      } catch {
        // ignore
      }
    }, rampAt);

    stopTimer = setTimeout(() => {
      if (gen !== spinGen) return;
      hardStopSource();
      onSettled?.();
    }, durationMs);
  } catch {
    if (gen === spinGen) onSettled?.();
  }
}
