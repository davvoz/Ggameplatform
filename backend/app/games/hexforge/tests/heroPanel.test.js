import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evolveBlocker, formatStat, shownStats, statChanges, statsOf } from '../js/heroPanel.js';
import { evolveReady, heroStatus, stars } from '../js/heroTiles.js';
import { isAvailable } from '../js/squad.js';

const base = { hp: 2000, damage: 45, speed: 1.2, range: 0.9, cooldown: 1, nova_damage: 0, nova_radius: 0, taunt_radius: 4, splash_radius: 0, tower_bonus: 1 };
const bastion2 = { ...base, hp: 2750, damage: 50, taunt_radius: 5.5 };
const TABLE = {
    tier_xp: { 2: 150, 3: 600 },
    forms: { guardian: ['bastion', 'warlord'] },
    stats: { guardian: { base, bastion: { 2: bastion2, 3: { ...bastion2, hp: 3600 } } } },
    costs: { guardian: { 2: { cost: { scrap: 300 }, seconds: 7200 }, 3: { cost: { scrap: 750 }, seconds: 14400 } } },
};

test('stats come from the table by form and tier', () => {
    assert.equal(statsOf(TABLE, 'guardian').hp, 2000);
    assert.equal(statsOf(TABLE, 'guardian', 'bastion', 2).hp, 2750);
    assert.equal(statsOf(TABLE, 'guardian', 'bastion', 1).hp, 2000);
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

test('why a hero cannot evolve yet', () => {
    const ctx = { table: TABLE, materials: { scrap: 1000 }, freeSlots: 1, serverNow: 1000 };
    assert.match(evolveBlocker({ ...ctx, hero: { cls: 'guardian', xp: 100 } }), /50 more/);
    assert.equal(evolveBlocker({ ...ctx, hero: { cls: 'guardian', xp: 150 } }), null);
    assert.equal(evolveBlocker({ ...ctx, freeSlots: 0, hero: { cls: 'guardian', xp: 150 } }), 'Both forge slots are busy');
    assert.equal(evolveBlocker({ ...ctx, materials: {}, hero: { cls: 'guardian', xp: 150 } }), 'Not enough materials');
    assert.equal(evolveBlocker({ ...ctx, hero: { cls: 'guardian', xp: 150, injured_until: 2000 } }), 'Hurt: wait until healed');
    assert.equal(evolveBlocker({ ...ctx, hero: { cls: 'guardian', xp: 900, tier: 3, form: 'bastion' } }), 'Fully ascended');
});

test('a hero at the forge is neither ready to evolve nor available for a squad', () => {
    const evolving = { id: 1, cls: 'guardian', xp: 200, evolving: 5 };
    assert.equal(evolveReady(evolving, TABLE.tier_xp), false);
    assert.equal(evolveReady({ ...evolving, evolving: undefined }, TABLE.tier_xp), true);
    assert.equal(evolveReady({ id: 1, cls: 'guardian', xp: 590, tier: 2 }, TABLE.tier_xp), false);
    assert.equal(heroStatus(evolving, false, 0).state, 'forge');
    assert.equal(isAvailable(evolving, 0), false);
    assert.equal(stars(3), '★★★');
});
