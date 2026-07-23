import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChipStackMini } from '../chips/ChipStackMini';
import { centerOf, useChipFlights, type Point } from '../juice/ChipFlightLayer';
import { planChipTokens } from '../juice/chipFlight';
import { formatChips } from './feltStats';
import {
  buildPotFlights,
  potLabel,
  resolvePotList,
  type PublicPotLike,
} from './feltPotAnim';

export type HandResultLike = {
  winners: number[];
  payouts: Record<number, number>;
};

type Props = {
  pots: readonly PublicPotLike[];
  potTotal: number;
  mySeat: number | null;
  /** When set, run end-of-hand magnet / vanish juice. */
  result: HandResultLike | null | undefined;
  handId: string | undefined;
  stackTargetRef: React.RefObject<HTMLElement | null>;
  /** Where a pot won by someone else should fly. */
  seatTarget: (seat: number) => Point | null;
  onCredit: (amount: number) => void;
  onFlightJuice: (kind: 'win' | 'lose') => void;
  onChipLand: (index: number) => void;
};

type DisplayPot = {
  key: string;
  label: string;
  amount: number;
  outcome: 'magnet' | 'seat' | 'vanish' | 'live';
  credit: number;
};

function toDisplayPots(
  pots: readonly PublicPotLike[],
  potTotal: number,
  result: HandResultLike | null | undefined,
  mySeat: number | null,
): DisplayPot[] {
  if (result) {
    const myPayout = mySeat !== null ? (result.payouts[mySeat] ?? 0) : 0;
    return buildPotFlights({
      pots,
      potTotal,
      mySeat,
      winners: result.winners,
      payouts: result.payouts,
      myPayout,
    });
  }
  return resolvePotList(pots, potTotal).map((p, i) => ({
    key: `pot-${i}`,
    label: potLabel(i),
    amount: p.amount,
    outcome: 'live' as const,
    credit: 0,
  }));
}

/**
 * Zone: the pot, drawn as chips (no gestures). Live piles while betting; on
 * the hand result every pot flies out chip by chip — to my stack when I won
 * it, to the winner's seat when I did not.
 */
export function FeltPotDisplay({
  pots,
  potTotal,
  mySeat,
  result,
  handId,
  stackTargetRef,
  seatTarget,
  onCredit,
  onFlightJuice,
  onChipLand,
}: Props) {
  const reduce = useReducedMotion();
  const display = toDisplayPots(pots, potTotal, result, mySeat);
  const potRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const ranFor = useRef<string | null>(null);
  const [emptied, setEmptied] = useState<Set<string>>(() => new Set());
  const { launch, clear, layer } = useChipFlights();

  // Reset when hand changes / result clears
  useEffect(() => {
    if (!result || !handId) {
      ranFor.current = null;
      setEmptied(new Set());
      clear();
    }
  }, [result, handId, clear]);

  const creditRef = useRef(onCredit);
  const landRef = useRef(onChipLand);
  useEffect(() => {
    creditRef.current = onCredit;
    landRef.current = onChipLand;
  });

  useLayoutEffect(() => {
    if (!result || !handId) return;
    const myPayout = mySeat !== null ? (result.payouts[mySeat] ?? 0) : 0;
    const token = `${handId}:${myPayout}:${result.winners.join(',')}`;
    if (ranFor.current === token) return;
    ranFor.current = token;

    const plan = buildPotFlights({
      pots,
      potTotal,
      mySeat,
      winners: result.winners,
      payouts: result.payouts,
      myPayout,
    });

    onFlightJuice(myPayout > 0 ? 'win' : 'lose');

    const gone = new Set<string>();
    for (const pot of plan) {
      gone.add(pot.key);

      const from = centerOf(potRefs.current.get(pot.key));
      const to =
        pot.outcome === 'magnet'
          ? centerOf(stackTargetRef.current)
          : pot.outcome === 'seat' && pot.toSeat !== null
            ? seatTarget(pot.toSeat)
            : null;

      // Nothing to fly to (reduced motion, off-screen seat, empty pot): the
      // chips still have to end up counted.
      if (reduce || !from || !to || pot.amount <= 0) {
        if (pot.credit > 0) creditRef.current(pot.credit);
        continue;
      }

      const tokens = planChipTokens(pot.amount);
      if (tokens.length === 0) {
        if (pot.credit > 0) creditRef.current(pot.credit);
        continue;
      }

      // Credit is paid out chip by chip so the stack climbs with the line, and
      // the last chip carries whatever rounding left over.
      const per = Math.floor(pot.credit / tokens.length);
      let paid = 0;
      const credit = pot.credit;
      const count = tokens.length;

      launch({
        from,
        to,
        tokens,
        onChipLand: (i) => {
          landRef.current(i);
          if (credit <= 0) return;
          const step = i === count - 1 ? credit - paid : per;
          paid += step;
          if (step > 0) creditRef.current(step);
        },
      });
    }

    setEmptied(gone);
  }, [
    result,
    handId,
    mySeat,
    pots,
    potTotal,
    reduce,
    stackTargetRef,
    seatTarget,
    onFlightJuice,
    launch,
  ]);

  const live = display.length > 0 ? display : EMPTY_POT;

  return (
    <div className="felt-pots zone-felt-pots">
      {live.map((pot, i) => {
        const away = emptied.has(pot.key);
        return (
          <motion.div
            key={pot.key}
            ref={(node) => {
              if (node) potRefs.current.set(pot.key, node);
              else potRefs.current.delete(pot.key);
            }}
            className={`felt-pot-chip${i === 0 ? ' main' : ' side'}`}
            aria-label={`${pot.label}: ${formatChips(pot.amount)}`}
            initial={false}
            animate={away ? { opacity: 0, scale: 0.6 } : { opacity: 1, scale: 1 }}
            transition={{ duration: away ? 0.3 : 0.22, ease: 'easeIn' }}
          >
            <ChipStackMini
              amount={pot.amount}
              size={i === 0 ? 'sm' : 'xs'}
              maxColumns={i === 0 ? 4 : 3}
            />
            <strong className="felt-pot-amount">{formatChips(pot.amount)}</strong>
            {i > 0 ? <span className="felt-pot-tag">S{i}</span> : null}
          </motion.div>
        );
      })}

      {layer}
    </div>
  );
}

const EMPTY_POT: DisplayPot[] = [
  { key: 'pot-0', label: potLabel(0), amount: 0, outcome: 'live', credit: 0 },
];
