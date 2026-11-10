import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forgeBlocker, formatCountdown, formatDuration, itemName } from '../js/forgePanel.js';

test('durations read like a person would say them', () => {
    assert.equal(formatDuration(45), '45 s');
    assert.equal(formatDuration(120), '2 min');
    assert.equal(formatDuration(600), '10 min');
    assert.equal(formatDuration(3600), '1 h');
    assert.equal(formatDuration(5400), '1 h 30 min');
});

test('countdowns tick in minutes and seconds, hours when needed', () => {
    assert.equal(formatCountdown(65), '1:05');
    assert.equal(formatCountdown(0.2), '0:01');
    assert.equal(formatCountdown(3725), '1:02:05');
    assert.equal(formatCountdown(-3), '0:00');
});

test('the forge button explains why it is off', () => {
    const tower = { cost: { rune_stone: 120, scrap: 60 }, owned: 2, limit: 8, yields: 1 };
    const rich = { rune_stone: 500, scrap: 500 };
    assert.equal(forgeBlocker(tower, rich, 1), null);
    assert.equal(forgeBlocker(tower, rich, 0), 'Both forge slots are busy');
    assert.equal(forgeBlocker({ ...tower, owned: 8 }, rich, 1), 'Limit reached');
    assert.equal(forgeBlocker(tower, { rune_stone: 119, scrap: 500 }, 1), 'Not enough materials');
    const walls = { cost: { rune_stone: 60 }, owned: 56, limit: 60, yields: 5 };
    assert.equal(forgeBlocker(walls, rich, 1), 'Limit reached');
});

test('items are named for people', () => {
    assert.equal(itemName('frost_tower'), 'Frost Tower');
    assert.equal(itemName('neon_blade'), 'Neon Blade');
});
