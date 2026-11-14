import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carryOver, zoomAt } from '../js/core/camera.js';
import {
    COMPASS, TILE_H, TILE_W, compassOffset, fitCamera, fitRegion, groundEllipse, northBearing, project, regionAround, rotatePoint, rotateRect, rotateVector, toScreen, toWorld,
} from '../js/core/iso.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('zooming keeps the point under the fingers where it is', () => {
    const camera = { scale: 1, ox: 200, oy: 100 };
    const before = toWorld(camera, 150, 260);
    const zoomed = zoomAt(camera, 1.7, 150, 260, { min: 0.2, max: 5 });
    const p = toScreen(zoomed, before.x, before.y);
    close(p.x, 150);
    close(p.y, 260);
    close(zoomed.scale, 1.7);
});

test('a resize keeps the zoom and the point in the middle', () => {
    const base = { scale: 1, ox: 0, oy: 0 };
    const old = { scale: 2, ox: 30, oy: -40 };
    const centre = toWorld(old, 200, 400);
    const newBase = { scale: 0.5, ox: 0, oy: 0 };
    const now = carryOver(old, { w: 400, h: 800 }, base, newBase, { w: 600, h: 500 });
    close(now.scale, 1);
    const p = toScreen(now, centre.x, centre.y);
    close(p.x, 300);
    close(p.y, 250);
});

test('a fitted region sits inside the free part of the screen', () => {
    const region = { x0: 4, y0: 5, x1: 12, y1: 11 };
    const insets = { top: 80, bottom: 160, left: 0, right: 0 };
    const camera = fitRegion(region, 390, 844, insets);
    for (const [x, y] of [[4, 5], [12, 5], [4, 11], [12, 11]]) {
        const p = toScreen(camera, x, y);
        assert.ok(p.x >= -1e-6 && p.x <= 390 + 1e-6, `x ${p.x}`);
        assert.ok(p.y >= 80 - 1e-6 && p.y <= 844 - 160 + 1e-6, `y ${p.y}`);
    }
    assert.ok(project(1, 0).x > 0);
});

test('the region around the buildings is padded, at least min wide, and inside the grid', () => {
    const r = regionAround([{ x: 8, y: 8, size: 2 }], 18, 1, 9);
    assert.ok(r.x1 - r.x0 >= 9 - 1e-9);
    assert.ok(r.y1 - r.y0 >= 9 - 1e-9);
    const edge = regionAround([{ x: 0, y: 0, size: 3 }], 18, 2, 4);
    assert.equal(edge.x0, 0);
    assert.equal(edge.y0, 0);
    assert.deepEqual(regionAround([], 18), { x0: 0, y0: 0, x1: 18, y1: 18 });
});

test('screen to world undoes world to screen', () => {
    const camera = fitCamera(18, 900, 600);
    for (const [x, y] of [[0, 0], [3.25, 11.5], [17, 2]]) {
        const p = toScreen(camera, x, y);
        const back = toWorld(camera, p.x, p.y);
        assert.ok(Math.abs(back.x - x) < 1e-9 && Math.abs(back.y - y) < 1e-9);
    }
});

test('the compass points where the turned map says, and turns smoothly in between', () => {
    const near = (a, b) => assert.ok(Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9, `${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
    near(compassOffset(...COMPASS.N, 0), { x: 1, y: -0.5 });          // north: up-right
    for (let rot = 0; rot < 4; rot++) {
        for (const [dx, dy] of Object.values(COMPASS)) {
            const v = rotateVector(dx, dy, rot);
            const p = project(v.dx, v.dy);
            near(compassOffset(dx, dy, rot), { x: p.x / (TILE_W / 2), y: p.y / (TILE_W / 2) });
        }
    }
    const half = compassOffset(...COMPASS.N, 0.5);                    // halfway through a turn: due right
    near(half, { x: Math.SQRT2, y: 0 });
});

test('north bearing: up-right at first, clockwise with each turn', () => {
    const deg = Math.atan2(1, 0.5) * 180 / Math.PI;                  // ≈ 63.4°
    assert.ok(Math.abs(northBearing(0) - deg) < 1e-9);
    assert.ok(Math.abs(northBearing(0.5) - 90) < 1e-9);
    assert.ok(Math.abs(northBearing(1) - (180 - deg)) < 1e-9);
    assert.ok(Math.abs(northBearing(2) - (180 + deg)) < 1e-9);
    assert.ok(Math.abs(northBearing(4) - deg) < 1e-9);
});

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
