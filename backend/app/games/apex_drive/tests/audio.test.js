import { test } from 'node:test';
import assert from 'node:assert/strict';
import { soundOf } from '../js/audio/GameAudio.js';
import { engineState, gearOf } from '../js/audio/engineState.js';
import { PICKUPS } from '../js/config/Pickups.js';
import { ENGINE, SOUNDS } from '../js/config/Sounds.js';
import { PHYSICS } from '../js/config/Tuning.js';
import { LocalSave } from '../js/platform/LocalSave.js';
import { racingRace } from './support/race.js';

/** Every kind of event the race sends (sim/Race.js), with the fields its sound depends on. */
const EVENTS = [
    { type: 'count', n: 3 }, { type: 'go' }, { type: 'perfectStart' }, { type: 'wheelspin' },
    { type: 'lap', lap: 2 }, { type: 'finalLap', lap: 3 }, { type: 'finish', position: 1 },
    { type: 'nitro' }, { type: 'crash', kind: 'pine' },
    { type: 'bump', hurt: true }, { type: 'bump', hurt: false },
    { type: 'position', from: 3, to: 2 }, { type: 'position', from: 2, to: 3 },
    ...Object.keys(PICKUPS).map((kind) => ({ type: 'pickup', kind, value: 1 })),
    { type: 'pickup', kind: 'nitro', value: 0 },
];
/** Sounds the screens ask for by name. */
const SCREEN_SOUNDS = ['move', 'confirm', 'back', 'buy', 'fit', 'deny', 'wipe', 'start', 'podium', 'noPodium'];

test('every race event and every screen has a sound that exists', () => {
    for (const event of EVENTS) assert.ok(soundOf(event) in SOUNDS, JSON.stringify(event));
    for (const name of SCREEN_SOUNDS) assert.ok(name in SOUNDS, name);
    assert.equal(soundOf({ type: 'pickup', kind: 'nitro', value: 0 }), 'pickup:full');
    assert.equal(soundOf({ type: 'position', from: 3, to: 2 }), 'positionUp');
});

test('every recipe is made of playable parts', () => {
    for (const [name, recipe] of Object.entries(SOUNDS)) {
        assert.ok(recipe.length > 0, name);
        for (const part of recipe) {
            assert.ok((part.at ?? 0) >= 0 && part.v > 0 && part.v <= 0.6, `${name}: ${JSON.stringify(part)}`);
            if (part.n) assert.ok(part.f > 20 && (part.to ?? part.f) > 20, name);
            else assert.ok(['sine', 'square', 'sawtooth', 'triangle'].includes(part.t) && part.from > 20 && part.to > 20 && part.d > 0, name);
        }
    }
});

test('the revs climb through a gear and drop at each shift', () => {
    const first = gearOf(0.1, ENGINE);
    const top = gearOf(ENGINE.gears[0] - 0.001, ENGINE);
    const shifted = gearOf(ENGINE.gears[0] + 0.001, ENGINE);
    assert.equal(first.gear, 1);
    assert.ok(top.revs > 0.95);
    assert.equal(shifted.gear, 2);
    assert.ok(Math.abs(shifted.revs - ENGINE.shiftDrop) < 0.02);
    assert.equal(gearOf(5, ENGINE).gear, ENGINE.gears.length);
    assert.equal(gearOf(5, ENGINE).revs, 1);
});

test('the tyres squeal in a hard turn at speed, louder the harder; not slow, not straight, not on the grass', () => {
    const race = racingRace();
    const car = race.player.car;
    const squeal = (turn, speed, x = 0, gripUsed = 0) => {
        Object.assign(car, { turn, speed, x, gripUsed, sliding: false });
        return engineState(race, ENGINE).squeal;
    };
    const fast = PHYSICS.refSpeed;
    assert.equal(squeal(0, fast), 0, 'straight');
    assert.equal(squeal(0.2, fast), 0, 'a touch of steering');
    assert.equal(squeal(1, fast), 1, 'full lock at speed');
    assert.ok(squeal(0.5, fast) > 0 && squeal(0.5, fast) < 1);
    assert.ok(squeal(-0.7, fast) > squeal(-0.5, fast), 'either way, louder the harder');
    assert.equal(squeal(1, fast * 0.2), 0, 'too slow');
    assert.equal(squeal(1, fast, 1.5), 0, 'on the grass it rumbles instead');
    assert.equal(squeal(0, fast, 0, 0.2), 0, 'a gentle bend');
    assert.equal(squeal(0, fast, 0, 0.95), 1, 'a bend at the edge of the grip, the wheel held straight or not');
    assert.ok(squeal(0, fast, 0, 0.5) > 0 && squeal(0, fast, 0, 0.5) < 1);
    Object.assign(car, { turn: 0, x: 0, sliding: true });
    assert.equal(engineState(race, ENGINE).squeal, 1, 'a slide squeals however the wheel is held');
});

test('the engine state follows the car: a slide squeals, the grass rumbles, a rival is heard on its side', () => {
    const race = racingRace();
    const car = race.player.car;
    car.speed = 9000;
    car.sliding = true;
    car.x = 1.5;
    const loud = engineState(race, ENGINE);
    assert.equal(loud.skid, 1);
    assert.ok(loud.rumble > 0.5);
    assert.ok(loud.wind > 0.3);

    const [rival] = race.racers.filter((r) => !r.isPlayer);
    for (const other of race.racers.filter((r) => !r.isPlayer && r !== rival)) other.car.z = -90000;
    car.z = 5000;
    car.x = 0;
    rival.car.z = 5200;
    rival.car.x = -0.6;
    const near = engineState(race, ENGINE).rival;
    assert.ok(near.near > 0.9 && near.pan < 0, JSON.stringify(near));
    rival.car.z = 5000 + ENGINE.rivalRange + 1;
    assert.equal(engineState(race, ENGINE).rival, null);
});

test('settings are kept under their own key and a broken store fails soft', () => {
    const memory = new Map();
    const storage = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
    new LocalSave('a', storage).save({ muted: true });
    assert.deepEqual(new LocalSave('a', storage).load(), { muted: true });
    assert.equal(new LocalSave('b', storage).load(), null);
    const broken = { getItem: () => '{oops', setItem: () => { throw new Error('full'); } };
    assert.equal(new LocalSave('a', broken).load(), null);
    assert.doesNotThrow(() => new LocalSave('a', broken).save({}));
});
