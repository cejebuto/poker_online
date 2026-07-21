# Zones and recipes

Companion reference for `web-mobile-juice`. Load when implementing a concrete control.

## Zone map template

Copy into the PR or a short design note before coding:

```markdown
## Gesture zone map — <screen or component>

| id | region | primary gesture | axis | touch-action | juice | notes |
|----|--------|-----------------|------|--------------|-------|-------|
| throw | chip stack area | drag | y | none | confirm haptic + spring | threshold 48px |
| scrub | amount track | drag after hold 280ms | x | pan-y | step haptic | step every 24px |
| denoms | chip strip | tap | — | manipulation | tick | no drag |
| actions | button row | tap | — | manipulation | confirm | lock with submitting ref |
| scroll | hand history | native scroll | y | pan-y | none | no useDrag |
```

Conflicts to resolve:

- …
Edge insets (avoid system back gesture): …
Reduced motion behavior: …

```

## touch-action cheat sheet

| Goal | `touch-action` |
|------|----------------|
| Custom drag both axes | `none` |
| Custom horizontal only; keep vertical scroll | `pan-y` |
| Custom vertical only; keep horizontal pan | `pan-x` |
| Pinch zoom custom | `none` |
| Native scroll only | `pan-y` or `auto` |
| Buttons / taps | `manipulation` (kills 300ms delay, allows pan) |

## Threshold defaults (mobile thumb)

| Interaction | Distance | Velocity | Time |
|-------------|----------|----------|------|
| Throw confirm | 48–64 px | or vy &gt; 0.5 px/ms | — |
| Swipe dismiss sheet | 80–120 px | or vy &gt; 0.6 | — |
| Scrub step | 20–28 px per step | — | — |
| Long-press arm | 8 px move max | — | 250–350 ms |
| Tap vs drag | filterTaps; move &lt; 10 px | — | &lt; 200 ms |

Tune per control; keep constants named (`THROW_THRESHOLD_PX`).

## Mode switch recipe (throw + scrub)

```text
pointerdown → mode = "pending"
  ├─ moved |dy| > 12 before hold → mode = "throw" (lock y)
  ├─ held 300ms with |movement| < 8 → mode = "scrub" (lock x) + arm juice
  └─ pointerup in pending + small move → treat as tap if needed

pointermove
  ├─ throw → update pull; threshold glow
  └─ scrub → discrete steps; haptic per step (throttled)

pointerup / last
  ├─ throw past threshold → confirm
  ├─ scrub → keep amount; no auto-confirm (or confirm only via button)
  └─ reset mode + spring home
```

## Idempotent confirm

```ts
const submitting = useRef(false);

async function confirmOnce(fn: () => void | Promise<void>) {
  if (submitting.current) return;
  submitting.current = true;
  try {
    await fn();
  } finally {
    window.setTimeout(() => {
      submitting.current = false;
    }, 400);
  }
}
```

Use for gesture end **and** button onClick sharing the same action.

## Reduced motion + mute

```ts
const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// springs → shorter distance or instant set
// particles → off
// sfx → still ok if user unmuted; keep subtle
```

## Quick QA on device

1. Drag zone does not scroll the page underneath.
2. Scroll zone still scrolls with one finger.
3. Edge swipe does not fight horizontal scrub.
4. Double confirm does not fire (gesture + button).
5. Disabled mid-gesture cancels cleanly.
6. Mute kills sound; reduce-motion kills large travels.
7. Haptics fire only on discrete events (not every frame).
