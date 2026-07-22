import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_FELT_THEME_ID,
  FELT_THEMES,
  resolveFeltTheme,
} from '../src/features/feltTheme.js';

describe('resolveFeltTheme', () => {
  it('falls back to the classic green when nothing is stored', () => {
    assert.equal(resolveFeltTheme(null).id, DEFAULT_FELT_THEME_ID);
  });

  it('falls back when the stored id is not a theme we ship', () => {
    assert.equal(resolveFeltTheme('neon-purple').id, DEFAULT_FELT_THEME_ID);
    assert.equal(resolveFeltTheme('').id, DEFAULT_FELT_THEME_ID);
  });

  it('returns the stored preset when it is one of ours', () => {
    for (const theme of FELT_THEMES) {
      assert.equal(resolveFeltTheme(theme.id).id, theme.id);
    }
  });
});

describe('FELT_THEMES', () => {
  it('ships more than one option', () => {
    assert.ok(FELT_THEMES.length > 1);
  });

  it('has unique ids', () => {
    const ids = FELT_THEMES.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('gives every preset both gradient stops as hex colors', () => {
    for (const theme of FELT_THEMES) {
      assert.match(theme.green, /^#[0-9a-f]{6}$/i, `${theme.id} green`);
      assert.match(theme.dark, /^#[0-9a-f]{6}$/i, `${theme.id} dark`);
      assert.ok(theme.name.length > 0, `${theme.id} name`);
    }
  });

  it('includes the default id', () => {
    assert.ok(FELT_THEMES.some((t) => t.id === DEFAULT_FELT_THEME_ID));
  });
});
