import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EFFECT_TICKS, createReplay, poseOfBlow, separate } from '../js/replay.js';

// A real battle produced by the server simulation (south, production, spread).
// Regenerate it after changing the simulation:
//   see "Test fixture" in the README.
const battle = JSON.parse(readFileSync(new URL('./fixtures/battle.json', import.meta.url), 'utf8'));
const replay = createReplay(battle);

test('the first moment puts every hero on its spawn point', () => {
    const state = replay.stateAt(0);
    state.heroes.forEach((hero, k) => {
        assert.equal(hero.x, battle.frames[0][k][0]);
        assert.equal(hero.y, battle.frames[0][k][1]);
        assert.equal(hero.hp, hero.maxHp);
    });
});

test('between two frames heroes are interpolated', () => {
    const half = battle.frame_stride / 2;
    const state = replay.stateAt(half);
    state.heroes.forEach((hero, k) => {
        const [x0, y0] = battle.frames[0][k];
        const [x1, y1] = battle.frames[1][k];
        assert.ok(Math.abs(hero.x - (x0 + x1) / 2) < 1e-9);
        assert.ok(Math.abs(hero.y - (y0 + y1) / 2) < 1e-9);
    });
});

test('the end of the replay agrees with the server summary', () => {
    const end = replay.stateAt(replay.duration);
    const { summary } = battle;
    assert.equal(end.destruction, summary.destruction);
    assert.equal(end.coreDestroyed, summary.core_destroyed);
    assert.deepEqual(end.heroes.map((h) => h.alive), summary.heroes.map((h) => h.survived));
});

test('hero hit points from the events match the recorded frames', () => {
    const last = battle.frames.length - 1;
    const end = replay.stateAt(replay.duration);
    end.heroes.forEach((hero, k) => assert.equal(hero.hp, battle.frames[last][k][2]));
});

test('an effect is visible for its lifetime and then gone', () => {
    const strike = battle.events.find((e) => e.type === 'strike');
    const during = replay.stateAt(strike.t + 1).effects.some((fx) => fx.event === strike);
    const after = replay.stateAt(strike.t + EFFECT_TICKS.strike + 1).effects.some((fx) => fx.event === strike);
    assert.equal(during, true);
    assert.equal(after, false);
});

test('time outside the battle is clamped', () => {
    assert.deepEqual(replay.stateAt(-50).heroes, replay.stateAt(0).heroes);
    assert.equal(replay.stateAt(replay.duration + 999).destruction, battle.summary.destruction);
});

test('a blow is wound up before it lands and followed through after', () => {
    const blow = { t: 20, type: 'strike', hero: 0, building: 1 };
    assert.equal(poseOfBlow(null, blow, 16).phase, -1);
    assert.equal(poseOfBlow(null, blow, 18).phase, -0.5);
    assert.equal(poseOfBlow(blow, null, 20).phase, 0);
    assert.equal(poseOfBlow(blow, null, 23).phase, 1);
    assert.equal(poseOfBlow(blow, null, 24), null);
    assert.equal(poseOfBlow(null, blow, 15), null);
});

test('heroes standing on the same spot are pushed apart', () => {
    const heroes = [0, 1, 2].map((id) => ({ id, x: 5, y: 5, alive: true, leap: null }));
    separate(heroes);
    for (let i = 0; i < heroes.length; i++) {
        for (let j = i + 1; j < heroes.length; j++) {
            assert.ok(Math.hypot(heroes[i].x - heroes[j].x, heroes[i].y - heroes[j].y) > 0.3);
        }
    }
});

test('a hero in the air is not pushed, and a fallen one does not push', () => {
    const heroes = [
        { id: 0, x: 5, y: 5, alive: true, leap: 0.5 },
        { id: 1, x: 5, y: 5, alive: true, leap: null },
        { id: 2, x: 5, y: 5, alive: false, leap: null },
    ];
    separate(heroes);
    for (const h of heroes) assert.deepEqual([h.x, h.y], [5, 5]);
});

test('the replay knows when a blade is in the air', () => {
    const replay = createReplay(battle);
    const leap = battle.events.find((e) => e.type === 'leap');
    assert.ok(leap, 'the fixture has a leap');
    const mid = replay.stateAt((leap.t + leap.until) / 2).heroes[leap.hero];
    assert.ok(mid.leap > 0 && mid.leap < 1);
    assert.equal(replay.stateAt(leap.until + 1).heroes[leap.hero].leap, null);
});
