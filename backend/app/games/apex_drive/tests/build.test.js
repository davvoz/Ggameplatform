import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODS } from '../js/config/Mods.js';
import { BASE_STATS, PARTS } from '../js/config/Parts.js';
import { PHYSICS } from '../js/config/Tuning.js';
import { applyEffect, computeStats, ratings, toKmh, topSpeed } from '../js/sim/Build.js';
import { CATALOG } from '../js/sim/Career.js';

test('effects multiply then add', () => {
    const stats = applyEffect({ a: 10, b: 1 }, { mul: { a: 2 }, add: { a: 1, b: 2 } });
    assert.deepEqual(stats, { a: 21, b: 3 });
});

test('the stock build is the base car', () => {
    assert.deepEqual(computeStats({ parts: {}, mods: [] }, CATALOG), BASE_STATS);
});

test('every tier of every part makes the car better at what it is for', () => {
    const base = computeStats({ parts: {}, mods: [] }, CATALOG);
    const engine = computeStats({ parts: { engine: 3 }, mods: [] }, CATALOG);
    assert.ok(topSpeed(engine) > topSpeed(base));
    const tires = computeStats({ parts: { tires: 3 }, mods: [] }, CATALOG);
    assert.ok(tires.grip > base.grip);
    const bay = computeStats({ parts: { chassis: 3 }, mods: [] }, CATALOG);
    assert.equal(bay.slots, base.slots + 3);
    for (const [key, part] of Object.entries(PARTS)) {
        assert.equal(part.tiers[0].price, 0, `${key} starts free`);
        part.tiers.slice(1).forEach((tier, i) => assert.ok(tier.price > part.tiers[i].price, `${key} prices grow`));
    }
});

test('mods trade: the injector gives nitro power for a charge', () => {
    const base = computeStats({ parts: {}, mods: [] }, CATALOG);
    const injected = computeStats({ parts: {}, mods: ['injector'] }, CATALOG);
    assert.ok(injected.nitroPower > base.nitroPower);
    assert.equal(injected.nitroCharges, base.nitroCharges - 1);
    for (const [id, mod] of Object.entries(MODS)) {
        assert.ok(mod.energy >= 1 && mod.price > 0 && mod.lines.length > 0, id);
        for (const key of [...Object.keys(mod.effect.mul ?? {}), ...Object.keys(mod.effect.add ?? {})]) {
            assert.ok(key in BASE_STATS, `${id} changes an unknown stat ${key}`);
        }
    }
});

test('ratings stay within their bars, for the stock car and the best one', () => {
    const best = computeStats({ parts: Object.fromEntries(Object.keys(PARTS).map((k) => [k, 3])), mods: [] }, CATALOG);
    for (const stats of [BASE_STATS, best]) {
        for (const rating of ratings(stats)) assert.ok(rating.fill >= 0 && rating.fill <= 1, `${rating.key} ${rating.fill}`);
    }
    assert.ok(toKmh(topSpeed(BASE_STATS)) > 240 && toKmh(topSpeed(best)) < 340);
});

test('no build carries more than the nitro limit', () => {
    const loaded = computeStats({ parts: { nitro: 3 }, mods: ['extraTank'] }, CATALOG);
    assert.equal(loaded.nitroCharges, PHYSICS.maxNitro);
});
