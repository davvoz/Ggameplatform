import { test } from 'node:test';
import assert from 'node:assert/strict';
import { itemEffect } from '../js/ui/panels/forgePanel.js';
import { shownStats } from '../js/ui/panels/heroPanel.js';
import { fittingItems } from '../js/core/heroes.js';
import { effectText } from '../js/data/labels.js';
import { createReplay } from '../js/core/replay.js';

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

test('a weapon fits only its class, a spell fits anyone', () => {
    assert.deepEqual(fittingItems(ITEMS, TABLE, 'guardian', 'weapon').map((i) => i.id), [1]);
    assert.deepEqual(fittingItems(ITEMS, TABLE, 'technomancer', 'weapon'), []);
    assert.deepEqual(fittingItems(ITEMS, TABLE, 'technomancer', 'spell').map((i) => i.id), [3]);
});

test('an item says what it does at its level', () => {
    assert.equal(itemEffect(TABLE, ITEMS[0]), '+12% damage');
    assert.equal(itemEffect(TABLE, ITEMS[2]), 'shield of 24% health');
    assert.equal(effectText('range', 1.5), '+1.5 reach');
    assert.equal(effectText('haste_pct', 8), 'blows 8% faster');
});

test('a shield and healing show among the stats only when there are some', () => {
    const base = { hp: 800, damage: 50, speed: 1.3, range: 3.5, nova_damage: 160, barrier: 0, regen: 0, tower_bonus: 1, splash_radius: 0 };
    assert.ok(!shownStats('technomancer', base).includes('barrier'));
    assert.ok(shownStats('technomancer', { ...base, barrier: 64, regen: 2.4 }).includes('regen'));
});

test('a ward soaks hits in the replay, a mending hero heals from the frames', () => {
    const battle = {
        frame_stride: 2, ticks: 6, tick_rate: 10,
        city: { buildings: [] },
        squad: [
            { id: 0, cls: 'guardian', hp: 100, barrier: 30, items: [{ type: 'ward_sigil', level: 1 }] },
            { id: 1, cls: 'neon_blade', hp: 100, barrier: 0, items: [{ type: 'mending_rune', level: 1 }] },
        ],
        frames: [[[0, 0, 100], [0, 0, 100]], [[0, 0, 100], [0, 0, 80]], [[0, 0, 95], [0, 0, 85]], [[0, 0, 95], [0, 0, 90]]],
        events: [
            { t: 2, type: 'shot', hero: 0, building: 9, dmg: 0, hp: 100, soaked: 20 },
            { t: 2, type: 'shot', hero: 1, building: 9, dmg: 20, hp: 80 },
            { t: 4, type: 'shot', hero: 0, building: 9, dmg: 5, hp: 95, soaked: 10 },
        ],
    };
    const replay = createReplay(battle);
    assert.equal(replay.stateAt(3).heroes[0].shield, 10);
    assert.equal(replay.stateAt(5).heroes[0].shield, 0);
    assert.equal(replay.stateAt(2).heroes[1].hp, 80);
    assert.equal(replay.stateAt(6).heroes[1].hp, 90);
    assert.equal(replay.stateAt(6).heroes[1].mending, true);
});

test('evolution previews keep what the gear adds', async () => {
    const { withGear } = await import('../js/core/heroes.js');
    const base = { hp: 2000, damage: 45, range: 0.9 };
    const shown = { hp: 2000, damage: 50, range: 1.2 };
    const next = withGear({ hp: 2750, damage: 50, range: 0.9 }, base, shown);
    assert.deepEqual(next, { hp: 2750, damage: 56, range: 1.2 });
});
