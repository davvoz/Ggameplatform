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
