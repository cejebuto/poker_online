import type { Card } from '@poker/shared';
import { SUIT_SYMBOL, isRedSuit } from '@poker/shared';

export function SimpleCard({ card, size = 'md' }: { card: Card; size?: 'sm' | 'md' | 'lg' }) {
  const red = isRedSuit(card.suit);
  const dim =
    size === 'sm' ? 'card sm' : size === 'lg' ? 'card lg' : 'card md';
  return (
    <div className={`${dim} ${red ? 'red' : 'black'}`} title={`${card.rank}${card.suit}`}>
      <span className="rank">{card.rank}</span>
      <span className="suit">{SUIT_SYMBOL[card.suit]}</span>
    </div>
  );
}

export function CardBack({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'card sm' : size === 'lg' ? 'card lg' : 'card md';
  return <div className={`${dim} back`}>♠</div>;
}
