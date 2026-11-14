import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forgeBlocker, usableBonuses } from '../js/core/forge.js';

test('the forge button explains why it is off', () => {
    const tower = { cost: { rune_stone: 120, scrap: 60 }, owned: 2, limit: 8, yields: 1 };
    const rich = { rune_stone: 500, scrap: 500 };
    assert.equal(forgeBlocker(tower, rich, 1), null);
    assert.equal(forgeBlocker(tower, rich, 0), 'All forge slots are busy');
    assert.equal(forgeBlocker({ ...tower, owned: 8 }, rich, 1), 'Limit reached');
    assert.equal(forgeBlocker(tower, { rune_stone: 119, scrap: 500 }, 1), 'Not enough materials');
    const walls = { cost: { rune_stone: 60 }, owned: 56, limit: 60, yields: 5 };
    assert.equal(forgeBlocker(walls, rich, 1), 'Limit reached');
});

test('only owned bonuses that work on the target are offered, best fit first', () => {
    const owned = { hourglass: 2, salve: 1, flask: 0 };
    assert.deepEqual(usableBonuses('job', owned), ['hourglass']);
    assert.deepEqual(usableBonuses('hero', owned), ['salve', 'hourglass']);
    assert.deepEqual(usableBonuses('energy', owned), ['hourglass']);
    assert.deepEqual(usableBonuses('energy', {}), []);
    assert.deepEqual(usableBonuses('hero', undefined), []);
});
