import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatHeal, heroNames } from '../js/ui/heroTiles.js';
import { INJURY_SECONDS, heroStatus } from '../js/core/heroes.js';

test('heroes of the same class are numbered in forging order', () => {
    const names = heroNames([
        { id: 1, cls: 'guardian' }, { id: 2, cls: 'neon_blade' }, { id: 3, cls: 'neon_blade' }, { id: 4, cls: 'technomancer' },
    ]);
    assert.equal(names.get(2), 'Blade 1');
    assert.equal(names.get(3), 'Blade 2');
    assert.equal(names.get(1), 'Guardian 1');
});

test('a hurt hero shows the time left and how far it has healed', () => {
    const status = heroStatus({ id: 1, cls: 'neon_blade', injured_until: 1000 + INJURY_SECONDS / 4 }, false, 1000);
    assert.equal(status.state, 'hurt');
    assert.equal(status.left, INJURY_SECONDS / 4);
    assert.equal(status.healed, 0.75);
});

test('a healed hero is ready, or in the squad when picked', () => {
    assert.equal(heroStatus({ id: 1, cls: 'guardian', injured_until: 900 }, false, 1000).state, 'ready');
    assert.equal(heroStatus({ id: 1, cls: 'guardian' }, true, 1000).state, 'picked');
});

test('heal time reads as minutes and seconds', () => {
    assert.equal(formatHeal(136), '2:16');
    assert.equal(formatHeal(0.2), '0:01');
});
