import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VORTEX } from '../js/config/Hazards.js';
import { TRACKS } from '../js/config/Tracks.js';
import { PHYSICS, ROAD, SCREEN } from '../js/config/Tuning.js';
import { projectRoad } from '../js/render/road/project.js';
import { onVortex, paintVortex, turner, vortexCamera } from '../js/render/road/vortex.js';
import { focalLength } from '../js/render/screen.js';
import { Car } from '../js/sim/Car.js';
import { PickupField } from '../js/sim/Pickups.js';
import { createRace, trackOf } from '../js/sim/setup.js';
import { CIRCLE, acrossOn, drop, onSurface, onTurbo, spanOf, surfaceAt } from '../js/sim/Vortex.js';
import { DT, pilot, stockStats } from './support/race.js';

const VORTEX_TRACKS = Object.keys(TRACKS).filter((id) => TRACKS[id].vortex);
const CLOSED = { roll: 1 };
const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

/** A tube's surface under a car, as the race hands it over. */
const tube = (curve = 0) => ({ curve, grip: 1, roll: 1, ribbons: [{ c: 0, w: spanOf(1) }] });
const hold = (steer = 0, throttle = true) => ({ steer, throttle, brake: !throttle, nitro: false });

test('the surface: flat road at no roll, a circle round the tube at full roll, the ceiling half a lap round', () => {
    assert.deepEqual(surfaceAt(0, 1.3), { x: 1.3, y: 0, angle: 0 });
    const ceiling = surfaceAt(1, CIRCLE / 2);
    assert.ok(close(ceiling.x, 0) && close(ceiling.y, 2 * VORTEX.radius) && close(ceiling.angle, Math.PI));
    assert.ok(close(surfaceAt(1, CIRCLE / 4).x, VORTEX.radius), 'the right wall');
    assert.equal(spanOf(0), PHYSICS.maxOffset);
    assert.ok(close(spanOf(1), CIRCLE / 2));
});

test('across a closed tube places wrap the shorter way round; a half pipe holds them within its lips', () => {
    assert.ok(close(acrossOn(CLOSED, CIRCLE / 2 - 0.1, -CIRCLE / 2 + 0.1), 0.2), 'over the ceiling');
    assert.equal(acrossOn({ roll: 0.5 }, 2, -2), -4);
    assert.equal(acrossOn({}, 0.3, 0.5), 0.5 - 0.3);
    assert.ok(close(onSurface(CLOSED, CIRCLE / 2 + 0.3), -CIRCLE / 2 + 0.3));
    assert.equal(onSurface({ roll: 0.5 }, 99), spanOf(0.5));
});

test('vortex tracks roll up and open out smoothly, close into a tube, and keep their turbo strips inside it', () => {
    for (const id of VORTEX_TRACKS) {
        const { segments } = trackOf(id);
        const rolls = segments.map((s) => s.roll ?? 0);
        rolls.forEach((r, i) => assert.ok(Math.abs(r - rolls[(i + 1) % rolls.length]) <= 1.6 / VORTEX.ease, `${id} rolls at ${i}`));
        assert.ok(rolls.some((r) => r >= 1), `${id} closes`);
        for (const segment of segments.filter((s) => s.turbo !== undefined)) {
            assert.ok(segment.roll > 0, `${id}: a turbo strip out of the vortex at ${segment.index}`);
            assert.ok(Math.abs(segment.turbo) + VORTEX.turboWidth < CIRCLE / 2, `${id}: a turbo strip over the ceiling's seam`);
        }
    }
});

test('steering one way the car goes right round the tube', () => {
    const car = new Car(stockStats());
    car.speed = 10000;
    let laps = 0;
    let before = car.x;
    for (let t = 0; t < 8; t += DT) {
        car.step(hold(1), tube(), DT);
        if (car.x < before - CIRCLE / 2) laps++;
        before = car.x;
    }
    assert.ok(laps >= 1);
    assert.ok(Math.abs(car.x) <= CIRCLE / 2);
});

test('hands off the wheel on a wall, the car slides back to the bottom', () => {
    const car = new Car(stockStats());
    car.speed = 10000;
    car.x = CIRCLE / 4;
    for (let t = 0; t < 3; t += DT) car.step(hold(), tube(), DT);
    assert.ok(Math.abs(car.x) < 0.2, `at ${car.x}`);
});

test('too slow on the ceiling the car lets go, drops across the tube and lands hard at the bottom; fast it holds on', () => {
    const slow = new Car(stockStats());
    slow.speed = PHYSICS.refSpeed * VORTEX.stick * 0.8;
    slow.x = CIRCLE / 2 - 0.05;
    const seen = [];
    let landing = null;
    for (let t = 0; t < VORTEX.dropTime + 0.3; t += DT) {
        slow.step(hold(), tube(), DT);
        const happened = drop(slow, 1, DT);
        if (happened) seen.push(happened);
        if (happened === 'hardLanding') landing = { x: slow.x, speed: slow.speed };
    }
    assert.deepEqual(seen, ['drop', 'hardLanding']);
    assert.equal(landing.x, 0);
    assert.ok(landing.speed <= PHYSICS.refSpeed * VORTEX.stick * 0.8 * VORTEX.dropKeep, 'speed lost');

    const fast = new Car(stockStats());
    fast.speed = PHYSICS.refSpeed * 0.9;
    fast.x = CIRCLE / 2 - 0.05;
    for (let t = 0; t < 0.5; t += DT) {
        fast.step(hold(), tube(), DT);
        assert.equal(drop(fast, 1, DT), null);
    }
});

test('on a turbo strip a car burns free nitro: within what the server bounds (the nitro all lap long)', () => {
    const segment = { roll: 1, turbo: 1.9 };
    assert.ok(onTurbo(segment, 1.9 + VORTEX.turboWidth * 0.9));
    assert.ok(!onTurbo(segment, 0));
    const race = createRace({ trackId: 'hyperloop', playerStats: stockStats(), seed: 1 });
    race.skipStart();
    const { track, player } = race;
    const strip = track.segments.find((s) => s.turbo !== undefined);
    player.car.z = strip.index * track.segmentLength + 1;
    player.car.x = strip.turbo;
    player.car.speed = 9000;
    race.step(hold(), DT);
    assert.ok(player.car.boosting, 'the turbo lights the nitro');
    assert.ok(race.drain().some((e) => e.type === 'turbo'));
});

test('a closed tube puts one lane of pickups in three on the ceiling, taken from either side of its seam', () => {
    const track = trackOf('eventHorizon');
    const race = createRace({ trackId: 'eventHorizon', playerStats: stockStats(), seed: 1 });
    const inTube = race.pickups.items.filter((item) => track.segmentAt(item.z).roll >= 1);
    assert.ok(inTube.some((item) => close(item.x, CIRCLE / 2)), 'some up on the ceiling');
    assert.ok(inTube.some((item) => Math.abs(item.x) < 1), 'some at the bottom');

    const field = new PickupField([{ id: 0, z: 1000, x: CIRCLE / 2, kind: 'cash' }], 100000);
    const across = (z, from, to) => acrossOn(CLOSED, from, to);
    assert.equal(field.collect(900, 1100, -CIRCLE / 2 + 0.1, 0.3, across).length, 1);
});

test('cars touch across the ceiling\'s seam', () => {
    const race = createRace({ trackId: 'eventHorizon', playerStats: stockStats(), seed: 1 });
    race.skipStart();
    const { track } = race;
    const middle = track.segments.findIndex((s) => s.roll >= 1) + 40;
    const [a, b] = race.racers;
    for (const racer of race.racers) racer.car.z = (middle - 30) * track.segmentLength;
    a.car.z = middle * track.segmentLength;
    b.car.z = middle * track.segmentLength + 50;
    a.car.x = CIRCLE / 2 - 0.1;
    b.car.x = -CIRCLE / 2 + 0.1;
    a.car.speed = 9000;
    b.car.speed = 9000;
    const apart = Math.abs(track.across(a.car.z, a.car.x, b.car.x));
    race.step(hold(), DT);
    assert.ok(Math.abs(track.across(a.car.z, a.car.x, b.car.x)) > apart, 'pushed apart');
});

test('the rivals race the vortex tracks without dropping off the walls', () => {
    for (const id of VORTEX_TRACKS) {
        const race = createRace({ trackId: id, playerStats: stockStats({ parts: { engine: 2, tyres: 2 } }), seed: 3 });
        race.skipStart();
        let drops = 0;
        const holding = new Map();
        for (let t = 0; t < 200 && race.phase !== 'finished'; t += DT) {
            race.step(pilot(race), DT);
            race.drain();
            for (const racer of race.racers) {
                if (racer.car.dropping > 0 && !holding.get(racer)) drops++;
                holding.set(racer, racer.car.dropping > 0);
            }
        }
        assert.equal(race.phase, 'finished', id);
        assert.ok(drops <= 1, `${id}: ${drops} drops`);
    }
});

test('nothing stands where the road rolls up', () => {
    for (const id of VORTEX_TRACKS) {
        const race = createRace({ trackId: id, playerStats: stockStats(), seed: 1 });
        assert.ok(race.props.every((prop) => !race.track.segments[prop.segment].roll), id);
    }
});

test('the camera rides along the upright under the car; a turn of a quarter swings right onto down', () => {
    const camera = vortexCamera(1, CIRCLE / 4, 1000, ROAD.halfWidth);
    assert.ok(close(camera.x, VORTEX.radius * ROAD.halfWidth - 1000, 1e-6));
    assert.ok(close(camera.y, VORTEX.radius * ROAD.halfWidth, 1e-6));
    assert.ok(close(camera.roll, Math.PI / 2));
    const p = turner({ x: 10, y: 10 }, Math.PI / 2)({ x: 11, y: 10 });
    assert.ok(close(p.x, 10) && close(p.y, 11));
    const place = onVortex({ x: 5, y: 50, scale: 1, clip: 0, depth: 0 }, { roll: 1, x: CIRCLE / 2, reference: 10, turn: (q) => q, cameraRoll: 0 });
    assert.ok(close(place.angle, -Math.PI), 'upside down on the ceiling');
    assert.ok(close(place.y, 50 - 2 * VORTEX.radius * 10, 1e-6));
});

test('inside a closed tube the road fills the whole screen; on the flat it leaves the sky', () => {
    const track = trackOf('eventHorizon');
    const size = { width: 240, height: 180 };
    const view = { ...size, horizon: 72, focal: focalLength(SCREEN) };
    const colors = { grass: 1, rumble: 2, asphalt: 3, lane: 4, wall: 5, ring: 6, seam: 7, turbo: [8, 9], grid: 10 };
    const paint = (z, x) => {
        const roll = track.segmentAt(z).roll ?? 0;
        const camera = vortexCamera(roll, x, 1000, ROAD.halfWidth);
        const strips = projectRoad(track, { x: camera.x, y: camera.y + track.elevationAt(z), z: z - 1400 }, view, ROAD);
        const pixels = new Uint32Array(size.width * size.height);
        paintVortex(pixels, size, strips, () => colors, { pivot: { x: 120, y: 72 }, roll: camera.roll, clock: 0, lanes: 3 });
        return pixels;
    };
    const middle = track.segments.findIndex((s) => s.roll >= 1) + 200;
    for (const x of [0, CIRCLE / 4, CIRCLE / 2 - 0.1]) {
        assert.ok(paint(middle * track.segmentLength, x).every((p) => p !== 0), `holes in the tube at ${x}`);
    }
    const flat = paint(2 * track.segmentLength, 0);
    assert.ok(flat.slice(0, size.width * 40).every((p) => p === 0), 'the sky shows over the flat road');
    assert.ok(flat.slice(size.width * 170).every((p) => p !== 0), 'the road and the ground at the bottom');
});
