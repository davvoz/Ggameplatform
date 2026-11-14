import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCountdown, formatDuration, itemEffect, itemName, ownedText } from '../js/ui/panels/forgePanel.js';
import { effectText } from '../js/data/labels.js';

const TABLE = {
    max_level: 5,
    limit: 24,
    items: {
        rune_maul: { slot: 'weapon', cls: 'guardian', effect: 'damage_pct', levels: [6, 12, 18, 24, 30] },
        plasma_edge: { slot: 'weapon', cls: 'neon_blade', effect: 'damage_pct', levels: [6, 12, 18, 24, 30] },
        ward_sigil: { slot: 'spell', cls: null, effect: 'barrier_pct', levels: [8, 16, 24, 32, 40] },
    },
};
const ITEMS = [
    { id: 1, type: 'rune_maul', level: 2, hero: null },
    { id: 2, type: 'plasma_edge', level: 1, hero: null },
    { id: 3, type: 'ward_sigil', level: 3, hero: 7 },
];

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

test('items are named for people', () => {
    assert.equal(itemName('frost_tower'), 'Frost Tower');
    assert.equal(itemName('neon_blade'), 'Neon Blade');
});

test('a shared limit shows this kind and the group apart', () => {
    assert.equal(ownedText({ group: 'heroes', mine: 2, owned: 8, limit: 14 }), 'You own 2 · heroes 8/14');
    assert.equal(ownedText({ group: 'mana_well', mine: 1, owned: 1, limit: 2 }), 'You own 1/2');
});

test('an item says what it does at its level', () => {
    assert.equal(itemEffect(TABLE, ITEMS[0]), '+12% damage');
    assert.equal(itemEffect(TABLE, ITEMS[2]), 'shield of 24% health');
    assert.equal(effectText('range', 1.5), '+1.5 reach');
    assert.equal(effectText('haste_pct', 8), 'blows 8% faster');
});
