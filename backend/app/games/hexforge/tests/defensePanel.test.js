import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adviceFor, describeWorst, ratingOf, stageNote, stageTitle } from '../js/ui/panels/defensePanel.js';
import { percentHeld, weakestSide } from '../js/core/defense.js';

const sides = (n, e, s, w) => ({
    north: { held: n, total: 36 }, east: { held: e, total: 36 },
    south: { held: s, total: 36 }, west: { held: w, total: 36 },
});
const report = (held, side = sides(0, 0, 0, 0)) => ({ held, total: 144, sides: side });

test('the rating follows the share of raids held', () => {
    assert.equal(ratingOf(report(0)), 'Wide open');
    assert.equal(ratingOf(report(1)), 'Fragile');
    assert.equal(ratingOf(report(36)), 'Solid');
    assert.equal(ratingOf(report(72)), 'Strong');
    assert.equal(ratingOf(report(144)), 'Fortress');
    assert.equal(percentHeld(report(36)), 25);
});

test('the weakest side is the one holding the fewest raids', () => {
    assert.equal(weakestSide(sides(20, 24, 3, 22)), 'south');
    assert.equal(weakestSide(sides(9, 9, 9, 9)), null);
});

test('the advice points at what to do next', () => {
    assert.match(adviceFor(report(0)), /Forge towers/);
    assert.match(adviceFor(report(40, sides(12, 14, 11, 3))), /west side/);
    assert.match(adviceFor(report(36, sides(9, 9, 9, 9))), /aim/);
});

test('the worst raid reads as a sentence', () => {
    const worst = { raid_name: 'Blade rush', side: 'north', priority: 'towers', tactic: 'spread' };
    assert.equal(describeWorst(worst), 'Blade rush from the north, going for towers, spread');
});

test('the stage note says what the test unlocked, or what is left to hold', () => {
    const next = { number: 4, name: 'Ascended, items Lv 2' };
    const stage = { number: 3, name: 'Ascended ★★★' };
    assert.equal(stageTitle(stage), 'Stage 3 · Ascended ★★★');
    assert.match(stageNote({ stage, next, held: 144, total: 144, unlocked: 4, advanced: true }), /stage 4 unlocked/);
    assert.match(stageNote({ stage, next, held: 141, total: 144, unlocked: 3, advanced: false }), /Hold 3 more raids to unlock stage 4/);
    assert.match(stageNote({ stage, next, held: 100, total: 144, unlocked: 6, advanced: false }), /top is stage 6/);
});
