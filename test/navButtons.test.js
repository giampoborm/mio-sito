import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickRandomPrimary } from '../src/utils/navButtons.js';

const ALLOWED_COLORS = ['#FF0000', '#FFFF00', '#0000FF', '#FFA500', '#008000'];

test('pickRandomPrimary returns one of the allowed colors', () => {
  for (let i = 0; i < 10; i++) {
    const color = pickRandomPrimary();
    assert.ok(ALLOWED_COLORS.includes(color));
  }
});
