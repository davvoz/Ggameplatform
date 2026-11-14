import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GOAL, hitsToScore, sessionXp, spawnGap, starsFor, targetLife } from '../js/minigames/training.js';
import { masteryOf, trainBlocker } from '../js/ui/panels/heroPanel.js';

test('hits turn into the server score: two hits a perfect beat, one a good beat', () => {
    assert.deepEqual(hitsToScore(0), { perfect: 0, good: 0 });
    assert.deepEqual(hitsToScore(9), { perfect: 4, good: 1 });
    assert.deepEqual(hitsToScore(GOAL), { perfect: 10, good: 0 });
    assert.deepEqual(hitsToScore(GOAL + 7), { perfect: 10, good: 0 });
    const { perfect, good } = hitsToScore(19);
    assert.ok(perfect + good <= 10);
});

test('the XP grows with the hits, full at the goal', () => {
    assert.equal(sessionXp(60, GOAL), 60);
    assert.equal(sessionXp(60, 10), 30);
    assert.equal(sessionXp(15, 0), 0);
});

test('targets come faster and fade faster as time runs out, and for evolved heroes', () => {
    assert.ok(spawnGap(14) < spawnGap(0));
    assert.ok(targetLife(14) < targetLife(0));
    assert.ok(targetLife(0, 3) < targetLife(0, 1));
    assert.ok(targetLife(15, 3) >= 0.65);
});

test('a hero at the forge, hurt or rested cannot train', () => {
    const training = { sessions: 3, left: 2, maxXp: 15 };
    assert.equal(trainBlocker({ cls: 'guardian' }, training, 1000), null);
    assert.match(trainBlocker({ cls: 'guardian', evolving: 3 }, training, 1000), /forge/);
    assert.match(trainBlocker({ cls: 'guardian', injured_until: 2000 }, training, 1000), /Hurt/);
    assert.match(trainBlocker({ cls: 'guardian' }, { ...training, left: 0 }, 1000), /tomorrow/);
});

test('stars for a session: one at 6 hits, two at 12, three at 18', () => {
    assert.deepEqual([0, 5, 6, 11, 12, 17, 18, 25].map(starsFor), [0, 0, 1, 1, 2, 2, 3, 3]);
});

test('mastery: a level every 100 points, its bonus, the bar inside the level, a top', () => {
    const t = { perLevel: 100, levels: 10, bonus: 0.01 };
    assert.deepEqual(masteryOf(0, t), { level: 0, maxed: false, into: 0, pct: 0 });
    assert.deepEqual(masteryOf(362, t), { level: 3, maxed: false, into: 62, pct: 3 });
    assert.deepEqual(masteryOf(1000, t), { level: 10, maxed: true, into: 100, pct: 10 });
});
