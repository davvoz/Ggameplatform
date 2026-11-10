import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EFFECT_TICKS, createReplay } from '../js/replay.js';

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
