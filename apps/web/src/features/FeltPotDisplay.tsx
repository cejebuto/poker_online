import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  onCredit: (amount: number) => void;
  onFlightJuice: (kind: 'win' | 'lose') => void;
};

type DisplayPot = {
  key: string;
  label: string;
  amount: number;
  outcome: 'magnet' | 'vanish' | 'live';
  credit: number;
};

type Flyer = {
  key: string;
  amount: number;
  credit: number;
  from: { x: number; y: number; w: number };
  to: { x: number; y: number };
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
 * Zone: pot display (no gestures). Live amounts while betting; on hand result,
 * each pot either magnets to hero stack or vanishes.
 */
export function FeltPotDisplay({
  pots,
  potTotal,
  mySeat,
  result,
  handId,
  stackTargetRef,
  onCredit,
  onFlightJuice,
}: Props) {
  const reduce = useReducedMotion();
  const display = toDisplayPots(pots, potTotal, result, mySeat);
  const potRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const ranFor = useRef<string | null>(null);
  const [hiddenMagnet, setHiddenMagnet] = useState<Set<string>>(() => new Set());
  const [vanishKeys, setVanishKeys] = useState<Set<string>>(() => new Set());
  const [flyers, setFlyers] = useState<Flyer[]>([]);

  // Reset when hand changes / result clears
  useEffect(() => {
    if (!result || !handId) {
      ranFor.current = null;
      setHiddenMagnet(new Set());
      setVanishKeys(new Set());
      setFlyers([]);
    }
  }, [result, handId]);

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
      myPayout,
    });

    onFlightJuice(myPayout > 0 ? 'win' : 'lose');

    if (reduce) {
      if (myPayout > 0) onCredit(myPayout);
      setHiddenMagnet(new Set(plan.map((p) => p.key)));
      setVanishKeys(new Set(plan.filter((p) => p.outcome === 'vanish').map((p) => p.key)));
      return;
    }

    const stackBox = stackTargetRef.current?.getBoundingClientRect();
    const nextFlyers: Flyer[] = [];
    const hide = new Set<string>();
    const vanish = new Set<string>();

    for (const pot of plan) {
      if (pot.outcome === 'vanish') {
        vanish.add(pot.key);
        continue;
      }
      const el = potRefs.current.get(pot.key);
      const box = el?.getBoundingClientRect();
      if (!box || !stackBox || pot.amount <= 0) {
        hide.add(pot.key);
        if (pot.credit > 0) onCredit(pot.credit);
        continue;
      }
      hide.add(pot.key);
      nextFlyers.push({
        key: pot.key,
        amount: pot.amount,
        credit: pot.credit,
        from: {
          x: box.left + box.width / 2,
          y: box.top + box.height / 2,
          w: box.width,
        },
        to: {
          x: stackBox.left + stackBox.width / 2,
          y: stackBox.top + stackBox.height / 2,
        },
      });
    }

    setHiddenMagnet(hide);
    setVanishKeys(vanish);
    setFlyers(nextFlyers);
  }, [
    result,
    handId,
    mySeat,
    pots,
    potTotal,
    reduce,
    stackTargetRef,
    onCredit,
    onFlightJuice,
  ]);

  const onFlyerDone = (key: string, credit: number) => {
    if (credit > 0) onCredit(credit);
    setFlyers((prev) => prev.filter((f) => f.key !== key));
  };

  if (display.length === 0) {
    return (
      <div className="felt-pots zone-felt-pots">
        <div className="felt-pot-chip main">
          <p className="felt-label">Bote principal</p>
          <strong className="felt-pot-amount">{formatChips(0)}</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="felt-pots zone-felt-pots">
      {display.map((pot, i) => {
        const magnetGone = hiddenMagnet.has(pot.key);
        const vanishing = vanishKeys.has(pot.key);
        return (
          <motion.div
            key={pot.key}
            ref={(node) => {
              if (node) potRefs.current.set(pot.key, node);
              else potRefs.current.delete(pot.key);
            }}
            className={`felt-pot-chip${i === 0 ? ' main' : ' side'}`}
            initial={false}
            animate={
              magnetGone
                ? { opacity: 0, scale: 0.55 }
                : vanishing
                  ? { opacity: 0, scale: 0.45, filter: 'blur(5px)' }
                  : { opacity: 1, scale: 1, filter: 'blur(0px)' }
            }
            transition={{
              duration: vanishing ? 0.5 : 0.22,
              delay: vanishing ? i * 0.1 : 0,
              ease: 'easeIn',
            }}
          >
            <p className="felt-label">{pot.label}</p>
            <strong className="felt-pot-amount">{formatChips(pot.amount)}</strong>
          </motion.div>
        );
      })}

      {typeof document !== 'undefined'
        ? createPortal(
            <>
              {flyers.map((f, i) => (
                <PotFlyer
                  key={f.key}
                  flyer={f}
                  delay={i * 0.12}
                  onDone={() => onFlyerDone(f.key, f.credit)}
                />
              ))}
            </>,
            document.body,
          )
        : null}
    </div>
  );
}

function PotFlyer({
  flyer,
  delay,
  onDone,
}: {
  flyer: Flyer;
  delay: number;
  onDone: () => void;
}) {
  const settled = useRef(false);
  const finish = () => {
    if (settled.current) return;
    settled.current = true;
    onDone();
  };

  useEffect(() => {
    const t = window.setTimeout(finish, delay * 1000 + 950);
    return () => window.clearTimeout(t);
  }, [delay]);

  return (
    <motion.div
      className="felt-pot-flyer"
      initial={{
        x: flyer.from.x,
        y: flyer.from.y,
        opacity: 1,
        scale: 1,
      }}
      animate={{
        x: flyer.to.x,
        y: flyer.to.y,
        opacity: 0.12,
        scale: 0.4,
      }}
      transition={{
        delay,
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
      }}
      onAnimationComplete={finish}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: Math.max(flyer.from.w, 76),
        marginLeft: -Math.max(flyer.from.w, 76) / 2,
        marginTop: -18,
        pointerEvents: 'none',
        zIndex: 70,
      }}
    >
      <span className="felt-pot-flyer-inner">{formatChips(flyer.amount)}</span>
    </motion.div>
  );
}
