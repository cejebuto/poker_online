import { useCallback, useRef, useState } from 'react';
import { CHIP_DENOMS, clampBetAmount, type ChipDenom } from './denominations';
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

function haptic(ms = 12): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // ignore
  }
}

/**
 * Four ways to build a bet:
 * 1. Vertical swipe throw → confirm selected amount
 * 2. Tap denominations → increment
 * 3. Hold + horizontal swipe → step by minRaise
 * 4. Buttons call / 2× / 3×
 */
export function BettingPanel({ ctx, onConfirm }: BettingPanelProps) {
  const [denom, setDenom] = useState<ChipDenom>(25);
  const [proposed, setProposed] = useState(0);
  const [status, setStatus] = useState('');
  const submitting = useRef(false);

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
      setProposed(next);
    },
    [ctx],
  );

  const addDenom = () => {
    if (ctx.disabled) return;
    haptic(8);
    setAmount(Math.max(proposed, callTotal) + denom);
  };

  // --- Gesture 1: vertical swipe throw ---
  const throwRef = useRef<{ y: number; active: boolean }>({ y: 0, active: false });

  const onThrowStart = (y: number) => {
    if (ctx.disabled) return;
    throwRef.current = { y, active: true };
  };
  const onThrowEnd = (y: number) => {
    if (!throwRef.current.active || ctx.disabled) return;
    throwRef.current.active = false;
    const dy = throwRef.current.y - y; // up is positive
    if (dy > 48) {
      haptic(20);
      void confirmBet();
      setStatus('¡Apuesta lanzada!');
    }
  };

  // --- Gesture 3: hold + horizontal swipe ---
  const holdRef = useRef<{ x: number; active: boolean; lastStep: number }>({
    x: 0,
    active: false,
    lastStep: 0,
  });

  const onHoldStart = (x: number) => {
    if (ctx.disabled) return;
    holdRef.current = { x, active: true, lastStep: 0 };
  };
  const onHoldMove = (x: number) => {
    if (!holdRef.current.active || ctx.disabled) return;
    const dx = x - holdRef.current.x;
    const stepPx = 24;
    const steps = Math.trunc(dx / stepPx);
    if (steps !== holdRef.current.lastStep) {
      const delta = steps - holdRef.current.lastStep;
      holdRef.current.lastStep = steps;
      const step = Math.max(ctx.minRaise, 1);
      haptic(6);
      setAmount(Math.max(proposed, callTotal) + delta * step);
    }
  };
  const onHoldEnd = () => {
    holdRef.current.active = false;
  };

  const confirmBet = async () => {
    if (ctx.disabled || submitting.current) return;
    submitting.current = true;
    try {
      const target = proposed;
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
      setProposed(0);
      haptic(15);
    } finally {
      // prevent double-fire from gesture+button
      setTimeout(() => {
        submitting.current = false;
      }, 400);
    }
  };

  const cancel = () => {
    setProposed(0);
    setStatus('');
  };

  return (
    <div className={`betting-panel ${ctx.disabled ? 'disabled' : ''}`}>
      <div className="bet-summary">
        <IsoChipStack amount={proposed || ctx.myBetThisRound} label="Propuesto" />
        <div className="meta">
          Stack {ctx.stack} · call {ctx.toCall} · min raise to {minRaiseTo}
        </div>
      </div>

      {/* 2. Tap denominations */}
      <p className="muted small">Tap en ficha para sumar</p>
      <DenomStrip
        active={denom}
        onSelect={(d) => {
          setDenom(d);
          if (!ctx.disabled) {
            haptic(8);
            setAmount(Math.max(proposed, callTotal) + d);
          }
        }}
        disabled={ctx.disabled}
      />
      <button type="button" className="ghost small" disabled={ctx.disabled} onClick={addDenom}>
        +{denom}
      </button>

      {/* 3. Hold + horizontal swipe */}
      <div
        className="gesture-pad hold-pad"
        role="slider"
        aria-label="Mantener y deslizar horizontal para ajustar monto"
        aria-valuenow={proposed}
        tabIndex={ctx.disabled ? -1 : 0}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          onHoldStart(e.clientX);
        }}
        onPointerMove={(e) => onHoldMove(e.clientX)}
        onPointerUp={onHoldEnd}
        onPointerCancel={onHoldEnd}
        onKeyDown={(e) => {
          if (ctx.disabled) return;
          const step = Math.max(ctx.minRaise, 1);
          if (e.key === 'ArrowRight') setAmount(Math.max(proposed, callTotal) + step);
          if (e.key === 'ArrowLeft') setAmount(proposed - step);
        }}
      >
        Hold + swipe ↔ · teclas ← →
      </div>

      {/* 1. Vertical swipe throw */}
      <div
        className="gesture-pad throw-pad"
        role="button"
        aria-label="Deslizar hacia arriba para lanzar apuesta"
        tabIndex={ctx.disabled ? -1 : 0}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          onThrowStart(e.clientY);
        }}
        onPointerUp={(e) => onThrowEnd(e.clientY)}
        onPointerCancel={() => {
          throwRef.current.active = false;
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') void confirmBet();
        }}
      >
        ↑ Swipe vertical para lanzar
      </div>

      {/* 4. Quick buttons */}
      <div className="actions bet-actions">
        <button
          type="button"
          disabled={ctx.disabled}
          onClick={() => {
            haptic();
            onConfirm('fold');
          }}
        >
          Fold
        </button>
        <button
          type="button"
          disabled={ctx.disabled || !ctx.canCheck}
          onClick={() => {
            haptic();
            onConfirm('check');
          }}
        >
          Check
        </button>
        <button
          type="button"
          disabled={ctx.disabled || ctx.toCall <= 0 || ctx.stack <= 0}
          onClick={() => {
            haptic();
            onConfirm('call');
          }}
        >
          Call {ctx.toCall || ''}
        </button>
        <button
          type="button"
          disabled={ctx.disabled || ctx.stack <= 0}
          onClick={() => setAmount(callTotal > 0 ? callTotal * 2 : Math.max(ctx.minRaise, 1) * 2)}
        >
          2×
        </button>
        <button
          type="button"
          disabled={ctx.disabled || ctx.stack <= 0}
          onClick={() => setAmount(callTotal > 0 ? callTotal * 3 : Math.max(ctx.minRaise, 1) * 3)}
        >
          3×
        </button>
        <button
          type="button"
          disabled={ctx.disabled || ctx.stack <= 0}
          onClick={() => setAmount(maxTotal)}
        >
          All-in
        </button>
      </div>

      <div className="row bet-confirm">
        <button
          type="button"
          className="primary"
          disabled={ctx.disabled || (proposed <= ctx.myBetThisRound && !ctx.canCheck)}
          onClick={() => void confirmBet()}
        >
          Confirmar {proposed > 0 ? proposed : ''}
        </button>
        <button type="button" className="ghost" disabled={ctx.disabled} onClick={cancel}>
          Cancelar
        </button>
      </div>

      {/* Keyboard fallback amount input */}
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
