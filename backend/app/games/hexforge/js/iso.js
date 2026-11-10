/**
 * Isometric projection. World units are grid cells; (0,0) is the top corner
 * of the field. `z` is a height in unscaled screen pixels.
 */

export const TILE_W = 64;
export const TILE_H = 32;

/** World → unscaled screen offset. */
export function project(x, y, z = 0) {
    return { x: (x - y) * TILE_W / 2, y: (x + y) * TILE_H / 2 - z };
}

/**
 * Scale and offset that fit a grid×grid field inside width×height.
 * `headroom` keeps space above the field for tall buildings.
 */
export function fitCamera(grid, width, height, { margin = 16, headroom = 110 } = {}) {
    const minX = project(0, grid).x;
    const maxX = project(grid, 0).x;
    const minY = project(0, 0).y - headroom;
    const maxY = project(grid, grid).y;
    const scale = Math.max(0.05, Math.min(
        (width - 2 * margin) / (maxX - minX),
        (height - 2 * margin) / (maxY - minY),
    ));
    return {
        scale,
        ox: width / 2 - ((minX + maxX) / 2) * scale,
        oy: height / 2 - ((minY + maxY) / 2) * scale,
    };
}

/** World → canvas pixels through a camera from fitCamera. */
export function toScreen(camera, x, y, z = 0) {
    const p = project(x, y, z);
    return { x: camera.ox + p.x * camera.scale, y: camera.oy + p.y * camera.scale };
}

/** Canvas pixels → world point on the ground (inverse of toScreen with z = 0). */
export function toWorld(camera, sx, sy) {
    const a = (sx - camera.ox) / camera.scale / (TILE_W / 2);   // x - y
    const b = (sy - camera.oy) / camera.scale / (TILE_H / 2);   // x + y
    return { x: (a + b) / 2, y: (b - a) / 2 };
}

/**
 * Screen semi-axes of a circle of `radius` cells lying on the ground
 * (an iso circle is a 2:1 ellipse).
 */
export function groundEllipse(camera, radius) {
    const rx = radius * TILE_W / Math.SQRT2 * camera.scale;
    return { rx, ry: rx / 2 };
}

/** Painter's order: larger is nearer the viewer. */
export function depthOf(x, y) {
    return x + y;
}

/**
 * Scale and offset that fit a world region inside width×height minus the
 * `insets` (pixels kept free for the interface around the map).
 * `region` = { x0, y0, x1, y1 } in cells; `headroom` keeps space above it.
 */
export function fitRegion(region, width, height, { top = 0, right = 0, bottom = 0, left = 0, headroom = 0 } = {}) {
    const { x0, y0, x1, y1 } = region;
    const minX = project(x0, y1).x;
    const maxX = project(x1, y0).x;
    const minY = project(x0, y0).y - headroom;
    const maxY = project(x1, y1).y;
    const availW = Math.max(1, width - left - right);
    const availH = Math.max(1, height - top - bottom);
    const scale = Math.max(0.05, Math.min(availW / (maxX - minX), availH / (maxY - minY)));
    return {
        scale,
        ox: left + availW / 2 - ((minX + maxX) / 2) * scale,
        oy: top + availH / 2 - ((minY + maxY) / 2) * scale,
    };
}

/** The cells around every building, `pad` cells wide, at least `min` cells across, inside the grid. */
export function regionAround(buildings, grid, pad = 1.5, min = 9) {
    if (!buildings.length) return { x0: 0, y0: 0, x1: grid, y1: grid };
    let x0 = Math.min(...buildings.map((b) => b.x)) - pad;
    let y0 = Math.min(...buildings.map((b) => b.y)) - pad;
    let x1 = Math.max(...buildings.map((b) => b.x + b.size)) + pad;
    let y1 = Math.max(...buildings.map((b) => b.y + b.size)) + pad;
    const grow = (a, b) => {
        const extra = Math.max(0, min - (b - a)) / 2;
        return [a - extra, b + extra];
    };
    [x0, x1] = grow(x0, x1);
    [y0, y1] = grow(y0, y1);
    const clamp = (v) => Math.max(0, Math.min(grid, v));
    return { x0: clamp(x0), y0: clamp(y0), x1: clamp(x1), y1: clamp(y1) };
}
