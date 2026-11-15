import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INVADER, WORLD } from '../js/config/Tuning.js';
import { BOSS_FALL, bossFallPose, skyPoint } from '../js/render/BossFallArt.js';

test('a fallen boss shudders, flies up spinning and shrinking, and vanishes in the sky', () => {
    const from = { x: 120, y: 380 };
    const to = skyPoint(from.x);
    assert.ok(to.x >= 120 && to.x < WORLD.width && to.y < 160, 'it vanishes on screen, up high');
    assert.equal(skyPoint(WORLD.width / 2).x, WORLD.width / 2);
    assert.equal(skyPoint(5000).x, WORLD.width - skyPoint(-5000).x, 'kept as far inside on both sides');

    const shaking = bossFallPose(0.1, from, to);
    assert.equal(shaking.phase, 'shudder');
    assert.ok(Math.abs(shaking.x - from.x) <= 4 && shaking.y === from.y && shaking.scale === 1);

    const start = BOSS_FALL.shudder;
    const flying = [0.1, 0.4, 0.7].map((t) => bossFallPose(start + t * BOSS_FALL.flight, from, to));
    assert.ok(flying.every((p) => p.phase === 'flight' && p.y < from.y), 'up into the air');
    assert.ok(flying[0].scale > flying[1].scale && flying[1].scale > flying[2].scale, 'shrinking');
    assert.ok(new Set(flying.map((p) => p.turn)).size > 1 && flying.every((p) => Number.isInteger(p.turn)), 'in quarter turns');

    const end = bossFallPose(start + BOSS_FALL.flight * 0.999, from, to);
    assert.ok(Math.hypot(end.x - to.x, end.y - to.y) < 2, 'right to the sky point');
    assert.equal(bossFallPose(start + BOSS_FALL.flight, from, to).phase, 'gone');
    assert.ok(INVADER.farewell >= BOSS_FALL.shudder + BOSS_FALL.flight + BOSS_FALL.twinkle * 0.8, 'the wave waits for the ding');
});
