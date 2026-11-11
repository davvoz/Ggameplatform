import { project, toWorld } from './iso.js';

/**
 * Zoom and pan of the map (pure functions, tested). A camera is
 * { scale, ox, oy } as made by fitCamera / fitRegion; `limits` is
 * { min, max } for the scale; `view` is { w, h } of the canvas.
 */

/** Zoom by `factor` keeping the canvas point (px, py) where it is. */
export function zoomAt(camera, factor, px, py, limits) {
    const scale = Math.min(limits.max, Math.max(limits.min, camera.scale * factor));
    const k = scale / camera.scale;
    return { scale, ox: px + (camera.ox - px) * k, oy: py + (camera.oy - py) * k };
}

export function panBy(camera, dx, dy) {
    return { scale: camera.scale, ox: camera.ox + dx, oy: camera.oy + dy };
}

/** Keep the middle of the field on screen, so the city can never be lost off the edge. */
export function clampCamera(camera, grid, view) {
    const mid = project(grid / 2, grid / 2);
    const x = camera.ox + mid.x * camera.scale;
    const y = camera.oy + mid.y * camera.scale;
    const cx = Math.min(view.w, Math.max(0, x));
    const cy = Math.min(view.h, Math.max(0, y));
    return { scale: camera.scale, ox: camera.ox + cx - x, oy: camera.oy + cy - y };
}

/**
 * The same view on a resized canvas: the ground point that was in the middle
 * stays in the middle, and the zoom relative to the fitted view is kept.
 */
export function carryOver(old, oldView, oldBase, base, view) {
    const centre = toWorld(old, oldView.w / 2, oldView.h / 2);
    const scale = base.scale * (old.scale / oldBase.scale);
    const p = project(centre.x, centre.y);
    return { scale, ox: view.w / 2 - p.x * scale, oy: view.h / 2 - p.y * scale };
}
