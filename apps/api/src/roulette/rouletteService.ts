import { randomUUID } from 'node:crypto';
import {
  POCKET_COUNT,
  ROULETTE,
  betFromSpot,
  createCryptoRng,
  pickPocketIndex,
  pocketByIndex,
  resolveBet,
  type MyBet,
} from '@roulette/core';
import { rouletteHub } from './rouletteHub.js';
import {
  anyConnected,
  createRoom,
  roundStaked,
  toPublicState,
  type RoulettePlayer,
  type RouletteRoom,
} from './rouletteRoom.js';

/** The single global table. No rooms, no persistence — it lives while the process does. */
const room: RouletteRoom = createRoom();
const rng = createCryptoRng();

function myBets(p: RoulettePlayer): MyBet[] {
  return [...p.bets.entries()].map(([spot, amount]) => ({ spot, amount }));
}

function broadcastState(): void {
  rouletteHub.broadcast({ type: 'state', state: toPublicState(room) });
}

function sendYou(p: RoulettePlayer): void {
  rouletteHub.sendToPlayer(p.id, { type: 'you', balance: p.balance, bets: myBets(p) });
}

function schedule(ms: number, fn: () => void): void {
  if (room.timer) clearTimeout(room.timer);
  room.timer = setTimeout(fn, ms);
}

// —— The round loop: BETTING → SPINNING → PAYOUT → next BETTING. ——

function startBetting(): void {
  room.roundId = randomUUID();
  room.phase = 'BETTING';
  room.winningIndex = null;
  room.endsAt = Date.now() + ROULETTE.bettingMs;
  for (const p of room.players.values()) p.bets.clear();
  broadcastState();
  for (const p of room.players.values()) sendYou(p);
  schedule(ROULETTE.bettingMs, spin);
}

function spin(): void {
  room.phase = 'SPINNING';
  room.winningIndex = pickPocketIndex(rng, POCKET_COUNT);
  room.endsAt = Date.now() + ROULETTE.spinningMs;
  broadcastState();
  rouletteHub.broadcast({ type: 'spin', roundId: room.roundId, winningIndex: room.winningIndex });
  schedule(ROULETTE.spinningMs, payout);
}

function payout(): void {
  room.phase = 'PAYOUT';
  const winningIndex = room.winningIndex ?? 0;
  const winning = pocketByIndex(winningIndex);
  for (const p of room.players.values()) {
    let returned = 0;
    for (const [spot, amount] of p.bets) {
      const bet = betFromSpot(spot);
      if (bet) returned += resolveBet(bet, amount, winning);
    }
    p.balance += returned;
    rouletteHub.sendToPlayer(p.id, {
      type: 'result',
      roundId: room.roundId,
      winningIndex,
      payout: returned,
      balance: p.balance,
    });
    p.bets.clear();
    sendYou(p);
  }
  room.history = [winningIndex, ...room.history].slice(0, ROULETTE.historyLen);
  room.endsAt = Date.now() + ROULETTE.payoutMs;
  broadcastState();
  schedule(ROULETTE.payoutMs, () => {
    if (anyConnected(room)) startBetting();
    else stopLoop();
  });
}

function stopLoop(): void {
  room.running = false;
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }
}

function ensureRunning(): void {
  if (room.running) return;
  room.running = true;
  startBetting();
}

// —— Player actions ——

export function join(
  connectionId: string,
  id: string,
  name: string,
  avatar: string | undefined,
): void {
  let p = room.players.get(id);
  if (!p) {
    p = {
      id,
      name,
      avatar,
      balance: ROULETTE.startingBalance,
      conns: new Set(),
      bets: new Map(),
    };
    room.players.set(id, p);
  } else {
    p.name = name;
    if (avatar) p.avatar = avatar;
  }
  p.conns.add(connectionId);
  rouletteHub.bind(connectionId, id);
  ensureRunning();
  rouletteHub.send(connectionId, { type: 'state', state: toPublicState(room) });
  sendYou(p);
  broadcastState();
}

export function placeBet(playerId: string, spot: string, amount: number): void {
  const p = room.players.get(playerId);
  if (!p) return;
  if (room.phase !== 'BETTING') {
    rouletteHub.sendToPlayer(playerId, { type: 'error', message: 'Apuestas cerradas' });
    return;
  }
  if (!betFromSpot(spot)) return;
  const amt = Math.floor(amount);
  if (!Number.isFinite(amt) || amt <= 0) return;
  if (amt > p.balance) {
    rouletteHub.sendToPlayer(playerId, { type: 'error', message: 'Saldo insuficiente' });
    return;
  }
  p.balance -= amt;
  p.bets.set(spot, (p.bets.get(spot) ?? 0) + amt);
  sendYou(p);
  broadcastState();
}

export function clearBets(playerId: string): void {
  const p = room.players.get(playerId);
  if (!p || room.phase !== 'BETTING') return;
  p.balance += roundStaked(p);
  p.bets.clear();
  sendYou(p);
  broadcastState();
}

export function topUp(playerId: string): void {
  const p = room.players.get(playerId);
  if (!p) return;
  // Only a genuinely broke player may refill — no topping up a healthy stack.
  if (p.balance >= ROULETTE.minBet) return;
  p.balance = ROULETTE.startingBalance;
  sendYou(p);
  broadcastState();
}

export function onDisconnect(connectionId: string, playerId: string | null): void {
  if (playerId) {
    const p = room.players.get(playerId);
    if (p) p.conns.delete(connectionId);
  }
  if (!anyConnected(room)) stopLoop();
  else broadcastState();
}
