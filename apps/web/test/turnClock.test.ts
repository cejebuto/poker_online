import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isTurnDanger, turnClock, TURN_DANGER_RATIO } from '../src/features/turnClock.js';

const START = 1_000_000;

describe('turnClock', () => {
  it('reports no clock when the room has no timer', () => {
    assert.equal(turnClock({ now: START, startedAt: START, timeoutMs: 0 }), null);
    assert.equal(turnClock({ now: START, startedAt: START }), null);
    assert.equal(turnClock({ now: START, timeoutMs: 30_000 }), null);
  });

  it('is fresh the instant the turn starts', () => {
    const clock = turnClock({ now: START, startedAt: START, timeoutMs: 30_000 })!;
    assert.equal(clock.remainingMs, 30_000);
    assert.equal(clock.spent, 0);
    assert.equal(clock.inBank, false);
    assert.equal(clock.expired, false);
  });

  it('counts the time bank as part of the total', () => {
    const clock = turnClock({
      now: START,
      startedAt: START,
      timeoutMs: 30_000,
      bankMs: 15_000,
    })!;
    assert.equal(clock.totalMs, 45_000);
    assert.equal(clock.remainingMs, 45_000);
  });

  it('flags the bank once the base timeout is gone', () => {
    const clock = turnClock({
      now: START + 31_000,
      startedAt: START,
      timeoutMs: 30_000,
      bankMs: 15_000,
    })!;
    assert.equal(clock.inBank, true);
    assert.equal(clock.remainingMs, 14_000);
    assert.equal(clock.expired, false);
  });

  it('never goes negative once the clock is out', () => {
    const clock = turnClock({
      now: START + 90_000,
      startedAt: START,
      timeoutMs: 30_000,
    })!;
    assert.equal(clock.remainingMs, 0);
    assert.equal(clock.spent, 1);
    assert.equal(clock.expired, true);
  });

  it('survives a clock that started in the future', () => {
    const clock = turnClock({ now: START - 5_000, startedAt: START, timeoutMs: 30_000 })!;
    assert.equal(clock.elapsedMs, 0);
    assert.equal(clock.remainingMs, 30_000);
  });
});

describe('isTurnDanger', () => {
  const at = (elapsed: number) =>
    turnClock({ now: START + elapsed, startedAt: START, timeoutMs: 20_000 })!;

  it('stays calm early in the turn', () => {
    assert.equal(isTurnDanger(at(0)), false);
    assert.equal(isTurnDanger(at(10_000)), false);
  });

  it('fires on the last quarter of the clock', () => {
    assert.equal(isTurnDanger(at(20_000 * (1 - TURN_DANGER_RATIO))), true);
    assert.equal(isTurnDanger(at(19_000)), true);
  });
});
