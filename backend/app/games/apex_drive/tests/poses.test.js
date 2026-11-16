import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARS } from '../js/config/Cars.js';
import { LEAN } from '../js/config/Tuning.js';
import { Lean, poseAt } from '../js/render/art/lean.js';
import { mirrorRows, posesOf } from '../js/render/art/poses.js';

const range = (steps) => Array.from({ length: steps * 2 + 1 }, (_, i) => i - steps);

test('every car: its poses all of one size, each left turn the mirror of its right one, the straight one symmetric', () => {
    for (const [id, car] of Object.entries(CARS)) {
        const { width, height, steps, poses } = posesOf(car);
        assert.equal(steps, car.turns?.length ?? 0, id);
        for (const pose of range(steps)) {
            assert.equal(poses[pose].rows.length, height, `${id} ${pose}`);
            assert.ok(poses[pose].rows.every((row) => row.length === width), `${id} ${pose}`);
            // the wheels stand on the bottom row in every pose: the car does not hop when it turns
            assert.notEqual(poses[pose].rows.at(-1).replaceAll('.', ''), '', `${id} ${pose}`);
        }
        for (let step = 1; step <= steps; step++) assert.deepEqual(poses[-step].rows, mirrorRows(poses[step].rows), `${id} ${step}`);
        assert.deepEqual(poses[0].rows, mirrorRows(poses[0].rows), id);
    }
});

test('the treads are the wheel columns with a W, and the exhausts sit on the car in every pose', () => {
    const { steps, poses } = posesOf(CARS.comet);
    assert.deepEqual(poses[0].treads.sort((a, b) => a - b), [5, 44]);
    for (const pose of range(steps)) {
        const { rows, exhaust, treads } = poses[pose];
        assert.ok(treads.length >= 2, `pose ${pose}`);
        assert.equal(exhaust.length, 2);
        for (const { x, y } of exhaust) assert.notEqual(rows[y][x], '.', `pose ${pose}: pipe at ${x},${y}`);
    }
});

test('a car with no turns drawn has the straight pose only; turns of the wrong size are refused', () => {
    const { left, exhaust, turns } = CARS.comet;
    const plain = posesOf({ left, exhaust });
    assert.equal(plain.steps, 0);
    assert.equal(plain.width, left[0].length * 2);
    const odd = { left, exhaust, turns: turns.map((turn) => ({ ...turn, rows: turn.rows.map((row) => `${row}.`) })) };
    assert.throws(() => posesOf(odd), /even margin/);
    const short = { left, exhaust, turns: [turns[0], { ...turns[1], rows: turns[1].rows.slice(1) }] };
    assert.throws(() => posesOf(short), /rows/);
    const narrow = { left, exhaust, turns: [turns[0], { ...turns[1], rows: turns[1].rows.map((row) => row.slice(1)) }] };
    assert.throws(() => posesOf(narrow), /pixels/);
});

test('the pose for a lean: straight, then each turn in its share of the way to full', () => {
    assert.equal(poseAt(0, 2, 0.6), 0);
    assert.equal(poseAt(0.29, 2, 0.6), 0);
    assert.equal(poseAt(0.31, 2, 0.6), 1);
    assert.equal(poseAt(0.6, 2, 0.6), 2);
    assert.equal(poseAt(1, 2, 0.6), 2);
    assert.equal(poseAt(-0.4, 2, 0.6), -1);
    assert.ok(Object.is(poseAt(-0.1, 2, 0.6), 0), 'no -0 pose');
    assert.equal(poseAt(1, 0, 0.6), 0, 'a car with no turns stays straight');
});

test('steering snapped to full lock: the drawn car goes through every pose, one frame or more each', () => {
    const lean = new Lean(2, LEAN);
    const seen = [];
    for (let frame = 0; frame < 30; frame++) seen.push(lean.follow(1, 1 / 60));
    assert.deepEqual([...new Set(seen)], [0, 1, 2], 'in order, none skipped');
    for (const pose of [0, 1]) assert.ok(seen.filter((p) => p === pose).length >= 4, `pose ${pose} shown ${seen.filter((p) => p === pose).length} frames`);
    // and back the other way, through straight
    const back = [];
    for (let frame = 0; frame < 60; frame++) back.push(lean.follow(-1, 1 / 60));
    assert.deepEqual([...new Set(back)], [2, 1, 0, -1, -2]);
});

test('steering held on a pose edge does not flicker between two poses', () => {
    const lean = new Lean(2, LEAN);
    for (let frame = 0; frame < 60; frame++) lean.follow(0.3, 1 / 60);
    const shown = new Set();
    for (let frame = 0; frame < 120; frame++) shown.add(lean.follow(frame % 2 ? 0.32 : 0.28, 1 / 60));
    assert.equal(shown.size, 1);
});
