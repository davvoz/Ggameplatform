import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    INJURY_SECONDS, evolveBlocker, fittingItems, heroStatus, masteryOf, statsOf, trainBlocker, tripProgress, tripSeconds, withGear,
} from '../js/core/heroes.js';

const table = { items: { trail_boots: { levels: [6, 12, 18, 24, 30] } } };
const base = { hp: 2000, damage: 45, speed: 1.2, range: 0.9, cooldown: 1, nova_damage: 0, nova_radius: 0, taunt_radius: 4, splash_radius: 0, tower_bonus: 1 };
const bastion2 = { ...base, hp: 2750, damage: 50, taunt_radius: 5.5 };
const HERO_TABLE = {
    tier_xp: { 2: 150, 3: 600 },
    forms: { guardian: ['bastion', 'warlord'] },
    stats: { guardian: { base, bastion: { 2: bastion2, 3: { ...bastion2, hp: 3600 } } } },
    costs: { guardian: { 2: { cost: { scrap: 300 }, seconds: 7200 }, 3: { cost: { scrap: 750 }, seconds: 14400 } } },
};
const ITEM_TABLE = {
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

test('a trip bar fills from start to return', () => {
    const trip = { started_at: 1000, ready_at: 2000 };
    assert.equal(tripProgress(trip, 900), 0);
    assert.equal(tripProgress(trip, 1250), 0.25);
    assert.equal(tripProgress(trip, 5000), 1);
});

test('the Trail Boots shorten a mission', () => {
    assert.equal(tripSeconds(3600, null, table), 3600);
    assert.equal(tripSeconds(3600, { spell: { type: 'trail_boots', level: 2 } }, table), 3168);
});

test('stats come from the table by form and tier', () => {
    assert.equal(statsOf(HERO_TABLE, 'guardian').hp, 2000);
    assert.equal(statsOf(HERO_TABLE, 'guardian', 'bastion', 2).hp, 2750);
    assert.equal(statsOf(HERO_TABLE, 'guardian', 'bastion', 1).hp, 2000);
});

test('why a hero cannot evolve yet', () => {
    const ctx = { table: HERO_TABLE, materials: { scrap: 1000 }, freeSlots: 1, serverNow: 1000 };
    assert.match(evolveBlocker({ ...ctx, hero: { cls: 'guardian', xp: 100 } }), /50 more/);
    assert.equal(evolveBlocker({ ...ctx, hero: { cls: 'guardian', xp: 150 } }), null);
    assert.equal(evolveBlocker({ ...ctx, freeSlots: 0, hero: { cls: 'guardian', xp: 150 } }), 'All forge slots are busy');
    assert.equal(evolveBlocker({ ...ctx, materials: {}, hero: { cls: 'guardian', xp: 150 } }), 'Not enough materials');
    assert.equal(evolveBlocker({ ...ctx, hero: { cls: 'guardian', xp: 150, injured_until: 2000 } }), 'Hurt: wait until healed');
    assert.equal(evolveBlocker({ ...ctx, hero: { cls: 'guardian', xp: 900, tier: 3, form: 'bastion' } }), 'Fully ascended');
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

test('a weapon fits only its class, a spell fits anyone', () => {
    assert.deepEqual(fittingItems(ITEMS, ITEM_TABLE, 'guardian', 'weapon').map((i) => i.id), [1]);
    assert.deepEqual(fittingItems(ITEMS, ITEM_TABLE, 'technomancer', 'weapon'), []);
    assert.deepEqual(fittingItems(ITEMS, ITEM_TABLE, 'technomancer', 'spell').map((i) => i.id), [3]);
});

test('evolution previews keep what the gear adds', () => {
    const base = { hp: 2000, damage: 45, range: 0.9 };
    const shown = { hp: 2000, damage: 50, range: 1.2 };
    const next = withGear({ hp: 2750, damage: 50, range: 0.9 }, base, shown);
    assert.deepEqual(next, { hp: 2750, damage: 56, range: 1.2 });
});

test('a hero at the forge, hurt or rested cannot train', () => {
    const training = { sessions: 3, left: 2, maxXp: 15 };
    assert.equal(trainBlocker({ cls: 'guardian' }, training, 1000), null);
    assert.match(trainBlocker({ cls: 'guardian', evolving: 3 }, training, 1000), /forge/);
    assert.match(trainBlocker({ cls: 'guardian', injured_until: 2000 }, training, 1000), /Hurt/);
    assert.match(trainBlocker({ cls: 'guardian' }, { ...training, left: 0 }, 1000), /tomorrow/);
});

test('mastery: a level every 100 points, its bonus, the bar inside the level, a top', () => {
    const t = { perLevel: 100, levels: 10, bonus: 0.01 };
    assert.deepEqual(masteryOf(0, t), { level: 0, maxed: false, into: 0, pct: 0 });
    assert.deepEqual(masteryOf(362, t), { level: 3, maxed: false, into: 62, pct: 3 });
    assert.deepEqual(masteryOf(1000, t), { level: 10, maxed: true, into: 100, pct: 10 });
});
