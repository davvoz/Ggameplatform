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
