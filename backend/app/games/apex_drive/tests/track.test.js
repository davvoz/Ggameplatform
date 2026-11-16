import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS } from '../js/config/Tracks.js';
import { WEATHER } from '../js/config/Weather.js';
import { Track, wrap } from '../js/sim/Track.js';
import { duskValley, OPTIONS, squareTrack } from './support/track.js';

const TAU = Math.PI * 2;

test('every track turns exactly once around and closes on itself', () => {
    for (const def of Object.values(TRACKS)) {
        const track = new Track(def, OPTIONS);
        assert.ok(Math.abs(Math.abs(track.lapTurn) - TAU) < 1e-6, `${def.name} turns ${track.lapTurn}`);
        const first = track.plan[0];
        const last = track.plan.at(-1);
        const step = track.segmentLength / def.scale;
        assert.ok(Math.hypot(first.x - last.x, first.y - last.y) < step * 1.5, `${def.name} has a gap`);
    }
});

test('the road is cut in equal segments and its length is a whole number of them', () => {
    const track = duskValley();
    assert.equal(track.length, track.segments.length * track.segmentLength);
    track.segments.forEach((segment, i) => assert.equal(segment.index, i));
});

test('bends ease in and out on every track: no jump between neighbouring segments', () => {
    for (const [id, def] of Object.entries(TRACKS)) {
        const { segments } = new Track({ ...def, id }, OPTIONS);
        const jumps = segments.map((s, i) => Math.abs(segments[(i + 1) % segments.length].curve - s.curve));
        assert.ok(Math.max(...jumps) < 1.5, `${id}: largest jump ${Math.max(...jumps)}`);
    }
});

test('every track has a known weather, sensible laps and points 10 to 30 map units apart', () => {
    for (const [id, def] of Object.entries(TRACKS)) {
        assert.ok(def.weather in WEATHER, id);
        assert.ok(def.laps >= 1 && def.laps <= 9, id);
        def.points.forEach((p, i) => {
            const q = def.points[(i + 1) % def.points.length];
            const gap = Math.hypot(q[0] - p[0], q[1] - p[1]);
            assert.ok(gap >= 10 && gap <= 30, `${id}: points ${i} and ${i + 1} are ${gap.toFixed(1)} apart`);
        });
    }
});

test('heights join: each segment ends where the next begins', () => {
    const { segments } = duskValley();
    segments.forEach((s, i) => assert.equal(s.y2, segments[(i + 1) % segments.length].y1));
});

test('queries wrap around the lap, backwards too', () => {
    const track = duskValley();
    assert.equal(wrap(-1, 10), 9);
    assert.equal(track.segmentAt(-1).index, track.segments.length - 1);
    assert.equal(track.segmentAt(track.length + 5).index, 0);
    assert.equal(track.elevationAt(track.length * 2 + 300), track.elevationAt(300));
});

test('the heading never jumps, not even across the start line', () => {
    const track = duskValley();
    let previous = track.headingAt(0);
    for (let z = 50; z < track.length * 2; z += 50) {
        const heading = track.headingAt(z);
        assert.ok(Math.abs(heading - previous) < 0.05, `jump at ${z}`);
        previous = heading;
    }
    assert.ok(Math.abs(track.headingAt(track.length) - track.headingAt(0) - track.lapTurn) < 1e-9);
});

test('a hill on the map is a hill on the road', () => {
    const flat = squareTrack();
    const hilly = squareTrack({ hill: 3 });
    assert.ok(flat.segments.every((s) => Math.abs(s.y1) < 1e-9));
    const top = Math.max(...hilly.segments.map((s) => s.y1));
    assert.ok(top > 2500 && top < 3500, `top ${top}`);
    assert.ok(hilly.slopeAt(hilly.length * 0.05) > 0);
});

test('the plan point moves with z along the map', () => {
    const track = squareTrack();
    const a = track.planAt(0);
    const b = track.planAt(track.length / 8);
    assert.ok(b.x > a.x + 5, 'the first side runs to the right');
});

/** Whether segments p1-p2 and q1-q2 cross. */
function crosses(p1, p2, q1, q2) {
    const side = (a, b, c) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
    return side(p1, p2, q1) !== side(p1, p2, q2) && side(q1, q2, p1) !== side(q1, q2, p2);
}

test('no track crosses itself', () => {
    for (const [id, def] of Object.entries(TRACKS)) {
        const plan = new Track({ ...def, id }, OPTIONS).plan.filter((_, i) => i % 8 === 0);
        for (let i = 0; i < plan.length; i++) {
            for (let j = i + 2; j < plan.length; j++) {
                if (i === 0 && j === plan.length - 1) continue;
                const [a, b, c, d] = [plan[i], plan[(i + 1) % plan.length], plan[j], plan[(j + 1) % plan.length]];
                assert.ok(!crosses(a, b, c, d), `${id} crosses itself near points ${i} and ${j}`);
            }
        }
    }
});
