import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRIVERS } from '../js/config/Drivers.js';
import { PARTS } from '../js/config/Parts.js';
import { PRIZES, RIVAL_UPGRADES } from '../js/config/Tuning.js';
import { WORLDS } from '../js/config/Worlds.js';
import { topSpeed } from '../js/sim/Build.js';
import { rivalBudget, rivalParts } from '../js/sim/rivals.js';
import { createRace, rivalBuilds } from '../js/sim/setup.js';
import { stockStats } from './support/race.js';

const CAREER = WORLDS.flatMap((world) => world.tracks);

test("the rivals' budget starts at nothing and grows with every track of the career", () => {
    const budgets = CAREER.map((id) => rivalBudget(id, WORLDS, PRIZES, RIVAL_UPGRADES));
    assert.equal(budgets[0], 0);
    budgets.slice(1).forEach((budget, i) => assert.ok(budget > budgets[i], `${CAREER[i + 1]}: ${budget}`));
    // the prizes of the place named, x the share, x each world's prize scale
    assert.equal(budgets[1], Math.round(PRIZES[RIVAL_UPGRADES.place - 1] * WORLDS[0].prizeScale * RIVAL_UPGRADES.share));
    assert.throws(() => rivalBudget('nowhere', WORLDS, PRIZES, RIVAL_UPGRADES), /nowhere/);
});

test('a rival buys tier after tier in its order of taste, within its budget', () => {
    const cost = (owned) => Object.entries(owned).reduce((sum, [category, tier]) => {
        for (let t = 1; t <= tier; t++) sum += PARTS[category].tiers[t].price;
        return sum;
    }, 0);
    assert.deepEqual(rivalParts(['armor', 'engine'], 0, PARTS), {});
    // armor first (its taste), then the engine
    assert.deepEqual(rivalParts(['armor', 'engine'], PARTS.armor.tiers[1].price, PARTS), { armor: 1 });
    for (const budget of [500, 2500, 9000, 40000]) {
        for (const driver of DRIVERS) {
            const owned = rivalParts(driver.buys, budget, PARTS);
            assert.ok(cost(owned) <= budget, `${driver.id} spent too much`);
            for (const category of Object.keys(owned)) assert.ok(driver.buys.includes(category));
        }
    }
    // with money to spare everything ends at the top tier
    const rich = rivalParts(['engine'], 1e9, PARTS);
    assert.equal(rich.engine, PARTS.engine.tiers.length - 1);
});

test('later in the career the rivals race in faster cars; on the first track they are stock', () => {
    const first = rivalBuilds(CAREER[0]);
    for (const parts of first.values()) assert.deepEqual(parts, {});
    const fastest = (trackId) => {
        const race = createRace({ trackId, playerStats: stockStats() });
        return Math.max(...race.racers.filter((r) => !r.isPlayer).map((r) => topSpeed(r.car.stats)));
    };
    assert.ok(fastest(CAREER.at(-1)) > fastest(CAREER[0]) * 1.05);
    // every rival has bought something by the last track, each to its own taste
    const last = rivalBuilds(CAREER.at(-1));
    for (const driver of DRIVERS) assert.ok(Object.keys(last.get(driver.id)).length > 0, driver.id);
    assert.ok(new Set([...last.values()].map((parts) => JSON.stringify(parts))).size > 1, 'all alike');
});

test('every rival names a list of part categories that exist', () => {
    for (const driver of DRIVERS) {
        assert.ok(driver.buys.length > 0, driver.id);
        for (const category of driver.buys) assert.ok(category in PARTS, `${driver.id}: ${category}`);
    }
});
