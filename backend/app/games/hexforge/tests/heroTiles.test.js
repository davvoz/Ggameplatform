import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evolveReady, heroStatus } from '../js/core/heroes.js';
import { formatAway, formatHeal, heroNames, stars } from '../js/ui/heroTiles.js';
import { isAvailable } from '../js/core/squad.js';

const base = { hp: 2000, damage: 45, speed: 1.2, range: 0.9, cooldown: 1, nova_damage: 0, nova_radius: 0, taunt_radius: 4, splash_radius: 0, tower_bonus: 1 };
const bastion2 = { ...base, hp: 2750, damage: 50, taunt_radius: 5.5 };
const TABLE = {
    tier_xp: { 2: 150, 3: 600 },
    forms: { guardian: ['bastion', 'warlord'] },
    stats: { guardian: { base, bastion: { 2: bastion2, 3: { ...bastion2, hp: 3600 } } } },
    costs: { guardian: { 2: { cost: { scrap: 300 }, seconds: 7200 }, 3: { cost: { scrap: 750 }, seconds: 14400 } } },
};

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

test('a hero at the forge is neither ready to evolve nor available for a squad', () => {
    const evolving = { id: 1, cls: 'guardian', xp: 200, evolving: 5 };
    assert.equal(evolveReady(evolving, TABLE.tier_xp), false);
    assert.equal(evolveReady({ ...evolving, evolving: undefined }, TABLE.tier_xp), true);
    assert.equal(evolveReady({ id: 1, cls: 'guardian', xp: 590, tier: 2 }, TABLE.tier_xp), false);
    assert.equal(heroStatus(evolving, false, 0).state, 'forge');
    assert.equal(isAvailable(evolving, 0), false);
    assert.equal(stars(3), '★★★');
});

test('heroes of the same class are numbered in forging order', () => {
    const names = heroNames([
        { id: 1, cls: 'guardian' }, { id: 2, cls: 'neon_blade' }, { id: 3, cls: 'neon_blade' }, { id: 4, cls: 'technomancer' },
    ]);
    assert.equal(names.get(2), 'Blade 1');
    assert.equal(names.get(3), 'Blade 2');
    assert.equal(names.get(1), 'Guardian 1');
});

test('heal time reads as minutes and seconds', () => {
    assert.equal(formatHeal(136), '2:16');
    assert.equal(formatHeal(0.2), '0:01');
});
