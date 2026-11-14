import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildingChanges, formatBuildingStat, upgradeBonuses } from '../js/ui/panels/upgradePanel.js';

test('the changes a level brings, in words', () => {
    assert.deepEqual(buildingChanges({ hp: 950, damage: 70 }, { hp: 1045, damage: 70 }).map((c) => c.to), ['1045']);
    assert.equal(formatBuildingStat('cooldown', 0.8), '0.8 s');
    assert.equal(formatBuildingStat('slow', 60), '60%');
});

test('what an upgraded building adds over level 1, in short words', () => {
    const tower = { stats: { 1: { hp: 1000, damage: 70, range: 4.5, cooldown: 1 }, 4: { gatling: { hp: 1300, damage: 91, range: 5.25, cooldown: 0.74 } } } };
    assert.deepEqual(upgradeBonuses(tower, 4, 'gatling'), ['+30% health', '+30% damage', '+0.75 reach', 'shoots 26% faster']);
    const wall = { stats: { 1: { hp: 650 }, 3: { spiked: { hp: 780, thorns: 20 } } } };
    assert.deepEqual(upgradeBonuses(wall, 3, 'spiked'), ['+20% health', '+20 spike damage']);
});
