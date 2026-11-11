import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carryOver, clampCamera, panBy, zoomAt } from '../js/camera.js';
import { fitRegion, project, regionAround, toScreen, toWorld } from '../js/iso.js';
import { leagueProgress } from '../js/leagues.js';

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

test('zoom stops at the limits', () => {
    const camera = { scale: 1, ox: 0, oy: 0 };
    assert.equal(zoomAt(camera, 10, 0, 0, { min: 0.5, max: 2 }).scale, 2);
    assert.equal(zoomAt(camera, 0.01, 0, 0, { min: 0.5, max: 2 }).scale, 0.5);
});

test('panning moves the map by the drag', () => {
    assert.deepEqual(panBy({ scale: 2, ox: 10, oy: 20 }, 5, -7), { scale: 2, ox: 15, oy: 13 });
});

test('the middle of the field cannot leave the screen', () => {
    const view = { w: 400, h: 800 };
    const lost = { scale: 1, ox: -5000, oy: 9000 };
    const kept = clampCamera(lost, 18, view);
    const mid = toScreen(kept, 9, 9);
    assert.ok(mid.x >= 0 && mid.x <= view.w);
    assert.ok(mid.y >= 0 && mid.y <= view.h);
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

test('the league bar fills from the floor of the league to the next one', () => {
    assert.equal(leagueProgress(200, 'Silver', { name: 'Gold', at: 500 }), 0);
    assert.equal(leagueProgress(350, 'Silver', { name: 'Gold', at: 500 }), 0.5);
    assert.equal(leagueProgress(2500, 'Mythic', null), 1);
});
