import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRIVERS } from '../js/config/Drivers.js';
import { Rng } from '../js/core/Rng.js';
import { BEHAVIOURS, createBrain } from '../js/sim/ai/behaviours.js';
import { safeRatio } from '../js/sim/ai/driving.js';
import { racingRace } from './support/race.js';

/** A rival and the player side by side, on a straight, everybody else far away. */
function sideBySide(kind, gap) {
    const race = racingRace();
    const rival = race.racers.find((r) => !r.isPlayer);
    rival.brain = createBrain(kind, new Rng(3));
    for (const other of race.racers.filter((r) => !r.isPlayer && r !== rival)) other.car.z = -90000;
    Object.assign(rival.car, { z: 2000, x: -0.5, speed: 6000 });
    Object.assign(race.player.car, { z: 2000 + gap, x: 0.5, speed: 6000 });
    return { race, rival };
}

test('every driver has a behaviour that exists', () => {
    for (const driver of DRIVERS) assert.ok(driver.behaviour in BEHAVIOURS, driver.id);
    assert.throws(() => createBrain('nope', new Rng(1)));
});

test('the safe speed falls as the bend sharpens and rises with grip', () => {
    assert.equal(safeRatio(0, 1), Infinity);
    assert.ok(safeRatio(10, 1) < safeRatio(5, 1));
    assert.ok(safeRatio(10, 1.4) > safeRatio(10, 1));
});

test('the rammer steers into the player alongside', () => {
    const { race, rival } = sideBySide('rammer', 0);
    assert.ok(rival.brain.read(rival, race).steer > 0.5);
});

test('the blocker moves into the line of the player close behind', () => {
    const { race, rival } = sideBySide('blocker', -1500);
    assert.ok(rival.brain.read(rival, race).steer > 0.5);
    race.player.car.z = 2000 + 20000;
    const racer = createBrain('racer', new Rng(3));
    assert.equal(rival.brain.read(rival, race).steer, racer.read(rival, race).steer, 'nobody to block: it races');
});

test('the cruiser keeps one lane of its own, all race long', () => {
    const { race, rival } = sideBySide('cruiser', 30000);
    const cruiser = BEHAVIOURS.cruiser(new Rng(3));
    const lane = cruiser.aim(rival, race).x;
    assert.ok([-0.5, 0, 0.5].includes(lane));
    race.time = 100;
    rival.car.z = 90000;
    assert.equal(cruiser.aim(rival, race).x, lane);
});

test('a racer lifts before a bend too sharp for its speed', () => {
    const race = racingRace();
    const rival = race.racers.find((r) => !r.isPlayer);
    rival.brain = createBrain('racer', new Rng(1));
    const sharp = race.track.segments.reduce((best, s) => (Math.abs(s.curve) > Math.abs(best.curve) ? s : best));
    Object.assign(rival.car, { z: sharp.index * race.track.segmentLength - 2500, x: 0, speed: 11500 });
    const input = rival.brain.read(rival, race);
    assert.equal(input.throttle, false);
});

test('the blocker reacts to the mirror: it goes where the player was a moment ago, not where the player is', () => {
    const { race, rival } = sideBySide('blocker', -1500);
    rival.brain.read(rival, race);
    // the player feints to the other side: for a moment the blocker still steers to the old line
    race.player.car.x = -0.9;
    race.time += 0.2;
    assert.ok(rival.brain.read(rival, race).steer > 0.5, 'still going right');
    race.time += 1;
    rival.brain.read(rival, race);
    assert.ok(rival.brain.read(rival, race).steer < 0, 'now it follows');
});

test('the blocker tires: it blocks a few seconds, then races its own line for a while', () => {
    const { race, rival } = sideBySide('blocker', -1500);
    const racer = createBrain('racer', new Rng(3));
    const ownLine = () => racer.read(rival, race).steer;
    assert.notEqual(rival.brain.read(rival, race).steer, ownLine());
    for (let t = 0; t < 3; t += 0.1) {
        race.time += 0.1;
        rival.brain.read(rival, race);
    }
    assert.equal(rival.brain.read(rival, race).steer, ownLine(), 'resting');
});

test('a rival a lap down neither blocks nor rams the leader going by', () => {
    for (const kind of ['blocker', 'rammer']) {
        const { race, rival } = sideBySide(kind, kind === 'blocker' ? -1500 : 0);
        rival.car.z -= race.track.length;
        const racer = createBrain('racer', new Rng(3));
        assert.equal(rival.brain.read(rival, race).steer, racer.read(rival, race).steer, kind);
    }
});

test('a faster car gets past the blocker and the rammer in a fair time', async () => {
    const { createRace } = await import('../js/sim/setup.js');
    const { drive } = await import('../js/sim/ai/driving.js');
    const { BODY } = await import('../js/config/Tuning.js');
    const { stockStats } = await import('./support/race.js');
    /** Seconds to get past a rival alone on the road, holding the throttle and aiming beside it (30: never). */
    const passing = (id) => {
        const race = createRace({ trackId: 'neonAvenue', playerStats: stockStats({ parts: { engine: 2, tires: 2, aero: 1 } }), seed: 3 });
        race.skipStart();
        const rival = race.racers.find((r) => r.id === id);
        for (const r of race.racers) if (!r.isPlayer && r !== rival) r.car.z = -200000;
        Object.assign(rival.car, { z: 30000, x: 0, speed: 8000 });
        Object.assign(race.player.car, { z: 29100, x: 0, speed: 8000 });
        const aim = () => ({ x: rival.car.x > 0 ? rival.car.x - 0.7 : rival.car.x + 0.7, pace: 1, nitro: false });
        let t = 0;
        while (t < 30 && race.player.car.z < rival.car.z + BODY.length) {
            race.step({ ...drive(race.player, race, aim()), throttle: true, brake: false }, 1 / 60);
            t += 1 / 60;
        }
        return t;
    };
    assert.ok(passing('brick') < 10, `brick: ${passing('brick').toFixed(1)} s`);
    assert.ok(passing('nyx') < 20, `nyx: ${passing('nyx').toFixed(1)} s`);
});
