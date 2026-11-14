/**
 * Pixel-art helpers shared by the views: grids painted into canvases and
 * rings made of square cells, so every effect keeps the chunky look of the
 * sprites.
 */
const TAU = Math.PI * 2;

/**
 * Paints a grid of digits into a canvas: 0 is empty, n is `colors[n - 1]`.
 * @param {{grid: string[], colors: string[]}} art
 * @param {number} px size of a cell in canvas pixels
 * @returns {HTMLCanvasElement}
 */
export function paintGrid({ grid, colors }, px) {
    const canvas = document.createElement('canvas');
    canvas.width = grid[0].length * px;
    canvas.height = grid.length * px;
    const ctx = canvas.getContext('2d');
    grid.forEach((row, y) => {
        [...row].forEach((cell, x) => {
            const shade = Number(cell);
            if (shade === 0) return;
            ctx.fillStyle = colors[shade - 1];
            ctx.fillRect(x * px, y * px, px, px);
        });
    });
    return canvas;
}

/**
 * Where the cells of a ring go: `count` square cells around an ellipse,
 * snapped to a grid of `size`, without doubles. Pure, for the tests too.
 * @returns {{x: number, y: number}[]} the top left corners
 */
export function ringCells(x, y, rx, ry, size, count = Math.max(8, Math.round((TAU * Math.max(rx, ry)) / size))) {
    const cells = new Map();
    for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (TAU * i) / count;
        const cx = Math.round((x + Math.cos(angle) * rx) / size) * size;
        const cy = Math.round((y + Math.sin(angle) * ry) / size) * size;
        cells.set(`${cx},${cy}`, { x: cx - size / 2, y: cy - size / 2 });
    }
    return [...cells.values()];
}

/** A ring of square cells (an ellipse when `ry` is given). */
export function pixelRing(ctx, x, y, radius, { size = 6, color = '#ffffff', ry = radius } = {}) {
    ctx.fillStyle = color;
    for (const cell of ringCells(x, y, radius, ry, size)) ctx.fillRect(cell.x, cell.y, size, size);
}

/** An alpha cut into a few steps: pixel art fades in steps, not smoothly. */
export function stepped(alpha, steps = 4) {
    return Math.ceil(Math.max(0, Math.min(1, alpha)) * steps) / steps;
}
