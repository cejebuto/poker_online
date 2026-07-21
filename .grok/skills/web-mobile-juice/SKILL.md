---
name: web-mobile-juice
description: >
  Specialized skill for mobile web juice in React/TypeScript: layered micro-interactions
  (Motion, sound, haptics) and advanced gestures with @use-gesture/react. Prioritizes game
  feel and teaches how to split the screen into exclusive gesture zones so drag/pinch/swipe/pan
  never fight each other. Use when the user asks about juice, game feel, polish, microinteractions,
  sound effects, haptics, vibrate, use-gesture, drag, pinch, swipe, pan, gesture zones, hit
  targets, or competing gestures — or runs /web-mobile-juice.
---

# Web Mobile Juice

Agent skill for **juicy, responsive mobile web UX** in React + TypeScript.

Stack defaults for this skill (2026):

| Layer | Library / API | Role |
|-------|---------------|------|
| Gestures | `@use-gesture/react` | drag, pinch, swipe, pan — flexible + light for web/touch |
| Motion / juice | `motion` (ex Framer Motion) | springs, `whileTap`, layout, best gesture pairing |
| Sound (default) | `use-sound` (Howler under the hood) | simplest clean React SFX hook |
| Sound (advanced) | `howler` direct | sprites, complex sequencing, fine control |
| Haptics | `navigator.vibrate` (+ silent iOS no-op) | tactile confirmation |

Install in `@poker/web` when missing:

```bash
pnpm --filter @poker/web add @use-gesture/react motion use-sound
pnpm --filter @poker/web add -D @types/howler   # if importing howler types directly
```

Do **not** bolt gestures onto a whole-screen root. Design **zones first**, then juice each zone.

## When to load this skill

- User wants juice, game feel, polish, or micro-interactions
- User asks for drag / swipe / pinch / pan / pull-to / long-press
- Gestures conflict (scroll steals drag, two handlers fire, parent vs child)
- Adding chip throw, card flip, slider, sheet, or table interactions on mobile web
- Wiring haptics / SFX to UI feedback

## Core principle: Juice is a stack, not a library

Every meaningful interaction should ideally hit **at least two** of:

1. **Visual** — spring, scale, shadow, blur, trail, layout shift
2. **Haptic** — short pulse on threshold / confirm / error
3. **Audio** — soft click / chip / whoosh (respect mute + reduced motion)

If only the number changes with no feedback, it is **not juice** — it is a state update.

### Juice intensity map

| Event | Visual | Haptic | Sound |
|-------|--------|--------|-------|
| Hover / idle (desktop) | subtle scale 1.02 | none | none |
| Tap / select | scale 0.96 → 1 | 6–10 ms | soft tick |
| Threshold crossed (e.g. raise step) | snap + glow | 6–12 ms | step tick |
| Confirm (bet, throw, send) | settle spring + flash | 15–25 ms | solid confirm |
| Error / illegal | shake X | double short | soft error |
| Big win / all-in | burst particles / confetti light | pattern | fanfare short |

Prefer **under-juice** first. Excess motion on every frame kills battery and feels cheap.

## Critical rule: Gesture zones before handlers

**Never** attach competing gestures to the same DOM node or to a full-viewport parent without a zone map.

### 1. Draw the zone map first

Before writing `useDrag` / `usePinch`, produce a short zone map:

```text
Screen
├── [table-zone]      pan/zoom table OR none (scroll locked)
├── [card-zone]       drag card / peek (axis lock optional)
├── [chip-zone]       vertical throw / stack drag
├── [slider-zone]     horizontal step adjust
├── [sheet-zone]      vertical dismiss sheet
└── [scroll-zone]     native scroll only (no custom drag)
```

For each zone document:

| Field | Meaning |
|-------|---------|
| `id` | Stable name (`chip-throw`, `bet-slider`) |
| `bounds` | Which DOM region owns the pointer |
| `gestures` | Allowed: drag-x, drag-y, pinch, long-press, tap |
| `axis` | `x` \| `y` \| `lock` \| `free` |
| `stealsScroll` | Does it need `touch-action` / `event.preventDefault`? |
| `juice` | What feedback fires on start / move thresholds / end |
| `conflicts` | What must NOT live on ancestors/descendants |

### 2. One primary gesture per zone

- One zone → one **primary** continuous gesture (drag-y **or** drag-x **or** pinch).
- Tap / long-press can coexist if they do not steal the continuous path.
- If you need two continuous gestures in the same pixel area, **time-box** them (e.g. long-press arms horizontal scrub; without hold, vertical throw wins) or **mode-switch** with an explicit control.

### 3. Hit targets and exclusive capture

- Interactive zones: min **44×44 CSS px** (prefer 48+ for thumbs).
- Separate zones with **dead space** or clear visual affordances — not overlapping transparent layers.
- Prefer **sibling zones** over nested competing handlers.
- When nesting is required: child uses `event.stopPropagation` only when it **owns** the gesture; otherwise let the parent handle.
- Use `pointer-events: none` on decorative layers; re-enable only on real targets.

### 4. CSS is part of the gesture design

```css
/* Zone that owns vertical drag (e.g. chip throw) */
.zone-throw {
  touch-action: none; /* or pan-x if only vertical custom drag */
  user-select: none;
  -webkit-user-select: none;
  overscroll-behavior: contain;
}

/* Zone that only needs horizontal scrub */
.zone-scrub {
  touch-action: pan-y; /* browser keeps vertical scroll; we take X */
}

/* Zone that must keep native scroll */
.zone-scroll {
  touch-action: pan-y;
  overflow-y: auto;
  overscroll-behavior: contain;
}
```

Match `touch-action` to the **axis you leave to the browser**. Wrong `touch-action` is the #1 cause of janky mobile gestures.

## @use-gesture/react playbook

### Setup

```bash
pnpm --filter @poker/web add @use-gesture/react motion
```

Use **refs + bind()** on zone roots, **or** `target: ref` when the node is a `motion.*` component.

**Critical:** do not spread `bind()` onto `motion.div` — both expose `onDrag` and TypeScript (and runtime) collide. Prefer:

```tsx
const zoneRef = useRef<HTMLDivElement>(null);
useDrag(handler, { target: zoneRef, axis: 'y', filterTaps: true });
return <motion.div ref={zoneRef} style={{ y }} />;
```

### Pattern: exclusive zone drag

```tsx
import { useDrag } from '@use-gesture/react';
import { useMotionValue, useSpring, motion } from 'motion/react';

// Chip throw zone: vertical only, confirms past threshold
function useChipThrowZone(opts: {
  disabled: boolean;
  onConfirm: () => void;
  thresholdPx?: number;
}) {
  const { disabled, onConfirm, thresholdPx = 48 } = opts;
  const y = useMotionValue(0);
  const springY = useSpring(y, { stiffness: 420, damping: 32 });

  const bind = useDrag(
    ({ active, movement: [, my], last, cancel, canceled, tap }) => {
      if (disabled) return;
      if (tap) return; // let onClick handle taps if needed

      // Up is negative in pointer coords when dragging upward depending on setup;
      // normalize: positive = throw toward confirm direction.
      const throwDelta = -my;

      if (active) {
        y.set(Math.min(0, my)); // visual follow (example: pull up)
        if (throwDelta > thresholdPx * 0.5) {
          // mid-threshold juice — throttle in real code
        }
      }

      if (last && !canceled) {
        if (throwDelta > thresholdPx) {
          onConfirm();
          // confirm juice (haptic + sfx + settle)
        }
        y.set(0);
      }
    },
    {
      axis: 'y',
      filterTaps: true,
      pointer: { touch: true },
      // Prevent vertical page scroll while this zone is active:
      eventOptions: { passive: false },
      from: () => [0, y.get()],
    },
  );

  return { bind, springY };
}
```

### Pattern: hold-to-arm secondary axis

When the same region needs vertical throw **and** horizontal amount scrub:

1. Default: vertical drag = throw.
2. `useDrag` + timeout / `useLongPress` (or distance+time) arms scrub mode.
3. Once armed, lock axis to `x` until pointer up.
4. Juice the mode change (haptic + tint) so the user knows the zone switched meaning.

Never run free 2D drag for two different game actions without mode feedback.

### Pattern: sheet / dismiss

- `axis: 'y'`, rubberband with `bounds` + `rubberband: true`.
- Confirm dismiss only on `last` past distance **or** velocity threshold.
- Juice: opacity/scale linked to progress; light haptic at snap points.

### Pattern: pinch (table zoom)

- Own zone only (`table-zone`), never on controls.
- `touch-action: none` on that zone.
- Clamp scale; spring back on end; optional double-tap reset.

### Config checklist for every `useDrag` / `usePinch`

- [ ] Bound to zone ref, not `document`, unless intentional
- [ ] `axis` set when action is 1D
- [ ] `filterTaps: true` when taps also matter
- [ ] `threshold` / `delay` to avoid accidental activation
- [ ] `enabled: !disabled`
- [ ] `preventScroll` / non-passive only where you truly steal scroll
- [ ] Cancel on `disabled` flip mid-gesture
- [ ] Idempotent confirm (`submitting` ref) — gestures double-fire easily with buttons

## Juice implementation recipes

### Haptics (mobile web)

```ts
export function haptic(ms: number | number[] = 12): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // iOS Safari often no-ops; fail silent
  }
}

// Patterns
export const Haptic = {
  tick: () => haptic(8),
  step: () => haptic(6),
  confirm: () => haptic(18),
  error: () => haptic([12, 40, 12]),
  heavy: () => haptic(28),
} as const;
```

Rules:

- Call haptics on **user gesture turn** (same event stack as pointerup when possible).
- Throttle step haptics while scrubbing (e.g. once per discrete step, not per pixel).
- Never haptic in render or in network callbacks without a user-initiated chain.

### Motion

- Use **springs** for interactive follow (`stiffness` 300–500, `damping` 25–40).
- Use **short tweens** (80–180 ms) for button press.
- Honor `prefers-reduced-motion: reduce` → cut travel distance, disable particles, keep opacity only.
- Avoid layout thrash: prefer `transform` + `opacity`; reserve `layout` animations for small lists.

### Sound (`use-sound` first)

Project samples live in `apps/web/public/sfx/` (WAV):

| File | Use |
|------|-----|
| `tick.wav` | tap / select |
| `step.wav` | scrub step (`interrupt: true`) |
| `confirm.wav` | confirm button |
| `throw.wav` | throw gesture confirm |
| `error.wav` | illegal / error |

Regenerate: `node apps/web/scripts/generate-sfx.mjs`

```tsx
import { useJuice } from '../juice/useJuice';
const { play, muted, toggleMuted } = useJuice();
play('tick'); // haptic + sfx (respects mute)
```

- Prefer `use-sound` via `useJuice`; drop to `howler` only for sprites / multi-track logic.
- Keep SFX &lt; 200 ms for UI; duck if multiple fire.
- Mute key: `poker.sfxMuted` (`soundPrefs.ts`).
- First play must be on a user gesture chain (pointerup/click) — browsers block autoplay.
- Do not autoplay on route enter.

### Coordinated feedback helper

```ts
type JuiceKind = 'tick' | 'step' | 'confirm' | 'error';

export function playJuice(
  kind: JuiceKind,
  opts?: { visual?: () => void; sound?: () => void },
): void {
  opts?.visual?.();
  // map kind → haptic + optional sfx
}
```

Call `playJuice` from **gesture thresholds and confirm paths**, not from every React state write.

## Conflict resolution decision tree

```text
Two gestures fight?
├── Same zone, two continuous gestures → mode-switch or split DOM zones
├── Parent scroll vs child drag → touch-action on child + axis lock
├── Button click + drag end both fire → filterTaps + submitting lock + distance threshold
├── Pinch vs drag → separate zones OR require 2 pointers for pinch only
└── Browser back-swipe vs horizontal scrub → keep scrub away from screen edges (16–24px inset)
```

## Project notes (CHIPS)

This monorepo is a mobile-first poker table PWA (`apps/web`).

- UI copy is Spanish; code/comments English.
- Existing juice seed: `apps/web/src/chips/BettingPanel.tsx` already uses manual pointer handlers + `navigator.vibrate` for throw / scrub / buttons. Prefer **migrating zone-by-zone** to `@use-gesture/react` rather than rewriting the whole panel at once.
- Keep domain rules (bet clamp, confirm kinds) pure; juice and gestures stay in the view layer.
- Do not put gesture state into WS payloads. Juice is client-only.
- When adding table/card gestures, map zones against the felt layout (table vs hole cards vs betting chrome) **before** coding.

Suggested zone map for the betting chrome (extend as needed):

```text
betting-panel
├── [summary]     tap only
├── [denoms]      tap select + haptic tick
├── [throw-zone]  drag-y confirm bet (primary)
├── [scrub-zone]  hold + drag-x step amount
└── [actions]     buttons call / 2× / 3× / fold — tap + confirm juice
```

## Implementation workflow (follow in order)

1. **Zone map** — write the tree + table (bounds, axis, conflicts).
2. **Static layout** — DOM structure with zone classNames and `touch-action`.
3. **Gesture only** — bind handlers; no juice yet; log thresholds.
4. **Confirm safety** — idempotent submit, disabled, cancel paths.
5. **Juice pass** — visual spring → haptic → optional SFX.
6. **Reduced motion + mute** — gates.
7. **Device check** — real phone: iOS Safari + Android Chrome; verify scroll not stolen outside zone.
8. **Tests** — pure helpers (thresholds, clamp, mode arming) with `node:test`; keep gesture wiring thin.

## Anti-patterns (reject these)

- `useDrag` on `#root` / full viewport for one control
- Multiple `useDrag` on nested nodes without axis/`enabled` coordination
- Haptic/sound on every `movement` pixel
- Confirm on `active` instead of `last` (fires while finger still down)
- Ignoring `prefers-reduced-motion`
- Mixing game rules inside gesture math (keep clamp/confirm pure)
- Relying on hover-only juice for mobile primary feedback

## References

- Deeper patterns: [references/zones-and-recipes.md](references/zones-and-recipes.md)
- Local seed: `apps/web/src/chips/BettingPanel.tsx`
- use-gesture docs: https://use-gesture.netlify.app/
- Motion docs: https://motion.dev/
