import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineState } from '../js/audio/engineState.js';
import { ENGINE } from '../js/config/Sounds.js';
import { WEATHER } from '../js/config/Weather.js';
import { WORLDS } from '../js/config/Worlds.js';
import { precipitationOf } from '../js/render/Precipitation.js';
import { Career } from '../js/sim/Career.js';
import { createRace } from '../js/sim/setup.js';
import { stockStats } from './support/race.js';

/** A canvas that writes down the pixels filled. */
function recorder() {
    const pixels = [];
    return { pixels, fillStyle: '', fillRect: (x, y, w, h) => pixels.push([x, y, w, h]) };
}

const SIZE = { width: 320, height: 180 };
const MOTION = { speed: 0.5, horizon: 70 };

test('rain falls the same way at the same moment, and moves with time', () => {
    const rain = precipitationOf(WEATHER.drizzle.particles);
    const once = recorder();
    const again = recorder();
    precipitationOf(WEATHER.drizzle.particles).draw(once, SIZE, 2.5, MOTION);
    rain.draw(again, SIZE, 2.5, MOTION);
    assert.deepEqual(once.pixels, again.pixels);
    const later = recorder();
    rain.draw(later, SIZE, 2.6, MOTION);
    assert.notDeepEqual(later.pixels, once.pixels);
});

test('drops are longer at speed, stay within the width, and splashes land below the horizon', () => {
    const { particles } = WEATHER.drizzle;
    const slow = recorder();
    const fast = recorder();
    precipitationOf(particles).draw(slow, SIZE, 1, { ...MOTION, speed: 0 });
    precipitationOf(particles).draw(fast, SIZE, 1, { ...MOTION, speed: 1 });
    assert.ok(fast.pixels.length > slow.pixels.length * 1.5);
    const splashRows = 3 * particles.splashes;
    const drops = fast.pixels.slice(0, -splashRows);
    const margin = 8 + particles.length[1];
    assert.ok(drops.every(([x, y]) => x >= -margin && x < SIZE.width + margin && y < SIZE.height + margin));
    assert.ok(fast.pixels.slice(-splashRows).every(([, y]) => y >= MOTION.horizon - 1 && y < SIZE.height));
});

test('at speed the drops stream away from the middle; standing still they only fall', () => {
    const { particles } = WEATHER.drizzle;
    /** How far from the middle the drops are on average, a moment after the start. */
    const spreadAfter = (speed) => {
        const rain = precipitationOf(particles);
        rain.draw(recorder(), SIZE, 0, { ...MOTION, speed });
        const later = recorder();
        rain.draw(later, SIZE, 0.05, { ...MOTION, speed });
        const xs = later.pixels.slice(0, -3 * particles.splashes).map(([x]) => Math.abs(x - SIZE.width / 2));
        return xs.reduce((a, b) => a + b, 0) / xs.length;
    };
    assert.ok(spreadAfter(1) > spreadAfter(0) + 2, `${spreadAfter(1)} vs ${spreadAfter(0)}`);
});

test('a paused race shows still rain', () => {
    const rain = precipitationOf(WEATHER.drizzle.particles);
    rain.draw(recorder(), SIZE, 3, MOTION);
    const once = recorder();
    const again = recorder();
    rain.draw(once, SIZE, 3, MOTION);
    rain.draw(again, SIZE, 3, MOTION);
    assert.deepEqual(once.pixels.slice(0, 200), again.pixels.slice(0, 200));
});

test('clear weather has nothing falling; an unknown kind fails on load', () => {
    assert.equal(precipitationOf(WEATHER.clear.particles), null);
    assert.throws(() => precipitationOf({ kind: 'frogs' }), /frogs/);
});

test('in the drizzle the road grips less and the rain is heard', () => {
    const wet = createRace({ trackId: 'cliffRoad', playerStats: stockStats() });
    const dry = createRace({ trackId: 'duskValley', playerStats: stockStats() });
    assert.equal(wet.grip, WEATHER.drizzle.grip);
    assert.ok(wet.grip < dry.grip);
    assert.deepEqual(engineState(wet, ENGINE).ambience, WEATHER.drizzle.ambience);
    assert.equal(engineState(dry, ENGINE).ambience, null);
});

test('the first world has its three tracks, each opened by a podium on the one before', () => {
    const [first] = WORLDS;
    assert.deepEqual(first.tracks, ['duskValley', 'pierCircuit', 'cliffRoad']);
    const career = new Career({});
    assert.deepEqual(first.tracks.map((id) => career.isTrackOpen(id)), [true, false, false]);
    const podium = { position: 2, bestLap: 30, cash: 0 };
    career.finishRace('duskValley', podium, first.prizeScale);
    assert.deepEqual(first.tracks.map((id) => career.isTrackOpen(id)), [true, true, false]);
    career.finishRace('pierCircuit', { ...podium, position: 5 }, first.prizeScale);
    assert.equal(career.isTrackOpen('cliffRoad'), false, 'fifth is not enough');
    career.finishRace('pierCircuit', podium, first.prizeScale);
    assert.equal(career.isTrackOpen('cliffRoad'), true);
});

test('snow falls the same way at the same moment, slower than rain, and sways', () => {
    const { particles } = WEATHER.snow;
    const once = recorder();
    const again = recorder();
    precipitationOf(particles).draw(once, SIZE, 2.5, { ...MOTION, speed: 0 });
    precipitationOf(particles).draw(again, SIZE, 2.5, { ...MOTION, speed: 0 });
    assert.deepEqual(once.pixels, again.pixels);
    assert.ok(particles.fall < WEATHER.drizzle.particles.fall / 2);
    // standing still a flake is a dot or a 2 x 2 flake, never a streak
    assert.ok(once.pixels.every(([, , w, h]) => w <= 2 && h <= 2));
});

test('in a blizzard a gust whitens the whole screen for a moment, then clears', () => {
    const { particles } = WEATHER.blizzard;
    const { every, length } = particles.gust;
    const whole = (pixels) => pixels.some(([x, y, w, h]) => x === 0 && y === 0 && w === SIZE.width && h === SIZE.height);
    const at = (clock) => {
        const canvas = recorder();
        precipitationOf(particles).draw(canvas, SIZE, clock, MOTION);
        return whole(canvas.pixels);
    };
    assert.equal(at(every * 3 + length / 2), true);
    assert.equal(at(every * 3 + length + 0.5), false);
});

test('snow and blizzard grip less than the dry road, the blizzard least; both are heard', () => {
    const snowy = createRace({ trackId: 'iceFields', playerStats: stockStats() });
    const blizzard = createRace({ trackId: 'whiteout', playerStats: stockStats() });
    assert.ok(snowy.grip < 1 && blizzard.grip < snowy.grip);
    assert.deepEqual(engineState(blizzard, ENGINE).ambience, WEATHER.blizzard.ambience);
});
