import { makeCanvas } from '../canvas.js';

/**
 * The props of the grid vortex (config/Props.js), in pixel art at the size
 * they have next to the player's car, coloured from the theme's `props`:
 * light pylons with glowing bars, palms drawn in neon tubes, black obelisks
 * streaming data, holographic signs on stilts, pyramids of light.
 */

function fill(ctx, color, x, y, w = 1, h = 1) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** A light pylon: a black mast, bars of light up it, a beacon on top. */
function pylon(c) {
    const { canvas, ctx } = makeCanvas(14, 80);
    fill(ctx, c.metal, 5, 6, 4, 72);
    fill(ctx, c.metalLight, 5, 6, 1, 72);
    fill(ctx, c.metal, 2, 76, 10, 4);
    for (let y = 14; y < 70; y += 9) {
        fill(ctx, c.glowHalo, 3, y - 1, 8, 4);
        fill(ctx, y % 18 === 14 ? c.cyan : c.pink, 4, y, 6, 2);
    }
    fill(ctx, c.glowHalo, 3, 0, 8, 7);
    fill(ctx, c.white, 5, 2, 4, 3);
    return canvas;
}

/** A palm of neon tubes: a curving trunk in segments, fronds arching out, all lit. */
function palm(c) {
    const { canvas, ctx } = makeCanvas(44, 76);
    for (let row = 20; row < 74; row++) {
        const x = 22 + Math.round(Math.sin((74 - row) * 0.035) * 6);
        fill(ctx, row % 6 === 0 ? c.pinkDark : c.pink, x, row, 3, 1);
    }
    const top = { x: 22 + Math.round(Math.sin(54 * 0.035) * 6) + 1, y: 20 };
    for (const [angle, long] of [[0.15, 18], [0.55, 16], [1.2, 12], [2.0, 12], [2.6, 16], [3.0, 18]]) {
        for (let k = 0; k < long; k++) {
            const x = top.x + Math.cos(angle) * k;
            // the fronds arch over and droop at their ends
            const y = top.y - Math.sin(angle) * k * 0.6 + (k * k) / (long * 1.4);
            fill(ctx, c.cyan, x, y, 2, 1);
            if (k % 3 === 1) fill(ctx, c.cyanDark, x, y + 1, 1, 2);
        }
    }
    fill(ctx, c.white, top.x - 1, top.y - 1, 3, 2);
    fill(ctx, c.metal, 16, 73, 14, 3);
    return canvas;
}

/** A black obelisk, its edges lit, lines of data running down a face. */
function obelisk(c) {
    const { canvas, ctx } = makeCanvas(26, 86);
    for (let row = 0; row < 82; row++) {
        const half = Math.round(2 + (row / 82) * 9);
        fill(ctx, c.metal, 13 - half, row, half * 2, 1);
        fill(ctx, c.cyan, 13 - half, row, 1, 1);
        fill(ctx, c.pink, 12 + half, row, 1, 1);
    }
    for (let line = 0; line < 9; line++) {
        const x = 9 + (line % 4) * 2;
        for (let y = 14 + line * 7; y < 18 + line * 7; y++) fill(ctx, (y + line) % 3 ? c.data : c.white, x, y, 1, 1);
    }
    fill(ctx, c.white, 12, 0, 2, 2);
    fill(ctx, c.metalLight, 1, 82, 24, 4);
    return canvas;
}

/** A holographic sign on two stilts: a glowing frame, a wireframe ring inside, scan lines across. */
function holo(c) {
    const { canvas, ctx } = makeCanvas(64, 50);
    for (const x of [10, 52]) fill(ctx, c.metal, x, 26, 3, 24);
    fill(ctx, c.holoBack, 2, 2, 60, 26);
    for (let y = 3; y < 28; y += 3) fill(ctx, c.holoLine, 3, y, 58, 1);
    fill(ctx, c.cyan, 2, 2, 60, 1);
    fill(ctx, c.cyan, 2, 27, 60, 1);
    fill(ctx, c.cyan, 2, 2, 1, 26);
    fill(ctx, c.cyan, 61, 2, 1, 26);
    for (let k = 0; k < 40; k++) {
        const angle = (k / 40) * Math.PI * 2;
        fill(ctx, c.pink, 32 + Math.cos(angle) * 9, 15 + Math.sin(angle) * 8, 1, 1);
        fill(ctx, c.pinkDark, 32 + Math.cos(angle) * 5, 15 + Math.sin(angle) * 4.5, 1, 1);
    }
    fill(ctx, c.white, 31, 14, 2, 2);
    return canvas;
}

/** A pyramid of light: dark faces, glowing edges, a beam rising from its tip. */
function prism(c) {
    const { canvas, ctx } = makeCanvas(70, 64);
    fill(ctx, c.beam, 33, 0, 4, 30);
    fill(ctx, c.white, 34, 0, 2, 30);
    for (let row = 30; row < 64; row++) {
        const half = Math.round(((row - 30) / 34) * 34);
        fill(ctx, c.metal, 35 - half, row, half, 1);
        fill(ctx, c.metalLight, 35, row, half, 1);
        fill(ctx, c.pink, 35 - half, row, 1, 1);
        fill(ctx, c.cyan, 34 + half, row, 1, 1);
        fill(ctx, c.white, 35, row, 1, 1);
    }
    return canvas;
}

export const NEON_PAINTERS = { pylon, palm, obelisk, holo, prism };
