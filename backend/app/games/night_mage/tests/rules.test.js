import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sendLevel } from '../js/app/Game.js';
import { ACTORS, FRAMES } from '../js/config/Sprites.js';
import { ENEMIES } from '../js/config/Enemies.js';
import { INVADER, WAVES } from '../js/config/Tuning.js';
import { poseFrame } from '../js/render/poses.js';
import { bossFor, powerFor, waveShape } from '../js/sim/Director.js';
import { createEnemy } from '../js/sim/enemies/registry.js';

test('the invader level matches the server rules (night_mage_be/service.py)', () => {
    const server = readFileSync(fileURLToPath(new URL('../../night_mage_be/service.py', import.meta.url)), 'utf8');
    const constant = (name) => Number(server.match(new RegExp(`^${name} = (\\d+)`, 'm'))[1]);
    assert.equal(constant('MIN_WAVE'), INVADER.minWaveToSend);
    assert.equal(constant('WAVES_PER_LEVEL'), INVADER.wavesPerLevel);
    assert.equal(constant('MAX_LEVEL'), INVADER.maxLevel);
    const expected = [[0, 0], [2, 0], [3, 1], [6, 1], [7, 2], [19, 5], [400, 5]];
    for (const [wave, level] of expected) assert.equal(sendLevel(wave), level, `wave ${wave}`);
});

test('every monster and the mage have a pose for every state they can be in', () => {
    const states = {
        mage: ['idle', 'cast', 'hurt', 'shield', 'dead'],
        bat: ['spawn', 'fly', 'stagger'],
        warrior: ['spawn', 'walk', 'idle', 'fall', 'windup', 'recover', 'stagger'],
        archer: ['spawn', 'walk', 'idle', 'fall', 'windup', 'recover', 'stagger'],
        brawler: ['spawn', 'walk', 'idle', 'fall', 'windup', 'throw', 'recover', 'stagger'],
    };
    for (const [actor, list] of Object.entries(states)) {
        for (const state of list) {
            const pose = ACTORS[actor].poses[state];
            assert.ok(pose, `${actor} has no pose for ${state}`);
            assert.ok(ACTORS[actor].anims.includes(pose.anim), `${actor}.${state} uses a sheet it does not load`);
        }
    }
});

test('timed poses spread their frames over the swing and stay inside the strip', () => {
    const stats = ENEMIES.warrior;
    assert.deepEqual(poseFrame('warrior', 'windup', 0, stats), { anim: 'ATTACK', frame: 0 });
    assert.equal(poseFrame('warrior', 'windup', stats.windup * 0.99, stats).frame, 6);
    assert.equal(poseFrame('warrior', 'windup', 99, stats).frame, 6);
    for (let t = 0; t < 5; t += 0.07) {
        const { frame } = poseFrame('mage', 'idle', t);
        assert.ok(frame >= 0 && frame < FRAMES);
    }
    assert.equal(poseFrame('mage', 'cast', 99).frame, FRAMES - 1, 'one-shot poses hold their last frame');
});

test('from wave 6 the monsters need two bolts (the bats from wave 10), and a boss is never weaker than its wave', () => {
    const hp = (kind, wave) => createEnemy(kind, { id: 1, x: 0, y: 0, power: powerFor(kind, waveShape(wave).power) }).maxHp;
    assert.deepEqual([1, 5, 6, 10].map((wave) => hp('warrior', wave)), [1, 1, 2, 2]);
    assert.deepEqual([5, 6].map((wave) => hp('archer', wave)), [1, 2]);
    assert.deepEqual([6, 9, 10].map((wave) => hp('bat', wave)), [1, 1, 2]);
    assert.ok(hp('brawler', 6) > hp('brawler', 5));
    const weak = [{ id: 'a', kind: 'warrior', level: 1, name: 'A' }];
    assert.deepEqual([4, 6, 10, 14, 18, 30].map((wave) => bossFor(0, weak, { seed: 1, wave }).invader.level), [1, 2, 3, 4, 5, 5]);
    assert.equal(bossFor(0, [{ ...weak[0], level: 5 }], { seed: 1, wave: 2 }).invader.level, 5, 'a strong one stays strong');
    assert.equal(weak[0].level, 1, 'the roster itself is not changed');
});

test('waves grow and level off', () => {
    const early = waveShape(1);
    const late = waveShape(30);
    assert.ok(late.count > early.count);
    assert.ok(late.gap < early.gap);
    assert.ok(late.maxAlive <= WAVES.alive.max);
    assert.ok(late.power.speed <= 1.8);
});
