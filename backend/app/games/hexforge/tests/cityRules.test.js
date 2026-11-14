import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anchorFor, defenseKey, dismissBlocker, estimatePending, placementError } from '../js/core/cityRules.js';

const city = {
    grid: 18,
    buildings: [
        { id: 1, type: 'core', x: 7, y: 7, size: 3 },
        { id: 2, type: 'rune_tower', x: 3, y: 3, size: 2 },
    ],
};
const tower = city.buildings[1];

test('placement mirrors the server rules', () => {
    assert.equal(placementError(city, tower, 1, 1), null);
    assert.equal(placementError(city, tower, 0, 5), 'outside_city');
    assert.equal(placementError(city, tower, 16, 5), 'outside_city');
    assert.equal(placementError(city, tower, 15, 15), null);
    assert.equal(placementError(city, tower, 8, 8), 'occupied');
    assert.equal(placementError(city, tower, 6, 6), 'occupied');
});

test('a building may be dropped where it already stands', () => {
    assert.equal(placementError(city, tower, 3, 3), null);
    assert.equal(placementError(city, tower, 4, 3), null);
});

test('production keeps counting between server updates, up to capacity', () => {
    const production = { per_hour: 60, pending: 10, capacity: 480 };
    assert.equal(estimatePending(production, 0), 10);
    assert.equal(estimatePending(production, 120), 12);
    assert.equal(estimatePending(production, 99 * 3600), 480);
});

test('a building is centred under the pointer', () => {
    assert.deepEqual(anchorFor(2, 5.2, 5.9), { x: 4, y: 5 });
    assert.deepEqual(anchorFor(1, 5.2, 5.9), { x: 5, y: 5 });
});

test('a hero at the forge, on a mission or needed for the squad cannot be dismissed', () => {
    const fighters = (n) => Array.from({ length: n }, (_, i) => ({ id: i, cls: 'guardian' }));
    assert.match(dismissBlocker({ evolving: true, cls: 'guardian' }, fighters(6)), /forge/);
    assert.match(dismissBlocker({ mission: {}, cls: 'explorer' }, fighters(6)), /mission/);
    assert.match(dismissBlocker({ cls: 'guardian' }, fighters(4)), /at least 4 fighters/);
    assert.equal(dismissBlocker({ cls: 'guardian' }, fighters(5)), null);
    assert.equal(dismissBlocker({ cls: 'explorer' }, fighters(4)), null);     // explorers never count for the squad
});

test('the defense key changes when a building moves or a tower aims elsewhere, not otherwise', () => {
    const city = { buildings: [{ id: 1, type: 'rune_tower', x: 2, y: 3, aim: 'closest', hp: 900 }] };
    const key = defenseKey(city);
    assert.equal(defenseKey({ buildings: [{ ...city.buildings[0], hp: 100 }] }), key);
    assert.notEqual(defenseKey({ buildings: [{ ...city.buildings[0], x: 4 }] }), key);
    assert.notEqual(defenseKey({ buildings: [{ ...city.buildings[0], aim: 'strongest' }] }), key);
});
