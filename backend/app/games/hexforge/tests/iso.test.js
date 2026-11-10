import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE_H, TILE_W, fitCamera, groundEllipse, project, toScreen } from '../js/iso.js';

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
