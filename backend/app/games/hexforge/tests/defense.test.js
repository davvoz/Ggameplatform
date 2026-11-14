import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weakestSide } from '../js/core/defense.js';

const sides = (n, e, s, w) => ({
    north: { held: n, total: 36 }, east: { held: e, total: 36 },
    south: { held: s, total: 36 }, west: { held: w, total: 36 },
});

test('the weakest side is the one holding the fewest raids', () => {
    assert.equal(weakestSide(sides(20, 24, 3, 22)), 'south');
    assert.equal(weakestSide(sides(9, 9, 9, 9)), null);
});
