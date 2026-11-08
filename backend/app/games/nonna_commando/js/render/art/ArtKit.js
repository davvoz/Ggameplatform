import { C } from '../../config/Palette.js';
import { PixelCanvas } from '../PixelCanvas.js';

/**
 * Tools shared by the painters: pixel maps written as text, rotation of small
 * maps (guns pointing in eight directions), and a frame helper that paints,
 * outlines and registers a sprite in one call.
 */

/** Map characters used in text sprites. Each painter can extend it. */
export const KEYS = Object.freeze({
    m: C.metal, d: C.metalDark, l: C.metalLight,
    w: C.wood, W: C.woodDark, v: C.woodLight,
    b: C.brass, g: C.gold, G: C.goldShade,
    r: C.bandana, R: C.bandanaShade,
    p: C.pink, P: C.pinkShade, c: C.cyan, y: C.yellow, Y: C.yellowShade,
    o: C.fireOrange, f: C.fireYellow, F: C.fireWhite,
    k: C.ink, K: C.inkSoft, x: C.white,
    s: C.skin, S: C.skinShade,
});

/**
 * Paint a text map. '.' is transparent.
 * @param {PixelCanvas} pc
 * @param {string[]} rows
 */
export function paintMap(pc, rows, x, y, keys = KEYS, flip = false) {
    const w = rows[0].length;
    rows.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) {
            const ch = row[i];
            if (ch === '.' || ch === ' ') continue;
            pc.px(x + (flip ? w - 1 - i : i), y + j, keys[ch] ?? ch);
        }
    });
}

/**
 * Rotate a text map around a pivot by an angle (radians, screen y down).
 * Nearest neighbour, so pixels stay hard. Returns cells to paint, relative to
 * the pivot.
 * @returns {{x: number, y: number, ch: string}[]}
 */
export function rotateMap(rows, pivotX, pivotY, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const h = rows.length;
    const w = rows[0].length;
    const r = Math.ceil(Math.hypot(Math.max(pivotX, w - pivotX), Math.max(pivotY, h - pivotY))) + 1;
    const out = [];
    for (let ty = -r; ty <= r; ty++) {
        for (let tx = -r; tx <= r; tx++) {
            // inverse rotation, sampling the middle of the target pixel
            const sx = Math.round(cos * tx + sin * ty + pivotX);
            const sy = Math.round(-sin * tx + cos * ty + pivotY);
            if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
            const ch = rows[sy][sx];
            if (ch !== '.' && ch !== ' ') out.push({ x: tx, y: ty, ch });
        }
    }
    return out;
}

export function paintCells(pc, cells, x, y, keys = KEYS) {
    for (const c of cells) pc.px(x + c.x, y + c.y, keys[c.ch] ?? c.ch);
}

/**
 * Paint a frame, outline it and add it to the bank.
 * @param {import('../SpriteBank.js').SpriteBank} bank
 * @param {string} name
 * @param {number} w
 * @param {number} h
 * @param {number} ax
 * @param {number} ay
 * @param {(pc: PixelCanvas) => void} paint
 * @param {{outline?: string|null, diagonal?: boolean}} [opts]
 */
export function frame(bank, name, w, h, ax, ay, paint, { outline = C.ink, diagonal = false } = {}) {
    const pc = new PixelCanvas(w, h);
    paint(pc);
    if (outline) pc.outline(outline, diagonal);
    bank.add(name, pc, ax, ay);
    return pc;
}

/** Four-step shading of a filled ellipse: dark lower right, light upper left. */
export function ball(pc, cx, cy, r, base, shade, light) {
    pc.circle(cx, cy, r, shade);
    pc.circle(cx - 0.5, cy - 0.7, r - 0.8, base);
    if (light && r >= 2) pc.circle(cx - r * 0.35, cy - r * 0.4, Math.max(0.6, r * 0.28), light);
}

/** A little deterministic noise for textures, so art looks the same every load. */
export function hash2(x, y, seed = 0) {
    let h = Math.imul(x * 374761393 + y * 668265263 + seed * 2147483647, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1103515245);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
