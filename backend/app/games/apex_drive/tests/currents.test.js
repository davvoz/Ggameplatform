import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CURRENTS } from '../js/config/Hazards.js';
import { MODS } from '../js/config/Mods.js';
import { PARTS } from '../js/config/Parts.js';
import { TRACKS } from '../js/config/Tracks.js';
import { PHYSICS } from '../js/config/Tuning.js';
import { Car } from '../js/sim/Car.js';
import { CATALOG } from '../js/sim/Career.js';
import { computeStats } from '../js/sim/Build.js';
import { flowOf, pushOf } from '../js/sim/Currents.js';
import { createRace, trackOf } from '../js/sim/setup.js';
import { DT, GAS, IDLE, pilot, stockStats } from './support/race.js';

const CURRENT_TRACKS = Object.keys(TRACKS).filter((id) => TRACKS[id].currents);

/** Drives a car straight for `seconds` in a current; returns it. */
function drift(current, input, { seconds = 2, speed = 6000 } = {}) {
    const car = new Car(stockStats());
    car.speed = speed;
    for (let t = 0; t < seconds; t += DT) car.step(input, { curve: 0, grip: 1, current }, DT);
    return car;
}

test('a current along the road pushes the car on, one against it holds it back, one across drifts it', () => {
    const still = drift(null, IDLE);
    assert.ok(drift({ along: 1, across: 0 }, IDLE).speed > still.speed + CURRENTS.along * 1.5, 'pushed on');
    assert.ok(drift({ along: -1, across: 0 }, IDLE).speed < still.speed - CURRENTS.along * 1.5, 'held back');
    assert.ok(Math.abs(drift({ along: 0, across: 1 }, GAS, { seconds: 0.5 }).x - CURRENTS.across * 0.5) < 0.05, 'drifted right');
    assert.equal(drift({ along: 0, across: 0 }, GAS).speed, drift(null, GAS).speed, 'no current, no change');
});

test('a current against the car holds it back harder than one behind it pushes, as the server bounds only the push', () => {
    assert.equal(pushOf({ along: 1, across: 0 }).along, CURRENTS.along);
    assert.equal(pushOf({ along: -1, across: 0 }).along, -CURRENTS.against);
    assert.ok(CURRENTS.against > CURRENTS.along);
    // a current across at 0.6 drifts the car more than a third of what the wheel moves it: it has to be steered against
    assert.ok(CURRENTS.across * 0.6 > PHYSICS.steer / 3);
});

test('the way a current flows: its strongest push, none when too weak to feel', () => {
    assert.equal(flowOf(undefined), null);
    assert.equal(flowOf({ along: CURRENTS.felt / 2, across: 0 }), null);
    assert.equal(flowOf({ along: 0.8, across: 0.2 }), 'with');
    assert.equal(flowOf({ along: -0.6, across: 0.4 }), 'against');
    assert.equal(flowOf({ along: 0.1, across: 0.6 }), 'right');
    assert.equal(flowOf({ along: 0, across: -0.65 }), 'left');
});

test('the player is told of each current once, as the car enters it', () => {
    const race = createRace({ trackId: 'coralAvenue', playerStats: stockStats(), seed: 1 });
    race.skipStart();
    const flows = [];
    while (race.player.lap < 2) {
        race.step(pilot(race), DT);
        for (const event of race.drain()) if (event.type === 'current') flows.push(event.flow);
    }
    assert.deepEqual(flows, ['with', 'against', 'right']);
});

test('currents ease in and out, and only where a track has them', () => {
    for (const id of CURRENT_TRACKS) {
        const { segments } = trackOf(id);
        const along = segments.map((s) => s.current?.along ?? 0);
        along.forEach((a, i) => assert.ok(Math.abs(a - along[(i + 1) % along.length]) <= (1.5 / CURRENTS.ease) + 1e-9, `${id} at ${i}`));
    }
    assert.ok(trackOf('duskValley').segments.every((s) => s.current === undefined));
});

/** Every build of the garage's best parts with up to three mods: the stats of each. */
function fastBuilds() {
    const parts = Object.fromEntries(Object.entries(PARTS).map(([key, part]) => [key, part.tiers.length - 1]));
    const ids = Object.keys(MODS);
    const sets = [[]];
    for (const a of ids) for (const b of ids) for (const c of ids) if (a <= b && b <= c) sets.push([...new Set([a, b, c])]);
    return sets.map((mods) => computeStats({ parts, mods }, CATALOG));
}

/** The speed the car holds on nitro in the deepest slipstream, with a push along (the server's bound, plus the current). */
function terminal(power, drag, push) {
    let [low, high] = [1, 1e6];
    for (let i = 0; i < 60; i++) {
        const v = (low + high) / 2;
        if (power / v + push > drag * v * v) low = v;
        else high = v;
    }
    return low;
}

test('with the currents behind it, no car can drive a lap the server would refuse as too fast', () => {
    // as apex_drive_be/economy.py speed_bound and rules.py min_lap
    const DRAFT_CAP = 0.9;
    const SAFETY = 0.85;
    for (const stats of fastBuilds()) {
        const power = stats.power * Math.max(1, stats.nitroPower);
        const drag = stats.drag * (1 - Math.min(DRAFT_CAP, stats.draftBonus));
        const bound = (power / drag) ** (1 / 3);
        for (const id of CURRENT_TRACKS) {
            const track = trackOf(id);
            const lap = track.segments.reduce((time, s) => time + track.segmentLength / terminal(power, drag, Math.max(0, s.current?.along ?? 0) * CURRENTS.along * stats.mass), 0);
            assert.ok(lap > (track.length / bound) * SAFETY, `${id}: ${lap.toFixed(1)} s against ${((track.length / bound) * SAFETY).toFixed(1)}`);
        }
    }
});

test('glass tubes are where the tracks say', () => {
    const track = trackOf('coralAvenue');
    const count = track.segments.length;
    assert.ok(track.hasTubes);
    assert.ok(track.segments[Math.round(0.5 * count)].tube);
    assert.ok(!track.segments[Math.round(0.2 * count)].tube);
});
