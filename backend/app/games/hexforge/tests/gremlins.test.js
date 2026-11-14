import { test } from 'node:test';
import assert from 'node:assert/strict';
import { edgePoint, gangSchedule, gremlinSpeed, gremlinStars } from '../js/core/minigames/gremlins.js';

test('the gang sets off one after another, faster and faster', () => {
    let s = 7;
    const rng = () => {
        s = (s * 16807) % 2147483647;
        return s / 2147483647;
    };
    const times = gangSchedule(12, rng);
    assert.equal(times.length, 12);
    for (let i = 1; i < times.length; i++) assert.ok(times[i] > times[i - 1]);
    assert.ok(times[11] < 16);
});

test('later gremlins run faster, up to a limit', () => {
    assert.ok(gremlinSpeed(10) > gremlinSpeed(0));
    assert.equal(gremlinSpeed(100), 2.8);
});

test('stars at 5, 9 and all 12 caught', () => {
    assert.deepEqual([0, 4, 5, 8, 9, 11, 12].map((n) => gremlinStars(n, 12)), [0, 0, 1, 1, 2, 2, 3]);
});

test('a gremlin starts on the edge of the field', () => {
    for (const r of [0, 0.3, 0.6, 0.9]) {
        const p = edgePoint(18, () => r);
        const onEdge = p.x < 1 || p.y < 1 || p.x > 17 || p.y > 17;
        assert.ok(onEdge, JSON.stringify(p));
    }
});
