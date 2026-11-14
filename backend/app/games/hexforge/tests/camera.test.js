import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampCamera, panBy, zoomAt } from '../js/core/camera.js';
import { toScreen } from '../js/core/iso.js';

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
