import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POTHOLES } from '../js/config/Hazards.js';
import { PROPS, SCENERY } from '../js/config/Props.js';
import { THEMES } from '../js/config/Themes.js';
import { TRACKS } from '../js/config/Tracks.js';
import { BODY, ROAD } from '../js/config/Tuning.js';
import { WORLDS } from '../js/config/Worlds.js';
import { paintPotholes } from '../js/render/road/potholes.js';
import { RoadPalette } from '../js/render/road/RoadPalette.js';
import { layPotholes, PotholeField } from '../js/sim/Potholes.js';
import { layScenery } from '../js/sim/Scenery.js';
import { createRace, trackOf, worldOf } from '../js/sim/setup.js';
import { pilot, run, stockStats } from './support/race.js';

const BROKEN = Object.keys(TRACKS).filter((id) => TRACKS[id].broken);

test('potholes lie only on broken road, on the road, the same every time', () => {
    assert.ok(BROKEN.length >= 3);
    for (const id of BROKEN) {
        const track = trackOf(id);
        const { holes, cracks } = layPotholes(track, POTHOLES);
        assert.ok(holes.length > 5, `${id}: ${holes.length} holes`);
        assert.deepEqual(layPotholes(track, POTHOLES), { holes, cracks });
        for (const item of [...holes, ...cracks]) assert.ok(track.segments[item.segment].broken, `${id}: at ${item.segment}`);
        for (const hole of holes) {
            for (let k = 0; k < hole.length; k++) assert.ok(track.segments[hole.segment + k].broken, `${id}: hole runs off the broken road`);
        }
        for (const hole of holes) assert.ok(Math.abs(hole.x) + hole.width / 2 < 1, `${id}: hole off the road`);
    }
    assert.deepEqual(layPotholes(trackOf('duskValley'), POTHOLES), { holes: [], cracks: [] });
});

test('potholes never block the road: two on a segment leave room for a car between them', () => {
    for (const id of BROKEN) {
        const field = new PotholeField(layPotholes(trackOf(id), POTHOLES));
        for (const hole of field.holes) {
            const [a, b] = field.holesAt(hole.segment);
            if (!b) continue;
            const room = Math.abs(a.x - b.x) - (a.width + b.width) / 2;
            // the car fits between them, and its middle has a lane where no wheel drops in
            assert.ok(room > BODY.width && room - 2 * POTHOLES.reach > 0.25, `${id}: ${room.toFixed(2)} between two holes`);
        }
    }
});

/** A race on a broken track, the player alone at speed just before its first pothole, lined up on it. */
function beforeAHole(trackId = 'iceFields', options = {}) {
    const race = createRace({ trackId, playerStats: stockStats(options), seed: 3 });
    race.skipStart();
    for (const other of race.racers.filter((r) => !r.isPlayer)) other.car.z = -race.track.length / 2;
    const [hole] = race.potholes.holes;
    Object.assign(race.player.car, { z: (hole.segment - 0.5) * race.track.segmentLength, x: hole.x, speed: 9000 });
    return { race, hole };
}

const STRAIGHT = { steer: 0, throttle: true, brake: false, nitro: false };

test('a wheel in a pothole slows the car, hurts it, jolts it aside, and is told once', () => {
    const { race, hole } = beforeAHole();
    const car = race.player.car;
    const health = car.health;
    const events = run(race, 0.1, () => STRAIGHT);
    assert.deepEqual(events.filter((e) => e.type === 'pothole').length, 1);
    assert.ok(car.speed < 9000 * 0.85, `speed ${car.speed}`);
    assert.ok(car.health < health);
    assert.notEqual(car.x, hole.x, 'jolted');
    assert.ok(car.jolt > 0, 'seen bouncing');
});

test('under a shield a pothole only slows the car a little and does no harm', () => {
    const { race } = beforeAHole();
    const car = race.player.car;
    car.shield(5);
    const health = car.health;
    run(race, 0.1, () => STRAIGHT);
    assert.equal(car.health, health);
    assert.ok(car.speed > 9000 * 0.9, `speed ${car.speed}`);
});

test('the drivers steer round the potholes they see coming', () => {
    /** Potholes a driver falls in over the first lap of a track. */
    const fallsIn = (trackId, drive) => {
        const race = createRace({ trackId, playerStats: stockStats(), seed: 5 });
        race.skipStart();
        for (const other of race.racers.filter((r) => !r.isPlayer)) other.car.z = -race.track.length / 2;
        let holes = 0;
        for (let t = 0; t < 60 * 90 && race.player.lap < 2; t++) {
            race.step(drive(race), 1 / 60);
            holes += race.drain().filter((e) => e.type === 'pothole').length;
        }
        return holes;
    };
    // a driver that keeps the middle of the road and only follows the bends
    const middle = (race) => ({ ...pilot(race), steer: Math.max(-1, Math.min(1, -race.player.car.x * 2)) });
    const total = (drive) => BROKEN.reduce((sum, id) => sum + fallsIn(id, drive), 0);
    const careless = total(middle);
    const careful = total(pilot);
    assert.ok(careless >= 20, `the middle of the road meets ${careless} holes`);
    assert.ok(careful <= careless / 4, `the pilot fell in ${careful}, the middle line in ${careless}`);
});

test('warning signs stand on both sides before every broken stretch', () => {
    for (const id of BROKEN) {
        const track = trackOf(id);
        const signs = layScenery(track, worldOf(id), PROPS, SCENERY).filter((p) => p.kind === 'rough');
        const count = track.segments.length;
        const starts = track.segments.filter((s, i) => s.broken && !track.segments[(i - 1 + count) % count].broken);
        assert.equal(signs.length, starts.length * SCENERY.roughAt.length * 2, id);
        for (const sign of signs) assert.ok(!track.segments[sign.segment].broken, `${id}: a sign on the broken road`);
    }
});

test('broken road: patched asphalt and no lane marks; its holes in the fog like the rest', () => {
    const palette = new RoadPalette(THEMES.aurora, ROAD);
    const strip = (fields) => ({ index: 30, n: 5, ...fields });
    const whole = palette.colorsOf(strip({ broken: false }));
    const broken = palette.colorsOf(strip({ broken: true }));
    assert.notEqual(broken.asphalt, whole.asphalt);
    assert.equal(broken.lane, null);
    assert.ok(whole.lane !== null);
    const far = palette.colorsOf(strip({ broken: true, n: ROAD.drawDistance - 1 }));
    assert.notEqual(far.hole.inside, broken.hole.inside, 'fogged');
});

test('a blizzard fades the far road into its own white, not into the night', () => {
    const night = new RoadPalette(THEMES.aurora, ROAD);
    const white = new RoadPalette(THEMES.aurora, ROAD, { fogStart: 0, fogEnd: 0.5, haze: '#ffffff' });
    const far = { index: 1, n: ROAD.drawDistance - 1, broken: false };
    assert.equal(white.colorsOf(far).asphalt, 0xffffffff);
    assert.notEqual(night.colorsOf(far).asphalt, 0xffffffff);
});

test('potholes are painted only on the rows their strip shows, never over nearer road', () => {
    const width = 40;
    const pixels = new Uint32Array(width * 40).fill(1);
    const field = new PotholeField({ holes: [{ id: 0, segment: 7, length: 1, x: 0, width: 0.6 }], cracks: [] });
    const colorsOf = () => ({ hole: { inside: 2, wall: 3, rim: 4, crack: 5 } });
    const strip = { index: 7, n: 1, broken: true, near: { x: 20, y: 30, w: 15 }, far: { x: 20, y: 10, w: 10 } };
    paintPotholes(pixels, width, [{ ...strip, clip: 40 }], field, colorsOf);
    const painted = (from, to) => pixels.slice(from * width, to * width).some((p) => p > 1);
    assert.ok(painted(10, 30), 'the hole shows');
    pixels.fill(1);
    // a nearer crest hides rows 18 and below
    paintPotholes(pixels, width, [{ ...strip, clip: 18 }], field, colorsOf);
    assert.equal(painted(18, 40), false);
    pixels.fill(1);
    paintPotholes(pixels, width, [{ ...strip, broken: false, clip: 40 }], field, colorsOf);
    assert.equal(painted(0, 40), false, 'not broken road: nothing');
});

test('the polar world opens once every track of the city is on the podium', async () => {
    const { Career } = await import('../js/sim/Career.js');
    const career = new Career({});
    const index = WORLDS.findIndex((w) => w.id === 'auroraPeaks');
    assert.ok(index > 0);
    assert.equal(career.isWorldOpen(index), false);
    for (const world of WORLDS.slice(0, index)) {
        for (const id of world.tracks) career.finishRace(id, { position: 1, bestLap: 40, cash: 0 }, 1);
    }
    assert.equal(career.isWorldOpen(index), true);
    assert.equal(career.isTrackOpen('iceFields'), true);
    assert.equal(career.isTrackOpen('glacierPass'), false);
});
