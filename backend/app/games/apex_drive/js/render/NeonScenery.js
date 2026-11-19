import { makeCanvas } from './canvas.js';

/**
 * The scenery of the grid vortex, for render/Backdrop.js (and the world's
 * card): a huge setting sun in bands of colour cut by dark gaps, and ridges
 * of black mountains drawn in light, their crests glowing, a wireframe of
 * lines down their slopes. Painted once from a seed.
 */

const TAU = Math.PI * 2;

function dot(ctx, x, y, color, w = 1, h = 1) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** Where the theme's sun stands across a layer one turn wide. */
function sunX(width, sun) {
    return ((sun.heading / TAU + 1) % 1) * width;
}

/**
 * The setting sun, its foot at (cx, cy): bands of colour from the top down,
 * cut by dark gaps growing towards its foot, a halo round it.
 */
export function neonSunOn(ctx, cx, cy, { radius, bands, halo }) {
    for (let dy = -radius - 3; dy <= 0; dy++) {
        const half = Math.round(Math.sqrt(Math.max(0, (radius + 3) ** 2 - dy * dy)));
        dot(ctx, cx - half, cy + dy, halo, half * 2, 1);
    }
    for (let dy = -radius; dy <= 0; dy++) {
        const half = Math.round(Math.sqrt(radius * radius - dy * dy));
        const depth = (dy + radius) / radius;
        // the gaps: one every few rows in the lower half, thicker towards the foot
        const gap = depth > 0.45 && (dy + radius) % 5 < Math.round((depth - 0.45) * 6);
        if (!gap) dot(ctx, cx - half, cy + dy, bands[Math.min(bands.length - 1, Math.floor(depth * bands.length))], half * 2, 1);
    }
}

/** The setting sun as a layer one turn wide: its foot on the layer's bottom, where the theme's sun stands. */
export function paintNeonSun(width, theme, rng, { height }) {
    const { canvas, ctx } = makeCanvas(width, height);
    const cx = sunX(width, theme.sun);
    for (const shift of [0, -width, width]) neonSunOn(ctx, cx + shift, height - 2, theme.neonSun);
    return canvas;
}

/** A ridge across the layer: a height per column, peaks joined by straight slopes, closed round the turn. */
function ridge(width, rng, { height, peaks }) {
    const points = Array.from({ length: peaks }, (_, i) => ({ x: (i / peaks) * width + rng.range(-0.3, 0.3) * (width / peaks), y: rng.range(0.25, 0.95) * height }));
    const tops = new Array(width);
    for (let i = 0; i < peaks; i++) {
        const a = points[i];
        const b = i + 1 < peaks ? points[i + 1] : { x: points[0].x + width, y: points[0].y };
        for (let x = Math.floor(a.x); x < b.x; x++) tops[((x % width) + width) % width] = Math.round(height - (a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x)));
    }
    return tops.map((top) => top ?? height);
}

/** Black mountains drawn in light: the crest glowing, lines down the slopes and along them, darker below. */
export function paintGridPeaks(width, theme, rng, { height, look, peaks }) {
    const { canvas, ctx } = makeCanvas(width, height);
    const colors = theme.peaks[look];
    const tops = ridge(width, rng, { height, peaks });
    for (let x = 0; x < width; x++) {
        const top = tops[x];
        dot(ctx, x, top, colors.body, 1, height - top);
        // the wireframe: a line down the slope every few columns, contour lines every few rows
        if (x % colors.every === 0) dot(ctx, x, top + 2, colors.wire, 1, height - top - 2);
        for (let y = height - 3; y > top + 2; y -= colors.every) dot(ctx, x, y, colors.wire);
        const next = tops[(x + 1) % width];
        dot(ctx, x, Math.min(top, next), colors.crest, 1, Math.abs(next - top) + 1);
    }
    return canvas;
}
