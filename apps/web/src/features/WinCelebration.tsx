import { motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { confettiCount, confettiPieces, seedFromHandId } from './celebration';
import { formatChips } from './feltStats';

export type WinCelebrationProps = {
  open: boolean;
  payout: number;
  bigBlind: number;
  handId: string | undefined;
  onDone: () => void;
};

const VISIBLE_MS = 3500;

/**
 * "¡Ganaste!" over the felt, with confetti sized by how big the win was.
 *
 * Overlay only: `pointer-events: none` and a z-index above the pot flyers, so the
 * chips still fly to the stack underneath and nothing swallows a tap.
 */
export function WinCelebration({
  open,
  payout,
  bigBlind,
  handId,
  onDone,
}: WinCelebrationProps) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(onDone, VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, [open, onDone]);

  if (!open) return null;

  const pieces = reduce ? [] : confettiPieces(confettiCount({ payout, bigBlind }), seedFromHandId(handId));

  return (
    <div className="win-celebration" role="status" aria-live="polite">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="win-confetti"
          style={{
            left: `${p.xPct}%`,
            width: p.size,
            height: p.size * 1.6,
            background: p.color,
          }}
          initial={{ y: '-10vh', opacity: 0, rotate: 0 }}
          animate={{ y: '105vh', x: p.drift, opacity: [0, 1, 1, 0], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'linear' }}
        />
      ))}

      <motion.div
        className="win-banner"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
      >
        <strong className="win-banner-title">¡Ganaste!</strong>
        <span className="win-banner-amount">{formatChips(payout)}</span>
      </motion.div>
    </div>
  );
}
