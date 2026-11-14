import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sendLevel } from '../js/app/Game.js';
import { ACTORS, FRAMES } from '../js/config/Sprites.js';
import { ENEMIES } from '../js/config/Enemies.js';
import { INVADER, WAVES } from '../js/config/Tuning.js';
import { poseFrame } from '../js/render/poses.js';
import { waveShape } from '../js/sim/Director.js';

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

test('waves grow and level off', () => {
    const early = waveShape(1);
    const late = waveShape(30);
    assert.ok(late.count > early.count);
    assert.ok(late.gap < early.gap);
    assert.ok(late.maxAlive <= WAVES.alive.max);
    assert.ok(late.power.speed <= 1.8);
});
