import { useDrag } from '@use-gesture/react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { useCallback, useRef, useState } from 'react';
import { playHaptic } from '../juice/haptic';
import { useJuice } from '../juice/useJuice';
import { CHIP_DENOMS, clampBetAmount, type ChipDenom } from './denominations';
import {
  amountAfterScrubSteps,
  isThrowConfirm,
  SCRUB_STEP_PX,
  scrubStepsFromDelta,
  THROW_THRESHOLD_PX,
} from './gestureMath';
import { DenomStrip, IsoChipStack } from './IsoChipStack';

export type BettingContext = {
  stack: number;
  toCall: number;
  minRaise: number;
  currentBet: number;
  myBetThisRound: number;
  /** true when there is a bet to face */
  canCheck: boolean;
  disabled: boolean;
};

export type BettingPanelProps = {
  ctx: BettingContext;
  onConfirm: (kind: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in', amount?: number) => void;
};

/**
 * Zone map (exclusive — do not nest competing continuous gestures):
 *
 * betting-panel
 * ├── [summary]     display + mute toggle
 * ├── [denoms]      tap select + tick juice
 * ├── [scrub-zone]  drag-x step amount
 * ├── [throw-zone]  drag-y confirm bet
 * └── [actions]     buttons — tap juice
 *
 * Four ways to build a bet:
 * 1. Vertical swipe throw → confirm selected amount
 * 2. Tap denominations → increment
 * 3. Horizontal scrub → step by minRaise
 * 4. Buttons call / 2× / 3×
 */
export function BettingPanel({ ctx, onConfirm }: BettingPanelProps) {
  const { play, muted, toggleMuted } = useJuice();
  const [denom, setDenom] = useState<ChipDenom>(25);
  const [proposed, setProposed] = useState(0);
  const [status, setStatus] = useState('');
  const [throwArmed, setThrowArmed] = useState(false);
  const [scrubActive, setScrubActive] = useState(false);
  const submitting = useRef(false);
  const proposedRef = useRef(0);
  const scrubLastStep = useRef(0);
  const throwZoneRef = useRef<HTMLDivElement>(null);
  const scrubZoneRef = useRef<HTMLDivElement>(null);

  const throwY = useMotionValue(0);
  const throwScale = useTransform(throwY, [0, -THROW_THRESHOLD_PX], [1, 1.06]);
  const throwGlow = useTransform(
    throwY,
    [0, -THROW_THRESHOLD_PX],
    ['rgba(34,197,94,0.15)', 'rgba(34,197,94,0.45)'],
  );

  const callTotal = ctx.myBetThisRound + ctx.toCall;
  const maxTotal = ctx.myBetThisRound + ctx.stack;
  const minRaiseTo = ctx.currentBet + ctx.minRaise;

  const setAmount = useCallback(
    (raw: number) => {
      const next = clampBetAmount({
        amount: raw,
        toCall: ctx.toCall,
        minRaise: ctx.minRaise,
        currentBet: ctx.currentBet,
        myBetThisRound: ctx.myBetThisRound,
        stack: ctx.stack,
      });
      proposedRef.current = next;
      setProposed(next);
    },
    [ctx],
  );

  const addDenom = () => {
    if (ctx.disabled) return;
    play('tick');
    setAmount(Math.max(proposedRef.current, callTotal) + denom);
  };

  const confirmBet = async () => {
    if (ctx.disabled || submitting.current) return;
    submitting.current = true;
    try {
      const target = proposedRef.current;
      if (target <= ctx.myBetThisRound && ctx.canCheck) {
        onConfirm('check');
        return;
      }
      if (target <= 0 && ctx.toCall > 0) {
        onConfirm('fold');
        return;
      }
      if (target >= maxTotal) {
        onConfirm('all-in');
        proposedRef.current = 0;
        setProposed(0);
        return;
      }
      if (ctx.currentBet === 0) {
        onConfirm('bet', target);
      } else if (target === callTotal) {
        onConfirm('call');
      } else {
        onConfirm('raise', target);
      }
      proposedRef.current = 0;
      setProposed(0);
    } finally {
      // prevent double-fire from gesture+button
      setTimeout(() => {
        submitting.current = false;
      }, 400);
    }
  };

  const cancel = () => {
    proposedRef.current = 0;
    setProposed(0);
    setStatus('');
  };

  // --- Zone: throw (drag-y only). target:ref avoids bind() onDrag vs motion conflict ---
  useDrag(
    ({ active, movement: [, my], last, canceled, tap }) => {
      if (ctx.disabled || tap) return;

      // Finger up → negative my in use-gesture when dragging upward
      const dyUp = -my;

      if (active) {
        // Visual follow: pull pad up with finger (clamp)
        const pull = Math.max(-THROW_THRESHOLD_PX * 1.4, Math.min(0, my));
        throwY.set(pull);
        setThrowArmed(isThrowConfirm(dyUp));
        return;
      }

      if (last && !canceled) {
        const ok = isThrowConfirm(dyUp);
        throwY.set(0);
        setThrowArmed(false);
        if (ok) {
          play('throw');
          void confirmBet();
          setStatus('¡Apuesta lanzada!');
        }
      }
    },
    {
      target: throwZoneRef,
      axis: 'y',
      filterTaps: true,
      pointer: { touch: true },
      enabled: !ctx.disabled,
      from: () => [0, throwY.get()],
    },
  );

  // --- Zone: scrub (drag-x only) ---
  useDrag(
    ({ active, movement: [mx], first, last, canceled, tap }) => {
      if (ctx.disabled || tap) return;

      if (first) {
        scrubLastStep.current = 0;
        setScrubActive(true);
      }

      if (active) {
        const { deltaSteps, nextLastStep } = scrubStepsFromDelta(
          mx,
          scrubLastStep.current,
          SCRUB_STEP_PX,
        );
        if (deltaSteps !== 0) {
          scrubLastStep.current = nextLastStep;
          const step = Math.max(ctx.minRaise, 1);
          // Legacy parity: each tick steps from max(proposed, callTotal)
          setAmount(
            amountAfterScrubSteps(Math.max(proposedRef.current, callTotal), deltaSteps, step),
          );
          play('step');
        }
      }

      if (last || canceled) {
        scrubLastStep.current = 0;
        setScrubActive(false);
      }
    },
    {
      target: scrubZoneRef,
      axis: 'x',
      filterTaps: true,
      pointer: { touch: true },
      enabled: !ctx.disabled,
    },
  );

  return (
    <div className={`betting-panel ${ctx.disabled ? 'disabled' : ''}`}>
      <div className="bet-summary zone-summary">
        <IsoChipStack amount={proposed || ctx.myBetThisRound} label="Propuesto" />
        <div className="meta row between bet-summary-meta">
          <span>
            Stack {ctx.stack} · call {ctx.toCall} · min raise to {minRaiseTo}
          </span>
          <button
            type="button"
            className="ghost small sfx-toggle"
            aria-pressed={muted}
            aria-label={muted ? 'Activar sonidos' : 'Silenciar sonidos'}
            title={muted ? 'Sonido apagado' : 'Sonido encendido'}
            onClick={() => {
              // Sound hooks rebind after mute flip; haptic still works immediately.
              toggleMuted();
              playHaptic('tick');
            }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* Zone: denoms — tap only */}
      <p className="muted small">Tap en ficha para sumar</p>
      <div className="zone-denoms">
        <DenomStrip
          active={denom}
          onSelect={(d) => {
            setDenom(d);
            if (!ctx.disabled) {
              play('tick');
              setAmount(Math.max(proposedRef.current, callTotal) + d);
            }
          }}
          disabled={ctx.disabled}
        />
        <button type="button" className="ghost small" disabled={ctx.disabled} onClick={addDenom}>
          +{denom}
        </button>
      </div>

      {/* Zone: scrub — drag-x */}
      <div
        ref={scrubZoneRef}
        className={`gesture-pad hold-pad zone-scrub ${scrubActive ? 'is-active' : ''}`}
        role="slider"
        aria-label="Deslizar horizontal para ajustar monto"
        aria-valuenow={proposed}
        tabIndex={ctx.disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (ctx.disabled) return;
          const step = Math.max(ctx.minRaise, 1);
          if (e.key === 'ArrowRight') {
            setAmount(Math.max(proposedRef.current, callTotal) + step);
            play('step');
          }
          if (e.key === 'ArrowLeft') {
            setAmount(proposedRef.current - step);
            play('step');
          }
        }}
      >
        Swipe ↔ · teclas ← →
      </div>

      {/* Zone: throw — drag-y (motion styles; gestures via target ref) */}
      <motion.div
        ref={throwZoneRef}
        className={`gesture-pad throw-pad zone-throw ${throwArmed ? 'is-armed' : ''}`}
        role="button"
        aria-label="Deslizar hacia arriba para lanzar apuesta"
        tabIndex={ctx.disabled ? -1 : 0}
        style={{
          y: throwY,
          scale: throwScale,
          backgroundColor: throwGlow,
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            play('confirm');
            void confirmBet();
          }
        }}
      >
        ↑ Swipe vertical para lanzar
        {throwArmed ? ' · suelta para confirmar' : ''}
      </motion.div>

      {/* Zone: actions — tap */}
      <div className="actions bet-actions zone-actions">
        <button
          type="button"
          disabled={ctx.disabled}
          onClick={() => {
            play('tick');
            onConfirm('fold');
          }}
        >
          Fold
        </button>
        <button
          type="button"
          disabled={ctx.disabled || !ctx.canCheck}
          onClick={() => {
            play('tick');
            onConfirm('check');
          }}
        >
          Check
        </button>
        <button
          type="button"
          disabled={ctx.disabled || ctx.toCall <= 0 || ctx.stack <= 0}
          onClick={() => {
            play('tick');
            onConfirm('call');
          }}
        >
          Call {ctx.toCall || ''}
        </button>
        <button
          type="button"
          disabled={ctx.disabled || ctx.stack <= 0}
          onClick={() => {
            play('tick');
            setAmount(callTotal > 0 ? callTotal * 2 : Math.max(ctx.minRaise, 1) * 2);
          }}
        >
          2×
        </button>
        <button
          type="button"
          disabled={ctx.disabled || ctx.stack <= 0}
          onClick={() => {
            play('tick');
            setAmount(callTotal > 0 ? callTotal * 3 : Math.max(ctx.minRaise, 1) * 3);
          }}
        >
          3×
        </button>
        <button
          type="button"
          disabled={ctx.disabled || ctx.stack <= 0}
          onClick={() => {
            play('tick');
            setAmount(maxTotal);
          }}
        >
          All-in
        </button>
      </div>

      <div className="row bet-confirm">
        <button
          type="button"
          className="primary"
          disabled={ctx.disabled || (proposed <= ctx.myBetThisRound && !ctx.canCheck)}
          onClick={() => {
            play('confirm');
            void confirmBet();
          }}
        >
          Confirmar {proposed > 0 ? proposed : ''}
        </button>
        <button type="button" className="ghost" disabled={ctx.disabled} onClick={cancel}>
          Cancelar
        </button>
      </div>

      <label className="field">
        Monto (teclado)
        <input
          type="number"
          min={0}
          max={maxTotal}
          value={proposed || ''}
          disabled={ctx.disabled}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
        />
      </label>

      {status ? <p className="meta">{status}</p> : null}
      <p className="meta small">
        Denoms: {CHIP_DENOMS.join(', ')} · el servidor revalida el monto
      </p>
    </div>
  );
}
