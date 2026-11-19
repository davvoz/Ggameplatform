import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ABYSS } from '../js/config/Hazards.js';
import { PICKUP_LAYOUT, PICKUPS } from '../js/config/Pickups.js';
import { PROPS, SCENERY } from '../js/config/Props.js';
import { TRACKS } from '../js/config/Tracks.js';
import { PHYSICS } from '../js/config/Tuning.js';
import { WORLDS } from '../js/config/Worlds.js';
import { Car } from '../js/sim/Car.js';
import { clears, comeBack, fallen, fly, lipsOf } from '../js/sim/Flight.js';
import { FULL, hasGround, onRibbons, respawnPlace } from '../js/sim/Ground.js';
import { layPickups } from '../js/sim/Pickups.js';
import { layScenery } from '../js/sim/Scenery.js';
import { createRace, trackOf, worldOf } from '../js/sim/setup.js';
import { Track } from '../js/sim/Track.js';
import { DT, stockStats } from './support/race.js';
import { OPTIONS } from './support/track.js';

const VOID_TRACKS = Object.keys(TRACKS).filter((id) => TRACKS[id].abyss || TRACKS[id].forks || TRACKS[id].jumps);

/** A long flat loop with one feature on its first straight. */
function testTrack(features) {
    const points = [[0, 0, 0], [20, 0, 0], [40, 0, 0], [60, 0, 0], [80, 0, 0], [80, 20, 0], [80, 40, 0], [60, 40, 0], [40, 40, 0], [20, 40, 0], [0, 40, 0], [0, 20, 0]];
    return new Track({ name: 'TEST', scale: 1000, heightScale: 1000, laps: 3, points, ...features }, OPTIONS);
}

const share = (track, i) => i / track.segments.length;
const at = (track, s) => track.segments[Math.round(s * track.segments.length)];

test('the usual road is one full ribbon on solid ground, on every track of the first three worlds', () => {
    for (const world of WORLDS.slice(0, 3)) {
        for (const id of world.tracks) {
            const track = trackOf(id);
            assert.ok(track.segments.every((s) => s.ribbons === FULL && !s.abyss), id);
            assert.equal(track.hasAbyss, false, id);
        }
    }
});

test('a narrowing eases in, holds its width over the void, and eases out', () => {
    const track = testTrack({ abyss: [[0.02, 0.2]], narrows: [[0.04, 0.18, 0.5]] });
    assert.equal(at(track, 0.11).ribbons[0].w, 0.5);
    assert.ok(at(track, 0.11).abyss);
    const widths = track.segments.map((s) => s.ribbons[0].w);
    // smoothstep: never steeper than 1.5 times the even pace
    widths.forEach((w, i) => assert.ok(Math.abs(w - widths[(i + 1) % widths.length]) <= (1.5 * 0.5) / ABYSS.narrowEase, `step at ${i}`));
    assert.equal(at(track, 0.3).ribbons, FULL);
});

test('a fork parts in two branches with the void between them, which meet again', () => {
    const track = testTrack({ forks: [[0.02, 0.22, 1.6]] });
    const middle = at(track, 0.12);
    assert.equal(middle.ribbons.length, 2);
    assert.deepEqual(middle.ribbons.map((r) => r.c), [-1.6, 1.6]);
    assert.ok(middle.abyss);
    assert.equal(hasGround(middle, 0), false, 'nothing between the branches');
    assert.ok(hasGround(middle, -1.6) && hasGround(middle, 1.6));
    // at its ends the two branches together are the whole road
    const start = track.segments[Math.round(0.02 * track.segments.length)];
    assert.ok(onRibbons(start.ribbons, 0, ABYSS.edge) && onRibbons(start.ribbons, 0.95));
});

test('a jump: a striped ramp, a gap with no asphalt, then the far wall; on a fork only its own branch', () => {
    const track = testTrack({ abyss: [[0.05, 0.2]], jumps: [[0.1, 12]] });
    const lip = Math.round(0.1 * track.segments.length);
    assert.ok(track.segments[lip].ribbons[0].ramp);
    assert.ok(track.segments[lip - ABYSS.ramp + 1].ribbons[0].ramp);
    assert.equal(track.segments[lip + 1].ribbons.length, 0);
    assert.equal(track.segments[lip + 12].ribbons.length, 0);
    assert.ok(track.segments[lip + 13].ribbons[0].face);

    const forked = testTrack({ forks: [[0.02, 0.3, 1.6]], jumps: [[0.15, 10, 1]] });
    const flip = Math.round(0.15 * forked.segments.length);
    assert.deepEqual(forked.segments[flip + 5].ribbons.map((r) => r.c), [-1.6], 'the left branch goes on');
    assert.ok(forked.segments[flip].ribbons[1].ramp && !forked.segments[flip].ribbons[0].ramp);
});

test('off a ramp fast enough a car flies over the gap and lands; too slow it falls and comes back ahead', () => {
    const track = testTrack({ abyss: [[0.05, 0.2]], jumps: [[0.1, 12]] });
    const [lip] = lipsOf(track);
    const go = (speed) => {
        const car = new Car(stockStats());
        Object.assign(car, { z: (lip.index - 3) * track.segmentLength, speed });
        const events = [];
        for (let t = 0; t < 4 && !fallen(car); t += DT) {
            const segment = track.segmentAt(car.z);
            const fromRamp = !car.loose && segment.ribbons.some((r) => r.ramp);
            car.step({ steer: 0, throttle: false, brake: false, nitro: false }, { curve: 0, grip: 1, ribbons: segment.ribbons }, DT);
            const happened = fly(car, track, fromRamp, DT);
            if (happened) events.push(happened);
        }
        return { car, events };
    };
    const fast = go(lip.speed * 1.15);
    assert.deepEqual(fast.events.slice(0, 2), ['launch', 'land']);
    assert.equal(fast.car.falling, 0);

    const slow = go(lip.speed * 0.6);
    assert.deepEqual(slow.events, ['launch', 'fall']);
    assert.ok(fallen(slow.car));
    const health = slow.car.health;
    comeBack(slow.car, track);
    assert.ok(track.segmentAt(slow.car.z).index > lip.index + 12, 'back past the gap');
    assert.ok(track.groundAt(slow.car.z, slow.car.x));
    assert.equal(slow.car.speed, ABYSS.respawnSpeed * PHYSICS.refSpeed);
    assert.ok(slow.car.health < health);
});

test('a car that leaves a narrow road over the void falls; beside the usual road it only runs on the ground', () => {
    const track = testTrack({ abyss: [[0.02, 0.2]], narrows: [[0.04, 0.18, 0.5]] });
    const car = new Car(stockStats());
    Object.assign(car, { z: 0.11 * track.length, x: 0.9, speed: 8000 });
    assert.equal(fly(car, track, false, DT), 'fall');
    const solid = new Car(stockStats());
    Object.assign(solid, { z: 0.5 * track.length, x: 1.5, speed: 8000 });
    assert.equal(fly(solid, track, false, DT), null);
    assert.ok(solid.offRoad);
});

test('a car comes back where the road ahead is whole: never on a ramp, never just before a gap', () => {
    for (const id of VOID_TRACKS) {
        const track = trackOf(id);
        const count = track.segments.length;
        for (let i = 0; i < count; i += 7) {
            const place = respawnPlace(track, i * track.segmentLength, 0);
            for (let k = 0; k < ABYSS.respawnClear; k++) {
                const segment = track.segments[(i + place.ahead + k) % count];
                assert.ok(segment.ribbons.length > 0 && !segment.ribbons.some((r) => r.ramp && Math.abs(r.c - place.x) < r.w), `${id} at ${i}`);
            }
        }
    }
});

test('every jump of the game: cleared at a fair speed on a straight, and every faster car lands on asphalt', () => {
    for (const id of VOID_TRACKS) {
        const track = trackOf(id);
        for (const lip of lipsOf(track)) {
            const where = `${id} at ${share(track, lip.index).toFixed(3)}`;
            const ratio = lip.speed / PHYSICS.refSpeed;
            assert.ok(ratio > 0.45 && ratio < 0.7, `${where} asks ${ratio.toFixed(2)}`);
            assert.ok(Math.abs(track.segments[lip.index].curve) < 2.5, `${where} is in a bend`);
            for (let r = ratio; r <= 1.4; r += 0.02) assert.ok(clears(track, lip.index, lip.x, r * PHYSICS.refSpeed), `${where} at ${r.toFixed(2)}`);
        }
    }
});

test('nothing lies or stands over the void: pickups on the asphalt, no props by it', () => {
    for (const id of VOID_TRACKS) {
        const track = trackOf(id);
        for (const item of layPickups(track, PICKUPS, PICKUP_LAYOUT)) {
            assert.ok(onRibbons(track.ribbonsAt(item.z), item.x), `${id}: pickup at ${item.z}`);
        }
        const props = layScenery(track, worldOf(id), PROPS, SCENERY);
        assert.ok(props.every((p) => !track.segments[p.segment].abyss), id);
        if (TRACKS[id].jumps) assert.ok(props.some((p) => p.kind === 'gapSign'), `${id} warns of its jumps`);
    }
});

test('the rivals drive the hostile world: every race ends, they jump, and they seldom fall', () => {
    for (const id of VOID_TRACKS) {
        const race = createRace({ trackId: id, playerStats: stockStats(), seed: 2 });
        race.skipStart();
        let falls = 0;
        const was = new Map();
        for (let tick = 0; tick < 60 * 260 && !race.over; tick++) {
            race.step(race.player.brain.read(race.player, race), DT);
            race.drain();
            for (const racer of race.racers) {
                if (racer.car.falling > 0 && !was.get(racer)) falls++;
                was.set(racer, racer.car.falling > 0);
            }
        }
        assert.ok(race.over, `${id}: the race ends`);
        // the race ends a moment after the flag: every rival is home or on its last lap
        assert.ok(race.racers.every((r) => r.finished || r.lap >= race.track.laps), `${id}: every rival near home`);
        assert.ok(falls <= race.racers.length, `${id}: ${falls} falls`);
    }
});
