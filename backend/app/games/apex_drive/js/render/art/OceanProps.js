import { makeCanvas } from '../canvas.js';

/**
 * The props of the drowned city (config/Props.js), in pixel art at the size
 * they have next to the player's car, coloured from the theme's `props`:
 * branching coral, kelp rising in a long stalk, a giant clam with a glowing
 * pearl, a broken column grown over with coral, the head of a stone giant
 * half sunk in the sand, and the city's old street lamps, lit by living light.
 */

function fill(ctx, color, x, y, w = 1, h = 1) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** A branch of coral from (x, y) going up at `angle`, forking once or twice. */
function branch(ctx, c, { x, y, angle, long, depth }) {
    let [bx, by] = [x, y];
    for (let k = 0; k < long; k++) {
        bx += Math.cos(angle);
        by -= Math.sin(angle);
        fill(ctx, k < long - 2 ? c.coral : c.coralLight, bx, by, depth > 0 ? 2 : 1, 1);
    }
    if (depth <= 0) {
        fill(ctx, c.coralTip, bx, by - 1);
        return;
    }
    branch(ctx, c, { x: bx, y: by, angle: angle + 0.45, long: Math.round(long * 0.7), depth: depth - 1 });
    branch(ctx, c, { x: bx, y: by, angle: angle - 0.4, long: Math.round(long * 0.65), depth: depth - 1 });
}

/** Branching coral on a lump of rock. */
function coral(c) {
    const { canvas, ctx } = makeCanvas(34, 40);
    branch(ctx, c, { x: 16, y: 36, angle: Math.PI / 2, long: 12, depth: 2 });
    branch(ctx, c, { x: 14, y: 36, angle: Math.PI * 0.72, long: 9, depth: 1 });
    branch(ctx, c, { x: 19, y: 36, angle: Math.PI * 0.3, long: 9, depth: 1 });
    fill(ctx, c.rock, 6, 35, 22, 5);
    fill(ctx, c.rockLight, 6, 35, 22, 1);
    return canvas;
}

/** A stalk of giant kelp, swaying up from a holdfast, gas bladders at its leaves. */
function kelp(c) {
    const { canvas, ctx } = makeCanvas(24, 84);
    for (let row = 0; row < 80; row++) {
        const x = 12 + Math.round(Math.sin(row * 0.09) * 4);
        fill(ctx, c.kelp, x, row, 2, 1);
        if (row % 9 === 4) {
            const side = row % 18 === 4 ? 1 : -1;
            for (let k = 1; k <= 6; k++) fill(ctx, c.kelpLight, x + side * k, row - Math.floor(k / 2), 1, 2);
            fill(ctx, c.bladder, x + side * 2, row + 1, 2, 2);
        }
    }
    fill(ctx, c.rock, 6, 80, 14, 4);
    return canvas;
}

/** A giant clam, open, a pearl glowing inside. */
function clam(c) {
    const { canvas, ctx } = makeCanvas(40, 26);
    for (let dy = 0; dy < 12; dy++) {
        const half = Math.round(Math.sqrt(144 - dy * dy) * 1.6);
        fill(ctx, dy % 3 === 0 ? c.shellDark : c.shell, 20 - half, 24 - dy, half * 2, 1);
        fill(ctx, c.shellDark, 20 - half, 12 - dy + 1, half * 2, 1);
    }
    fill(ctx, c.flesh, 8, 12, 24, 4);
    fill(ctx, c.pearlGlow, 16, 9, 8, 6);
    fill(ctx, c.pearl, 18, 10, 4, 4);
    fill(ctx, '#ffffff', 18, 10, 1, 1);
    return canvas;
}

/** A broken column, fluted, its top snapped off, coral growing on it. */
function column(c) {
    const { canvas, ctx } = makeCanvas(24, 64);
    fill(ctx, c.stone, 2, 58, 20, 6);
    fill(ctx, c.stoneLight, 2, 58, 20, 1);
    for (let row = 6; row < 58; row++) {
        // the snapped top: a ragged slope over its first rows
        const ragged = row % 2 ? 1 : 0.6;
        const top = Math.max(0, 12 - row) * ragged;
        fill(ctx, c.stone, 5 + top, row, 14 - top, 1);
        for (const flute of [8, 12, 16]) if (flute > 5 + top) fill(ctx, c.stoneDark, flute, row);
        fill(ctx, c.stoneLight, 5 + top, row);
    }
    for (const [x, y] of [[6, 20], [7, 21], [15, 33], [16, 34], [17, 33], [9, 45]]) fill(ctx, c.coral, x, y, 2, 2);
    return canvas;
}

/** The head of a stone giant, half sunk in the sand, its eyes glowing faintly. */
function statue(c) {
    const { canvas, ctx } = makeCanvas(54, 48);
    for (let dy = -20; dy <= 20; dy++) {
        const half = Math.round(Math.sqrt(400 - dy * dy) * 1.05);
        fill(ctx, c.stone, 27 - half, 24 + dy, half * 2, 1);
        fill(ctx, c.stoneLight, 27 - half, 24 + dy, Math.max(1, Math.round(half * 0.4)), 1);
    }
    fill(ctx, c.stoneDark, 14, 20, 10, 4);
    fill(ctx, c.stoneDark, 31, 20, 10, 4);
    fill(ctx, c.eyes, 17, 21, 4, 2);
    fill(ctx, c.eyes, 34, 21, 4, 2);
    fill(ctx, c.stoneDark, 25, 25, 4, 8);
    fill(ctx, c.stoneDark, 20, 36, 14, 2);
    fill(ctx, c.sand, 0, 40, 54, 8);
    fill(ctx, c.sandLight, 0, 40, 54, 1);
    for (const [x, y] of [[8, 10], [10, 9], [41, 12], [43, 13]]) fill(ctx, c.coral, x, y, 2, 2);
    return canvas;
}

/** An old street lamp of the city, its globe lit by living light, weed on its post. */
function lantern(c) {
    const { canvas, ctx } = makeCanvas(20, 76);
    fill(ctx, c.metal, 9, 14, 3, 60);
    fill(ctx, c.metalDark, 11, 14, 1, 60);
    fill(ctx, c.metal, 5, 72, 11, 4);
    fill(ctx, c.glowHalo, 4, 0, 13, 14);
    fill(ctx, c.glow, 6, 2, 9, 10);
    fill(ctx, '#ffffff', 7, 3, 2, 2);
    for (let y = 30; y < 70; y += 5) fill(ctx, c.kelp, 8 + (y % 10 === 0 ? 0 : 4), y, 1, 3);
    return canvas;
}

export const OCEAN_PAINTERS = { coral, kelp, clam, column, statue, lantern };
