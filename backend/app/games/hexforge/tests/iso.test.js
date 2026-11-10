import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    TILE_H, TILE_W, fitCamera, groundEllipse, project, rotatePoint, rotateRect, rotateVector, toScreen,
} from '../js/iso.js';

test('one step along x goes down-right, one along y goes down-left', () => {
    assert.deepEqual(project(1, 0), { x: TILE_W / 2, y: TILE_H / 2 });
    assert.deepEqual(project(0, 1), { x: -TILE_W / 2, y: TILE_H / 2 });
});

test('height lifts a point straight up', () => {
    assert.deepEqual(project(2, 2, 40), { x: 0, y: 2 * TILE_H - 40 });
});

test('the fitted field stays inside the canvas', () => {
    for (const [w, h] of [[1200, 800], [390, 420], [800, 1400]]) {
        const camera = fitCamera(18, w, h);
        for (const [x, y] of [[0, 0], [18, 0], [0, 18], [18, 18]]) {
            const p = toScreen(camera, x, y);
            assert.ok(p.x >= 0 && p.x <= w, `x ${p.x} outside ${w}`);
            assert.ok(p.y >= 0 && p.y <= h, `y ${p.y} outside ${h}`);
        }
    }
});

test('a circle on the ground is a 2:1 ellipse', () => {
    const { rx, ry } = groundEllipse({ scale: 1 }, 2);
    assert.ok(Math.abs(rx - 2 * ry) < 1e-9);
});

test('four quarter turns bring every point back, and each turn can be undone', () => {
    for (let rot = 0; rot < 4; rot++) {
        const v = rotatePoint(3, 5, 18, rot);
        const back = rotatePoint(v.x, v.y, 18, -rot);
        assert.deepEqual(back, { x: 3, y: 5 });
    }
    let p = { x: 3, y: 5 };
    for (let k = 0; k < 4; k++) p = rotatePoint(p.x, p.y, 18, 1);
    assert.deepEqual(p, { x: 3, y: 5 });
    assert.deepEqual(rotatePoint(9, 9, 18, 1), { x: 9, y: 9 });   // the middle stays put
});

test('a turned building keeps its size and stays inside the field', () => {
    for (let rot = 0; rot < 4; rot++) {
        const r = rotateRect({ x0: 2, y0: 4, x1: 4, y1: 6 }, 18, rot);
        assert.equal(r.x1 - r.x0, 2);
        assert.equal(r.y1 - r.y0, 2);
        assert.ok(r.x0 >= 0 && r.y1 <= 18);
    }
    assert.deepEqual(rotateRect({ x0: 2, y0: 4, x1: 4, y1: 6 }, 18, 2), { x0: 14, y0: 12, x1: 16, y1: 14 });
});

test('a direction turns with the points', () => {
    for (let rot = 0; rot < 4; rot++) {
        const a = rotatePoint(3, 5, 18, rot);
        const b = rotatePoint(4, 7, 18, rot);
        assert.deepEqual(rotateVector(1, 2, rot), { dx: b.x - a.x, dy: b.y - a.y });
    }
});
