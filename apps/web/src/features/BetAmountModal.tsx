import { useDrag } from '@use-gesture/react';
import { motion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import { clampBetAmount } from '../chips/denominations';
import { useJuice } from '../juice/useJuice';
import {
  amountFromSliderY,
  BET_CHIP_STEP,
  betSliderRange,
  loadBetSliderSide,
  potSizedTotal,
  saveBetSliderSide,
  sliderFillRatio,
  snapBetAmount,
  type BetSliderSide,
} from './betRange';
import { formatChips } from './feltStats';

export type BetAmountModalProps = {
  open: boolean;
  stack: number;
  toCall: number;
  currentBet: number;
  minRaise: number;
  bigBlind: number;
  myBetThisRound: number;
  pot: number;
  onCancel: () => void;
  /** Amounts are round totals (raise-to); all-in is sent without one. */
  onConfirm: (action: 'bet' | 'raise' | 'all-in', amount?: number) => void;
};

/**
 * Amount picker for Bet / Raise.
 *
 * Zone map:
 *
 * bet-modal
 * ├── [backdrop]     tap to cancel
 * ├── [side-toggle]  left | right for the pyramid rail
 * ├── [slider]       vertical drag-y on inverted pyramid (top = all-in)
 * ├── [presets]      taps
 * └── [actions]      taps
 */
export function BetAmountModal({
  open,
  stack,
  toCall,
  currentBet,
  minRaise,
  bigBlind,
  myBetThisRound,
  pot,
  onCancel,
  onConfirm,
}: BetAmountModalProps) {
  const titleId = useId();
  const { play } = useJuice();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const range = betSliderRange({ currentBet, minRaise, bigBlind, myBetThisRound, stack });
  const [amount, setAmount] = useState(range.min);
  const [side, setSide] = useState<BetSliderSide>(() => loadBetSliderSide());
  const lastStepRef = useRef(range.min);

  // Reopening on a new street must not carry the previous street's amount.
  useEffect(() => {
    if (open) {
      setAmount(range.min);
      lastStepRef.current = range.min;
    }
  }, [open, range.min]);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  const legal = (raw: number) => {
    const snapped = snapBetAmount(raw, range.min, range.max, BET_CHIP_STEP);
    return clampBetAmount({
      amount: snapped,
      toCall,
      minRaise,
      currentBet,
      myBetThisRound,
      stack,
    });
  };

  const pick = (raw: number, withJuice = true) => {
    const next = legal(raw);
    setAmount(next);
    if (withJuice && next !== lastStepRef.current) {
      // Juice once per 0.1K stop (or min / all-in).
      lastStepRef.current = next;
      play('step');
    } else {
      lastStepRef.current = next;
    }
  };

  const applyPointerY = (clientY: number) => {
    const el = trackRef.current;
    if (!el || range.allInOnly) return;
    const rect = el.getBoundingClientRect();
    pick(
      amountFromSliderY({
        clientY,
        trackTop: rect.top,
        trackHeight: rect.height,
        min: range.min,
        max: range.max,
      }),
    );
  };

  // Zone: vertical scrub on the pyramid. Exclusive drag-y; no nested gestures.
  useDrag(
    ({ xy: [, y], active, last, tap }) => {
      if (range.allInOnly) return;
      // `tap` is true on last for a short press — still set the amount.
      if (active || last || tap) applyPointerY(y);
    },
    {
      target: trackRef,
      axis: 'y',
      filterTaps: false,
      pointer: { touch: true },
      eventOptions: { passive: false },
      enabled: open && !range.allInOnly,
    },
  );

  if (!open) return null;

  const confirm = () => {
    const total = legal(amount);
    play('confirm');
    if (total >= range.max) {
      onConfirm('all-in');
      return;
    }
    onConfirm(range.kind, total);
  };

  const chipsFromStack = Math.max(0, legal(amount) - myBetThisRound);
  const fill = sliderFillRatio(legal(amount), range.min, range.max);
  const atAllIn = legal(amount) >= range.max;
  const presets: { label: string; total: number }[] = [
    { label: 'Mín', total: range.min },
    { label: '½ bote', total: potSizedTotal({ pot, toCall, myBetThisRound, fraction: 0.5 }) },
    { label: 'Bote', total: potSizedTotal({ pot, toCall, myBetThisRound, fraction: 1 }) },
    { label: 'All-in', total: range.max },
  ];

  const setSliderSide = (next: BetSliderSide) => {
    setSide(next);
    saveBetSliderSide(next);
    play('tick');
  };

  const sliderCol = (
    <div className="bet-modal-slider-col zone-bet-slider">
      <span className={`bet-modal-slider-cap${atAllIn ? ' is-hot' : ''}`}>All-in</span>
      <div
        ref={trackRef}
        className={`bet-modal-pyramid${atAllIn ? ' is-allin' : ''}${range.allInOnly ? ' is-locked' : ''}`}
        role="slider"
        tabIndex={range.allInOnly ? -1 : 0}
        aria-orientation="vertical"
        aria-valuemin={range.min}
        aria-valuemax={range.max}
        aria-valuenow={legal(amount)}
        aria-valuetext={
          atAllIn ? `All-in ${formatChips(range.max)}` : formatChips(legal(amount))
        }
        aria-label="Monto de la apuesta"
        aria-disabled={range.allInOnly}
        onKeyDown={(e) => {
          if (range.allInOnly) return;
          if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
            e.preventDefault();
            pick(legal(amount) + BET_CHIP_STEP);
          }
          if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
            e.preventDefault();
            pick(legal(amount) - BET_CHIP_STEP);
          }
          if (e.key === 'Home') {
            e.preventDefault();
            pick(range.max);
          }
          if (e.key === 'End') {
            e.preventDefault();
            pick(range.min);
          }
        }}
      >
        <div className="bet-modal-pyramid-shell" aria-hidden>
          <div
            className="bet-modal-pyramid-fill"
            style={{ height: `${Math.round(fill * 100)}%` }}
          />
        </div>
        <div
          className="bet-modal-pyramid-thumb"
          style={{ bottom: `calc(${Math.round(fill * 100)}% - 0.55rem)` }}
          aria-hidden
        />
      </div>
      <span className="bet-modal-slider-cap">Mín</span>
    </div>
  );

  return (
    <div className="confirm-modal-root zone-bet-modal" role="presentation">
      <button
        type="button"
        className="confirm-modal-backdrop"
        aria-label="Cerrar"
        onClick={onCancel}
      />
      <motion.div
        className={`confirm-modal-panel bet-modal-panel bet-modal-panel--${side}${atAllIn ? ' is-allin' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      >
        <div className="bet-modal-head">
          <h2 id={titleId} className="confirm-modal-title">
            {range.kind === 'bet' ? '¿Cuánto apuestas?' : '¿Cuánto subes?'}
          </h2>
          <div className="bet-modal-side-toggle" role="group" aria-label="Lado de la barra">
            <button
              type="button"
              className={side === 'left' ? 'is-active' : ''}
              aria-pressed={side === 'left'}
              onClick={() => setSliderSide('left')}
            >
              Izq
            </button>
            <button
              type="button"
              className={side === 'right' ? 'is-active' : ''}
              aria-pressed={side === 'right'}
              onClick={() => setSliderSide('right')}
            >
              Der
            </button>
          </div>
        </div>

        <div className={`bet-modal-body bet-modal-body--${side}`}>
          {side === 'left' ? sliderCol : null}

          <div className="bet-modal-main">
            <p className={`bet-modal-amount accent${atAllIn ? ' is-allin' : ''}`}>
              {atAllIn ? `All-in ${formatChips(legal(amount))}` : formatChips(legal(amount))}
            </p>
            <p className="confirm-modal-message">
              Salen {formatChips(chipsFromStack)} de tu stack de {formatChips(stack)}.
            </p>

            <div className="bet-modal-presets">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="ghost small"
                  onClick={() => pick(p.total, true)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <label className="field bet-modal-custom">
              Monto personalizado
              <input
                type="number"
                min={range.min}
                max={range.max}
                step={BET_CHIP_STEP}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                onBlur={() => pick(amount, false)}
              />
              <span className="meta small">Saltos de {formatChips(BET_CHIP_STEP)} (redondea abajo)</span>
            </label>

            {range.allInOnly ? (
              <p className="meta small">Tu stack no cubre el mínimo legal: solo puedes ir all-in.</p>
            ) : null}

            <div className="confirm-modal-actions">
              <button type="button" className="confirm-modal-cancel" onClick={onCancel}>
                Cancelar
              </button>
              <button
                ref={confirmRef}
                type="button"
                className={`confirm-modal-ok ${atAllIn ? 'tone-warn' : 'tone-primary'}`}
                onClick={confirm}
              >
                {atAllIn
                  ? 'All-in'
                  : `${range.kind === 'bet' ? 'Apostar' : 'Subir a'} ${formatChips(legal(amount))}`}
              </button>
            </div>
          </div>

          {side === 'right' ? sliderCol : null}
        </div>
      </motion.div>
    </div>
  );
}
