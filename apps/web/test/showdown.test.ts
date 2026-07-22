import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Card, PublicPlayer } from '@poker/shared';
import {
  buildShowdownRows,
  describeHandName,
  describeWinnerHeadline,
} from '../src/features/showdown.js';

function card(code: string): Card {
  const suit = { C: 'clubs', D: 'diamonds', H: 'hearts', S: 'spades' } as const;
  const rank = code.slice(0, -1) as Card['rank'];
  return { rank, suit: suit[code.slice(-1) as keyof typeof suit] };
}

function cards(...codes: string[]): Card[] {
  return codes.map(card);
}

function player(seat: number, displayName: string, avatar?: string): PublicPlayer {
  return {
    playerId: `p${seat}`,
    displayName,
    ...(avatar ? { avatar } : {}),
    role: 'player',
    seat,
    stack: 1000,
    connected: true,
  };
}

// Board that gives seat 0 a flush and seat 1 two pair.
const COMMUNITY = cards('2H', '7H', '9H', 'KD', '4S');
const PLAYERS = [player(0, 'Ana', '🐺'), player(1, 'Beto')];
const SHOWDOWN = [
  { seat: 0, cards: cards('AH', '5H') },
  { seat: 1, cards: cards('KS', '9C') },
];

describe('buildShowdownRows', () => {
  it('names each hand in Spanish and puts winners first', () => {
    const rows = buildShowdownRows({
      showdown: SHOWDOWN,
      community: COMMUNITY,
      players: PLAYERS,
      result: { winners: [0], payouts: { 0: 1200 } },
    });

    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.seat, 0);
    assert.equal(rows[0]?.categoryLabel, 'Color al A');
    assert.equal(rows[0]?.isWinner, true);
    assert.equal(rows[0]?.payout, 1200);
    assert.equal(rows[0]?.best.length, 5, 'the five cards that make the hand');
    assert.equal(rows[1]?.seat, 1);
    assert.equal(rows[1]?.categoryLabel, 'Doble par K y 9');
    assert.equal(rows[1]?.isWinner, false);
    assert.equal(rows[1]?.payout, 0);
  });

  it('carries the player name and avatar for display', () => {
    const rows = buildShowdownRows({
      showdown: SHOWDOWN,
      community: COMMUNITY,
      players: PLAYERS,
      result: { winners: [0], payouts: { 0: 1200 } },
    });
    assert.equal(rows[0]?.name, 'Ana');
    assert.equal(rows[0]?.avatar, '🐺');
    assert.equal(rows[1]?.avatar, undefined);
  });

  it('falls back to the seat number when the player already left', () => {
    const rows = buildShowdownRows({
      showdown: SHOWDOWN,
      community: COMMUNITY,
      players: [PLAYERS[0]!],
      result: { winners: [0], payouts: { 0: 1200 } },
    });
    assert.equal(rows[1]?.name, 'Asiento 1');
  });

  it('skips hands it cannot evaluate instead of throwing', () => {
    const rows = buildShowdownRows({
      showdown: [{ seat: 0, cards: cards('AH', '5H') }],
      community: cards('2H', '7H'),
      players: PLAYERS,
      result: { winners: [0], payouts: { 0: 200 } },
    });
    assert.deepEqual(rows, []);
  });
});

describe('describeHandName', () => {
  // Two players both holding "a pair" must not read the same on the felt.
  it('says which pair it is', () => {
    assert.equal(describeHandName(cards('QS', 'QD', 'KH', '9C', '4S')), 'Par de Q');
    assert.equal(describeHandName(cards('9S', '9H', 'KD', 'QC', '4S')), 'Par de 9');
  });

  it('names both pairs, high one first', () => {
    assert.equal(describeHandName(cards('9S', '9H', 'KD', 'KS', '4S')), 'Doble par K y 9');
  });

  it('names the trips, quads and full house rank', () => {
    assert.equal(describeHandName(cards('7S', '7H', '7D', 'KS', '4S')), 'Trío de 7');
    assert.equal(describeHandName(cards('7S', '7H', '7D', '7C', '4S')), 'Póker de 7');
    assert.equal(describeHandName(cards('7S', '7H', '7D', 'KS', 'KC')), 'Full de 7 con K');
  });

  it('names straights and flushes by their top card', () => {
    assert.equal(describeHandName(cards('9S', '10H', 'JD', 'QC', 'KS')), 'Escalera al K');
    assert.equal(describeHandName(cards('2H', '5H', '7H', '9H', 'AH')), 'Color al A');
    assert.equal(describeHandName(cards('9H', '10H', 'JH', 'QH', 'KH')), 'Escalera de color al K');
  });

  it('reads the wheel as a five-high straight', () => {
    assert.equal(describeHandName(cards('AS', '2H', '3D', '4C', '5S')), 'Escalera al 5');
  });

  it('needs no rank for a royal flush', () => {
    assert.equal(describeHandName(cards('10H', 'JH', 'QH', 'KH', 'AH')), 'Escalera real');
  });

  it('names the high card', () => {
    assert.equal(describeHandName(cards('AS', '9H', '7D', '4C', '2S')), 'Carta alta A');
  });
});

describe('describeWinnerHeadline', () => {
  it('says who won, how much, and with what', () => {
    const result = { winners: [0], payouts: { 0: 1200 } };
    const rows = buildShowdownRows({
      showdown: SHOWDOWN,
      community: COMMUNITY,
      players: PLAYERS,
      result,
    });
    assert.equal(
      describeWinnerHeadline(rows, result, PLAYERS),
      'Ganó 🐺 Ana · $1.200 · Color al A',
    );
  });

  it('omits the hand when everyone folded', () => {
    const result = { winners: [1], payouts: { 1: 300 } };
    assert.equal(describeWinnerHeadline([], result, PLAYERS), 'Ganó Beto · $300 · sin showdown');
  });

  it('lists every winner of a split pot', () => {
    const result = { winners: [0, 1], payouts: { 0: 600, 1: 600 } };
    const rows = buildShowdownRows({
      showdown: SHOWDOWN,
      community: COMMUNITY,
      players: PLAYERS,
      result,
    });
    const text = describeWinnerHeadline(rows, result, PLAYERS);
    assert.match(text, /^Bote dividido: /);
    assert.match(text, /🐺 Ana \$600/);
    assert.match(text, /Beto \$600/);
  });

  it('is empty when there is nothing to announce', () => {
    assert.equal(describeWinnerHeadline([], { winners: [], payouts: {} }, PLAYERS), '');
  });
});
