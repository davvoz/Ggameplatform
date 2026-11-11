import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tripSeconds } from '../js/heroPanel.js';
import { formatAway, heroStatus, tripProgress } from '../js/heroTiles.js';

test('a trip bar fills from start to return', () => {
    const trip = { started_at: 1000, ready_at: 2000 };
    assert.equal(tripProgress(trip, 900), 0);
    assert.equal(tripProgress(trip, 1250), 0.25);
    assert.equal(tripProgress(trip, 5000), 1);
});
import { isAvailable } from '../js/squad.js';

const table = { items: { trail_boots: { levels: [6, 12, 18, 24, 30] } } };

test('the Trail Boots shorten a mission', () => {
    assert.equal(tripSeconds(3600, null, table), 3600);
    assert.equal(tripSeconds(3600, { spell: { type: 'trail_boots', level: 2 } }, table), 3168);
});

test('an Explorer is at home, away or back, and never in a squad', () => {
    const home = { id: 9, cls: 'explorer' };
    assert.equal(heroStatus(home, false, 100).state, 'home');
    const away = { ...home, mission: { kind: 'scout', ready_at: 4000 } };
    assert.equal(heroStatus(away, false, 400).state, 'away');
    assert.equal(heroStatus(away, false, 4000).state, 'back');
    assert.equal(isAvailable(home, 0), false);
    assert.equal(formatAway(3 * 3600 + 20 * 60), '3h 20m');
    assert.equal(formatAway(65), '1:05');
});
