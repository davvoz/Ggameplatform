import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildingChanges, formatBuildingStat, statsAt, upgradeBlocker, upgradeBonuses } from '../js/ui/panels/upgradePanel.js';

const table = { stats: { 1: { hp: 950, damage: 70 }, 3: { sniper: { hp: 1140, damage: 94 }, gatling: { hp: 1140, damage: 84 } } } };

test('stats by level, and by path from level 3', () => {
    assert.equal(statsAt(table, 1, null).hp, 950);
    assert.equal(statsAt(table, 3, 'sniper').damage, 94);
});

test('the changes a level brings, in words', () => {
    assert.deepEqual(buildingChanges({ hp: 950, damage: 70 }, { hp: 1045, damage: 70 }).map((c) => c.to), ['1045']);
    assert.equal(formatBuildingStat('cooldown', 0.8), '0.8 s');
    assert.equal(formatBuildingStat('slow', 60), '60%');
});

test('the Core leads, then the forge and the materials', () => {
    const base = { type: 'rune_tower', level: 1, coreLevel: 1, maxLevel: 5, cost: { scrap: 10 }, materials: { scrap: 50 }, freeSlots: 1 };
    assert.match(upgradeBlocker(base), /Core/);
    assert.equal(upgradeBlocker({ ...base, coreLevel: 2 }), null);
    assert.match(upgradeBlocker({ ...base, coreLevel: 2, freeSlots: 0 }), /full/);
    assert.match(upgradeBlocker({ ...base, coreLevel: 2, materials: {} }), /materials/);
    assert.equal(upgradeBlocker({ ...base, type: 'core' }), null);
});

test('what an upgraded building adds over level 1, in short words', () => {
    const tower = { stats: { 1: { hp: 1000, damage: 70, range: 4.5, cooldown: 1 }, 4: { gatling: { hp: 1300, damage: 91, range: 5.25, cooldown: 0.74 } } } };
    assert.deepEqual(upgradeBonuses(tower, 4, 'gatling'), ['+30% health', '+30% damage', '+0.75 reach', 'shoots 26% faster']);
    const wall = { stats: { 1: { hp: 650 }, 3: { spiked: { hp: 780, thorns: 20 } } } };
    assert.deepEqual(upgradeBonuses(wall, 3, 'spiked'), ['+20% health', '+20 spike damage']);
});
