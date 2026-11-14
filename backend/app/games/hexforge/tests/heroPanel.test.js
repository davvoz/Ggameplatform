import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatStat, giftText, shownStats, statChanges } from '../js/ui/panels/heroPanel.js';

const base = { hp: 2000, damage: 45, speed: 1.2, range: 0.9, cooldown: 1, nova_damage: 0, nova_radius: 0, taunt_radius: 4, splash_radius: 0, tower_bonus: 1 };
const bastion2 = { ...base, hp: 2750, damage: 50, taunt_radius: 5.5 };

test('what a dismissed hero leaves, in words', () => {
    assert.equal(giftText({ golden_hourglass: 2, flask: 1 }), 'Golden hourglass ×2 · Energy flask');
});

test('only the stats that move are listed as changes, formatted', () => {
    const changes = statChanges(base, bastion2);
    assert.deepEqual(changes.map((c) => c.key), ['hp', 'damage', 'taunt_radius']);
    assert.equal(changes[2].to, '5.5 cells');
    assert.equal(formatStat('tower_bonus', 1.5), '×1.5');
    assert.equal(formatStat('cooldown', 0.8), '0.8 s');
});

test('each class shows its own special stat, plus what its form adds', () => {
    assert.deepEqual(shownStats('guardian', base), ['hp', 'damage', 'speed', 'range', 'taunt_radius']);
    assert.ok(shownStats('guardian', { ...base, splash_radius: 1.2 }).includes('splash_radius'));
    assert.ok(shownStats('neon_blade', { ...base, tower_bonus: 1.5 }).includes('tower_bonus'));
});

test('a shield and healing show among the stats only when there are some', () => {
    const base = { hp: 800, damage: 50, speed: 1.3, range: 3.5, nova_damage: 160, barrier: 0, regen: 0, tower_bonus: 1, splash_radius: 0 };
    assert.ok(!shownStats('technomancer', base).includes('barrier'));
    assert.ok(shownStats('technomancer', { ...base, barrier: 64, regen: 2.4 }).includes('regen'));
});
