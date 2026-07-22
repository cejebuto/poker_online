import { motion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import { clampBetAmount } from '../chips/denominations';
import { useJuice } from '../juice/useJuice';
import { betSliderRange, potSizedTotal } from './betRange';
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
 * Zone map (taps + the native range input only — no useDrag, so it never
 * competes with the hole-card swipe underneath):
 *
 * bet-modal
 * ├── [backdrop]  tap to cancel
 * ├── [slider]    native range
 * ├── [presets]   taps
 * └── [actions]   taps
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
  const range = betSliderRange({ currentBet, minRaise, bigBlind, myBetThisRound, stack });
  const [amount, setAmount] = useState(range.min);

  // Reopening on a new street must not carry the previous street's amount.
  useEffect(() => {
    if (open) setAmount(range.min);
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

  if (!open) return null;

  const legal = (raw: number) =>
    clampBetAmount({ amount: raw, toCall, minRaise, currentBet, myBetThisRound, stack });

  const pick = (raw: number) => {
    setAmount(legal(raw));
    play('step');
  };

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
  const presets: { label: string; total: number }[] = [
    { label: 'Mín', total: range.min },
    { label: '½ bote', total: potSizedTotal({ pot, toCall, myBetThisRound, fraction: 0.5 }) },
    { label: 'Bote', total: potSizedTotal({ pot, toCall, myBetThisRound, fraction: 1 }) },
    { label: 'All-in', total: range.max },
  ];

  return (
    <div className="confirm-modal-root zone-bet-modal" role="presentation">
      <button
        type="button"
        className="confirm-modal-backdrop"
        aria-label="Cerrar"
        onClick={onCancel}
      />
      <motion.div
        className="confirm-modal-panel bet-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      >
        <h2 id={titleId} className="confirm-modal-title">
          {range.kind === 'bet' ? '¿Cuánto apostás?' : '¿Cuánto subís?'}
        </h2>

        <p className="bet-modal-amount accent">{formatChips(legal(amount))}</p>
        <p className="confirm-modal-message">
          Salen {formatChips(chipsFromStack)} de tu stack de {formatChips(stack)}.
        </p>

        <input
          className="bet-modal-range"
          type="range"
          min={range.min}
          max={range.max}
          step={1}
          value={amount}
          disabled={range.allInOnly}
          aria-label="Monto de la apuesta"
          onChange={(e) => pick(Number(e.target.value))}
        />

        <div className="bet-modal-presets">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              className="ghost small"
              onClick={() => pick(p.total)}
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
            step={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            onBlur={() => setAmount(legal(amount))}
          />
        </label>

        {range.allInOnly ? (
          <p className="meta small">Tu stack no cubre el mínimo legal: solo podés ir all-in.</p>
        ) : null}

        <div className="confirm-modal-actions">
          <button type="button" className="confirm-modal-cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="confirm-modal-ok tone-primary"
            onClick={confirm}
          >
            {legal(amount) >= range.max
              ? 'All-in'
              : `${range.kind === 'bet' ? 'Apostar' : 'Subir a'} ${formatChips(legal(amount))}`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
