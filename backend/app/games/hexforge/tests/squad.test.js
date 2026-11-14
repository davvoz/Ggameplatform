import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frontierOf, isAvailable, launchBlocker, settleSquad, toggleHero } from '../js/core/squad.js';

const NOW = 1000;
const heroes = [
    { id: 1, cls: 'guardian' },
    { id: 2, cls: 'neon_blade', injured_until: NOW + 60 },
    { id: 3, cls: 'neon_blade' },
    { id: 4, cls: 'technomancer', injured_until: NOW - 1 },
    { id: 5, cls: 'guardian' },
    { id: 6, cls: 'technomancer' },
];

test('an injured hero is unavailable until healed', () => {
    assert.equal(isAvailable(heroes[1], NOW), false);
    assert.equal(isAvailable(heroes[1], NOW + 60), true);
    assert.equal(isAvailable(heroes[3], NOW), true);
});

test('picking toggles and stops at four', () => {
    assert.deepEqual(toggleHero([1, 3], 5), [1, 3, 5]);
    assert.deepEqual(toggleHero([1, 3, 5], 3), [1, 5]);
    assert.deepEqual(toggleHero([1, 3, 5, 6], 4), [1, 3, 5, 6]);
});

test('the squad drops injured picks and fills up with fit heroes', () => {
    assert.deepEqual(settleSquad([2, 6], heroes, NOW), [6, 1, 3, 4]);
    assert.deepEqual(settleSquad([], heroes.slice(0, 2), NOW), [1]);
});

test('launch explains what is missing', () => {
    const open = null;
    const full = [1, 3, 5, 6];
    assert.equal(launchBlocker({ blocked: 'Find a rival first', picked: full, energy: { charges: 5 } }), 'Find a rival first');
    assert.equal(launchBlocker({ blocked: open, picked: [1, 3], energy: { charges: 5 } }), 'Pick 2 more heroes');
    assert.equal(launchBlocker({ blocked: open, picked: [1, 3, 5], energy: { charges: 5 } }), 'Pick 1 more hero');
    assert.equal(launchBlocker({ blocked: open, picked: full, energy: { charges: 0 } }), 'No energy left');
    assert.equal(launchBlocker({ blocked: open, picked: full, energy: { charges: 1 } }), null);
});

test('the plan opens on the first outpost still to take', () => {
    const world = [
        { id: 6, unlocked: true, cleared: true },
        { id: 7, unlocked: true, cleared: false },
        { id: 8, unlocked: false, cleared: false },
    ];
    assert.equal(frontierOf(world), 7);
    assert.equal(frontierOf(world.map((o) => ({ ...o, unlocked: true, cleared: true }))), 8);
});
