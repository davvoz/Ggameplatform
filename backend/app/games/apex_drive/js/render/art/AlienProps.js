import { makeCanvas } from '../canvas.js';

/**
 * The props of a hostile world (config/Props.js), in pixel art at the size
 * they have next to the player's car, coloured from the theme's `props`:
 * clusters of acid crystals, basalt needles split by magma, stalks bent like
 * tentacles holding up a glowing bulb, the ribs of something huge that died
 * here, and the hazard sign before every jump.
 */

/** A prism of crystal: from its foot (x, y) leaning `lean` px per row, `tall`, `half` wide; lit left, dark right, a bright tip. */
function prism(ctx, c, { x, y, tall, half, lean }) {
    for (let row = 0; row < tall; row++) {
        const fromTip = row;
        const w = fromTip < half ? Math.max(1, fromTip) : half;
        const mx = Math.round(x + lean * (tall - row));
        const py = y - tall + row;
        ctx.fillStyle = c.crystalDark;
        ctx.fillRect(mx - w, py, w * 2, 1);
        ctx.fillStyle = c.crystal;
        ctx.fillRect(mx - w, py, w, 1);
        ctx.fillStyle = c.crystalLight;
        ctx.fillRect(mx - w, py, 1, 1);
        if (row < 2) ctx.fillRect(mx - 1, py, 2, 1);
    }
}

/** A cluster of acid crystals on a dark rock, the biggest in the middle. */
function crystal(c) {
    const { canvas, ctx } = makeCanvas(36, 42);
    ctx.fillStyle = c.basalt;
    ctx.fillRect(4, 36, 28, 6);
    ctx.fillStyle = c.basaltLight;
    ctx.fillRect(4, 36, 28, 1);
    prism(ctx, c, { x: 11, y: 38, tall: 22, half: 3, lean: -0.3 });
    prism(ctx, c, { x: 26, y: 38, tall: 18, half: 3, lean: 0.35 });
    prism(ctx, c, { x: 18, y: 38, tall: 36, half: 4, lean: 0.05 });
    prism(ctx, c, { x: 22, y: 39, tall: 12, half: 2, lean: 0.5 });
    ctx.fillStyle = c.crystalLight;
    for (const [x, y] of [[2, 30], [33, 26], [7, 14], [30, 12]]) ctx.fillRect(x, y, 1, 1);
    return canvas;
}

/** A needle of basalt, split by veins of magma glowing hot at their heart, rubble at its foot. */
function spire(c) {
    const { canvas, ctx } = makeCanvas(32, 88);
    for (let row = 0; row < 82; row++) {
        const w = Math.max(1, Math.round(1 + (row / 82) * 11 + (row % 7 === 3 ? 1 : 0)));
        const mx = 16 + Math.round((82 - row) * 0.04);
        ctx.fillStyle = c.basalt;
        ctx.fillRect(mx - w, row, w * 2, 1);
        ctx.fillStyle = c.basaltLight;
        ctx.fillRect(mx - w, row, Math.max(1, Math.round(w * 0.4)), 1);
        // two veins winding down the needle, white-hot where they are widest
        for (const [phase, side] of [[0, -0.35], [2.1, 0.3]]) {
            if (row < 24) continue;
            const vx = Math.round(mx + side * w + Math.sin(row * 0.35 + phase) * 1.5);
            ctx.fillStyle = row % 9 === 0 ? c.veinHot : c.vein;
            ctx.fillRect(vx, row, 1, 1);
        }
    }
    ctx.fillStyle = c.basalt;
    ctx.fillRect(0, 82, 32, 6);
    ctx.fillStyle = c.basaltLight;
    for (const x of [2, 9, 24, 28]) ctx.fillRect(x, 82, 3, 1);
    ctx.fillStyle = c.vein;
    ctx.fillRect(13, 84, 6, 1);
    return canvas;
}

/** A stalk bent like a tentacle, holding up a glowing bulb, tendrils hanging from it. */
function pod(c) {
    const { canvas, ctx } = makeCanvas(30, 64);
    for (let row = 14; row < 64; row++) {
        const t = (row - 14) / 50;
        const mx = Math.round(15 + Math.sin(t * 3.4 + 0.6) * 6);
        const w = Math.round(2 + t * 2);
        ctx.fillStyle = c.stalk;
        ctx.fillRect(mx - w, row, w * 2, 1);
        ctx.fillStyle = c.stalkLight;
        ctx.fillRect(mx - w, row, 1, 1);
        if (row % 6 === 0) ctx.fillRect(mx - w, row, w * 2, 1);
    }
    // the bulb: a pink glow with a bright core
    for (let dy = -9; dy <= 9; dy++) {
        const half = Math.round(Math.sqrt(81 - dy * dy) * 1.1);
        ctx.fillStyle = c.bulb;
        ctx.fillRect(16 - half, 10 + dy, half * 2, 1);
        if (Math.abs(dy) < 5) {
            ctx.fillStyle = c.bulbLight;
            ctx.fillRect(13 - Math.round(half * 0.3), 8 + dy, Math.max(1, Math.round(half * 0.6)), 1);
        }
    }
    ctx.fillStyle = c.stalk;
    for (const [x, long] of [[9, 7], [14, 10], [20, 6], [24, 8]]) ctx.fillRect(x, 18, 1, long);
    return canvas;
}

/** The ribs of something huge, half buried: bones curving up and over to the right, the spine along the ground. */
function ribs(c) {
    const { canvas, ctx } = makeCanvas(76, 60);
    ctx.fillStyle = c.boneShade;
    ctx.fillRect(0, 54, 76, 4);
    ctx.fillStyle = c.bone;
    ctx.fillRect(0, 54, 76, 1);
    for (let k = 0; k < 6; k++) {
        const foot = 6 + k * 12;
        const tall = 52 - Math.abs(k - 2) * 7;
        for (let t = 0; t <= 1; t += 0.02) {
            const x = foot + Math.sin(t * Math.PI * 0.9) * 14;
            const y = 54 - Math.sin(t * Math.PI * 0.55) * tall;
            ctx.fillStyle = c.bone;
            ctx.fillRect(Math.round(x), Math.round(y), 3, 2);
            ctx.fillStyle = c.boneShade;
            ctx.fillRect(Math.round(x) + 2, Math.round(y), 1, 2);
        }
    }
    ctx.fillStyle = c.boneDark;
    for (let x = 2; x < 76; x += 6) ctx.fillRect(x, 56, 2, 2);
    return canvas;
}

/** The hazard sign before a jump: a striped board, a car flying over a gap drawn on it, a red beacon on top. */
function gapSign(c) {
    const { canvas, ctx } = makeCanvas(32, 54);
    ctx.fillStyle = c.metalDark;
    ctx.fillRect(14, 26, 4, 28);
    ctx.fillStyle = c.metal;
    ctx.fillRect(14, 26, 1, 28);
    for (let x = 0; x < 32; x++) {
        for (let y = 6; y < 28; y++) {
            const edge = y < 8 || y > 25 || x < 2 || x > 29;
            ctx.fillStyle = edge && Math.floor((x + y) / 3) % 2 === 0 ? c.hazardDark : c.hazard;
            ctx.fillRect(x, y, 1, 1);
        }
    }
    ctx.fillStyle = c.signInk;
    // the gap: road on both sides, the void between
    ctx.fillRect(4, 21, 8, 2);
    ctx.fillRect(20, 21, 8, 2);
    ctx.fillRect(12, 23, 1, 2);
    ctx.fillRect(19, 23, 1, 2);
    // the car on its arc
    for (const [x, y] of [[9, 17], [11, 15], [13, 13], [16, 12], [19, 13]]) ctx.fillRect(x, y, 1, 1);
    ctx.fillRect(20, 12, 6, 3);
    ctx.fillRect(21, 11, 3, 1);
    ctx.fillStyle = c.glowHalo;
    ctx.fillRect(12, 0, 8, 6);
    ctx.fillStyle = c.glow;
    ctx.fillRect(14, 1, 4, 4);
    return canvas;
}

export const ALIEN_PAINTERS = { crystal, spire, pod, ribs, gapSign };
