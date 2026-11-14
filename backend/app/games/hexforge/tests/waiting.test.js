import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anvilStars, markerAt, rateStrike, zones } from '../js/core/minigames/anvil.js';

test('a strike in the middle is perfect, near it good, far off a miss', () => {
    assert.equal(rateStrike(0.5, 0), 'perfect');
    assert.equal(rateStrike(0.62, 0), 'good');
    assert.equal(rateStrike(0.9, 0), 'miss');
});

test('the gold zone narrows with each strike', () => {
    assert.ok(zones(4).perfect < zones(0).perfect);
    assert.ok(zones(4).good < zones(0).good);
});

test('the marker swings back and forth across the bar', () => {
    assert.equal(markerAt(0, 0), 0);
    for (let t = 0; t < 5; t += 0.07) {
        const p = markerAt(t, 2);
        assert.ok(p >= 0 && p <= 1);
    }
});

test('anvil stars: perfect blows count double', () => {
    assert.equal(anvilStars(0, 2), 0);
    assert.equal(anvilStars(1, 1), 1);
    assert.equal(anvilStars(3, 0), 2);
    assert.equal(anvilStars(4, 1), 3);
});
