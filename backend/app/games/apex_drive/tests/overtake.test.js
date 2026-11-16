import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRIVERS } from '../js/config/Drivers.js';
import { TAUNTS } from '../js/config/Taunts.js';
import { Taunts } from '../js/render/hud/Taunts.js';
import { duskValley } from './support/track.js';
import { DT, GAS, racingRace } from './support/race.js';

/** A racing race with every rival but one sent far away; the player at `z`, the rival `ahead` on the road. */
function duel({ z = 50000, ahead, lapsDown = 0, x = 0 }) {
    const race = racingRace();
    const [rival, ...others] = race.racers.filter((r) => !r.isPlayer);
    others.forEach((other, i) => {
        other.car.z = z + race.track.length / 2 + i * 3000;
    });
    race.player.car.z = z;
    race.player.car.x = 0;
    rival.car.z = z + ahead - lapsDown * race.track.length;
    rival.car.x = x;
    race.drain();
    return { race, rival };
}

test('the road gap goes the short way round the loop', () => {
    const track = duskValley();
    assert.equal(track.gap(1000, 1500), 500);
    assert.equal(track.gap(1500, 1000), -500);
    assert.equal(track.gap(1000, 1500 - track.length), 500, 'a lap down, yet just ahead on the road');
    assert.equal(track.gap(track.length - 100, track.length + 100), 200, 'across the line');
});

test('a car a lap down is solid: the player runs into it', () => {
    const { race, rival } = duel({ ahead: 200, lapsDown: 1 });
    race.player.car.speed = 9000;
    rival.car.speed = 3000;
    race.step(GAS, DT);
    assert.ok(race.player.car.speed < 8000, `speed ${race.player.car.speed}`);
    assert.ok(rival.car.speed > 3000);
    assert.ok(race.drain().some((e) => e.type === 'bump'));
});

test('a car a lap down gives a slipstream too', () => {
    const { race } = duel({ ahead: 1200, lapsDown: 1 });
    race.player.car.speed = 9000;
    race.step(GAS, DT);
    assert.ok(race.player.car.draft > 0);
});

test('going by a rival tells who, and whether it is a lap down', () => {
    for (const lapsDown of [0, 1]) {
        const { race, rival } = duel({ ahead: 300, lapsDown, x: 0.8 });
        race.step(GAS, DT);
        rival.car.z -= 700;
        rival.car.speed = 0;
        race.step(GAS, DT);
        const passes = race.drain().filter((e) => e.type === 'overtake');
        assert.deepEqual(passes, [{ type: 'overtake', name: rival.name, lapped: lapsDown === 1 }], `laps down ${lapsDown}`);
    }
});

test('a rival far away is not overtaken when the gap wraps round the loop', () => {
    const { race, rival } = duel({ ahead: 2500 });
    race.step(GAS, DT);
    rival.car.z = race.player.car.z - 2500;
    race.step(GAS, DT);
    assert.equal(race.drain().filter((e) => e.type === 'overtake').length, 0);
});

test('every taunt fits on one row, with the longest name', () => {
    const longest = DRIVERS.map((d) => d.name).reduce((a, b) => (b.length > a.length ? b : a));
    for (const line of [...TAUNTS.overtake, ...TAUNTS.lapped]) {
        assert.ok(line.replace('{name}', longest).length <= TAUNTS.maxLength, line);
    }
});

test('a bubble names the rival, never repeats a line twice running, and a lapped mock beats a plain jibe', () => {
    const taunts = new Taunts(5);
    assert.equal(taunts.handle({ type: 'bump' }), null);
    assert.equal(taunts.handle({ type: 'overtake', name: 'VEX', lapped: false }), 'overtake');
    const first = taunts.text;
    assert.ok(!first.includes('{name}'));
    assert.equal(taunts.handle({ type: 'overtake', name: 'ZIP', lapped: false }), null, 'one bubble at a time');
    assert.equal(taunts.handle({ type: 'overtake', name: 'OTTO', lapped: true }), 'lapped');
    assert.ok(TAUNTS.lapped.some((line) => line.replace('{name}', 'OTTO') === taunts.text));

    let last = taunts.text;
    for (let i = 0; i < 12; i++) {
        taunts.update(TAUNTS.show + TAUNTS.gap + 0.01);
        assert.equal(taunts.text, null);
        taunts.handle({ type: 'overtake', name: 'NYX', lapped: false });
        assert.notEqual(taunts.text, last);
        last = taunts.text;
    }
});
