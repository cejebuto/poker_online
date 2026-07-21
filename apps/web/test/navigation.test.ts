import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { backFor, needsLeaveConfirm, type Screen } from '../src/features/navigation.js';

const ALL: Screen[] = [
  'user',
  'home',
  'create',
  'join',
  'mesa-join',
  'lobby',
  'play',
  'table',
  'themes',
];

describe('back navigation', () => {
  it('offers no way back from the entry screens', () => {
    assert.equal(backFor('user'), null);
    assert.equal(backFor('home'), null);
  });

  it('never traps the user on any other screen', () => {
    for (const screen of ALL.filter((s) => s !== 'user' && s !== 'home')) {
      assert.ok(backFor(screen), `${screen} must offer a way back`);
    }
  });

  it('returns to home from the entry forms', () => {
    for (const screen of ['create', 'join', 'mesa-join'] as Screen[]) {
      assert.equal(backFor(screen)!.action, 'home');
    }
  });

  it('goes back to the lobby from the play screen without leaving the room', () => {
    assert.equal(backFor('play')!.action, 'lobby');
  });

  it('leaves the room from the lobby and from the mesa view', () => {
    assert.equal(backFor('lobby')!.action, 'leave');
    assert.equal(backFor('table')!.action, 'leave');
  });

  it('returns to the previous screen from the theme settings', () => {
    assert.equal(backFor('themes')!.action, 'themes-return');
  });

  it('labels every action', () => {
    for (const screen of ALL) {
      const back = backFor(screen);
      if (back) assert.ok(back.label.length > 0, `${screen} needs a label`);
    }
  });
});

describe('leave confirmation', () => {
  it('asks before abandoning a seat mid-hand', () => {
    assert.equal(needsLeaveConfirm('IN_HAND'), true);
  });

  it('does not ask between hands or after the game ends', () => {
    assert.equal(needsLeaveConfirm('LOBBY'), false);
    assert.equal(needsLeaveConfirm('FINISHED'), false);
    assert.equal(needsLeaveConfirm(undefined), false);
  });
});
