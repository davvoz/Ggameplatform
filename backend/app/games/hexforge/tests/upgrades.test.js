import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statsAt, upgradeBlocker } from '../js/core/upgrades.js';

const table = { stats: { 1: { hp: 950, damage: 70 }, 3: { sniper: { hp: 1140, damage: 94 }, gatling: { hp: 1140, damage: 84 } } } };

test('stats by level, and by path from level 3', () => {
    assert.equal(statsAt(table, 1, null).hp, 950);
    assert.equal(statsAt(table, 3, 'sniper').damage, 94);
});

test('the Core leads, then the forge and the materials', () => {
    const base = { type: 'rune_tower', level: 1, coreLevel: 1, maxLevel: 5, cost: { scrap: 10 }, materials: { scrap: 50 }, freeSlots: 1 };
    assert.match(upgradeBlocker(base), /Core/);
    assert.equal(upgradeBlocker({ ...base, coreLevel: 2 }), null);
    assert.match(upgradeBlocker({ ...base, coreLevel: 2, freeSlots: 0 }), /full/);
    assert.match(upgradeBlocker({ ...base, coreLevel: 2, materials: {} }), /materials/);
    assert.equal(upgradeBlocker({ ...base, type: 'core' }), null);
});
