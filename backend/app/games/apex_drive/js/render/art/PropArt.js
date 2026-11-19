import { makeCanvas } from '../canvas.js';
import { ALIEN_PAINTERS } from './AlienProps.js';
import { NEON_PAINTERS } from './NeonProps.js';
import { OCEAN_PAINTERS } from './OceanProps.js';
import { mirror } from './pixels.js';

/**
 * The props by the road (config/Props.js), painted in pixel art at the size
 * they have next to the player's car; the road scales them with distance.
 * Colours come from the world's theme (`theme.props`): a theme names the
 * colours of the kinds its worlds use. A new prop: a painter here, its kind
 * in config/Props.js.
 */

/** A pine's three tiers: [top row, rows, half width at the bottom]. */
const PINE_TIERS = [[0, 18, 7], [14, 22, 9], [28, 24, 12]];

/** A pine: three tiers on a trunk, each wider than the one above, lit on the left; `snowy`, snow on every tier. */
function pineArt(c, snowy) {
    const { canvas, ctx } = makeCanvas(26, 58);
    ctx.fillStyle = c.trunk;
    ctx.fillRect(11, 48, 4, 10);
    for (const [top, tall, half] of PINE_TIERS) {
        for (let row = 0; row < tall; row++) {
            const w = Math.round((half * row) / tall) + 1;
            ctx.fillStyle = c.leaf;
            ctx.fillRect(13 - w, top + row, w * 2, 1);
            ctx.fillStyle = c.leafLight;
            ctx.fillRect(13 - w, top + row, Math.max(1, Math.round(w * 0.5)), 1);
            if (snowy) snowOnTier(ctx, c, { y: top + row, w, row, tall });
        }
    }
    return canvas;
}

/** Snow on a tier: its top under a cap (shaded on the right), its tips at the bottom. */
function snowOnTier(ctx, c, { y, w, row, tall }) {
    if (row < tall * 0.3) {
        ctx.fillStyle = c.snow;
        ctx.fillRect(13 - w, y, w * 2, 1);
        ctx.fillStyle = c.snowShade;
        ctx.fillRect(13 + Math.round(w * 0.4), y, Math.max(1, w - Math.round(w * 0.4)), 1);
    } else if (row === tall - 1) {
        ctx.fillStyle = c.snow;
        ctx.fillRect(13 - w, y, 3, 1);
        ctx.fillRect(13 + w - 3, y, 3, 1);
        ctx.fillRect(12, y, 2, 1);
    }
}

function pine(c) {
    return pineArt(c, false);
}

function snowPine(c) {
    return pineArt(c, true);
}

/** A snow pole: red and black bands, a reflector on top, snow at its foot. */
function snowPole(c) {
    const { canvas, ctx } = makeCanvas(8, 56);
    for (let y = 6; y < 54; y++) {
        ctx.fillStyle = Math.floor((y - 6) / 6) % 2 ? c.poleBand : c.pole;
        ctx.fillRect(3, y, 2, 1);
    }
    ctx.fillStyle = c.poleTop;
    ctx.fillRect(2, 0, 4, 6);
    ctx.fillStyle = c.snow;
    ctx.fillRect(0, 53, 8, 3);
    return canvas;
}

/** A log cabin under a thick roof of snow, its window lit, smoke-black chimney. */
function cabin(c) {
    const { canvas, ctx } = makeCanvas(84, 60);
    ctx.fillStyle = c.cabinWall;
    ctx.fillRect(6, 26, 72, 34);
    ctx.fillStyle = c.cabinLog;
    for (let y = 28; y < 60; y += 4) ctx.fillRect(6, y, 72, 1);
    for (let y = 27; y < 60; y += 4) {
        ctx.fillRect(3, y, 4, 3);
        ctx.fillRect(77, y, 4, 3);
    }
    for (let row = 0; row < 24; row++) {
        const half = 12 + row * 1.25;
        ctx.fillStyle = row < 20 ? c.snow : c.snowShade;
        ctx.fillRect(Math.round(42 - half), 4 + row, Math.round(half * 2), 1);
    }
    ctx.fillStyle = c.cabinLog;
    ctx.fillRect(58, 0, 6, 12);
    ctx.fillStyle = c.snow;
    ctx.fillRect(57, 0, 8, 2);
    ctx.fillStyle = c.windowGlow;
    ctx.fillRect(16, 36, 18, 14);
    ctx.fillStyle = c.window;
    ctx.fillRect(18, 38, 14, 10);
    ctx.fillStyle = c.cabinLog;
    ctx.fillRect(24, 38, 2, 10);
    ctx.fillRect(18, 42, 14, 2);
    ctx.fillStyle = c.door;
    ctx.fillRect(48, 36, 14, 24);
    ctx.fillStyle = c.snow;
    ctx.fillRect(0, 56, 84, 4);
    return canvas;
}

/** A ball of snow, shaded on its right. */
function snowBall(ctx, c, cx, cy, r) {
    for (let dy = -r; dy <= r; dy++) {
        const half = Math.round(Math.sqrt(r * r - dy * dy));
        ctx.fillStyle = c.snow;
        ctx.fillRect(cx - half, cy + dy, half * 2, 1);
        ctx.fillStyle = c.snowShade;
        ctx.fillRect(cx + Math.round(half * 0.4), cy + dy, half - Math.round(half * 0.4), 1);
    }
}

/** A snowman by the road: three balls, a hat, coal eyes and buttons, a carrot nose and a red scarf. */
function snowman(c) {
    const { canvas, ctx } = makeCanvas(26, 36);
    snowBall(ctx, c, 13, 27, 8);
    snowBall(ctx, c, 13, 18, 6);
    snowBall(ctx, c, 13, 9, 4);
    ctx.fillStyle = c.coal;
    ctx.fillRect(10, 0, 6, 4);
    ctx.fillRect(8, 4, 10, 1);
    ctx.fillRect(11, 8, 1, 1);
    ctx.fillRect(14, 8, 1, 1);
    ctx.fillRect(13, 17, 1, 1);
    ctx.fillRect(13, 20, 1, 1);
    ctx.fillStyle = c.carrot;
    ctx.fillRect(14, 10, 4, 1);
    ctx.fillStyle = c.scarf;
    ctx.fillRect(9, 13, 9, 2);
    ctx.fillRect(15, 15, 2, 3);
    return canvas;
}

/** A warning sign before broken road: a red triangle, two bumps on the road inside. */
function rough(c) {
    const { canvas, ctx } = makeCanvas(28, 44);
    ctx.fillStyle = c.metalDark;
    ctx.fillRect(13, 21, 3, 23);
    for (let row = 0; row < 21; row++) {
        const half = Math.round(row * 0.65) + 1;
        ctx.fillStyle = c.signArrow;
        ctx.fillRect(14 - half, row, half * 2, 1);
        const inner = half - 3;
        if (row > 3 && row < 19 && inner > 0) {
            ctx.fillStyle = c.signBack;
            ctx.fillRect(14 - inner, row, inner * 2, 1);
        }
    }
    ctx.fillStyle = c.signInk;
    ctx.fillRect(8, 16, 12, 1);
    for (const x of [9, 16]) {
        ctx.fillRect(x, 15, 3, 1);
        ctx.fillRect(x + 1, 14, 1, 1);
    }
    return canvas;
}

function rock(c) {
    const { canvas, ctx } = makeCanvas(38, 22);
    const rows = [[12, 14], [8, 22], [5, 28], [3, 32], [2, 34], [1, 36], [1, 36], [0, 38]];
    for (let y = 0; y < 22; y++) {
        const [left, width] = rows[Math.min(rows.length - 1, y)];
        ctx.fillStyle = c.rock;
        ctx.fillRect(left, y, width, 1);
        ctx.fillStyle = c.rockLight;
        ctx.fillRect(left, y, Math.round(width * 0.35), 1);
    }
    ctx.fillStyle = c.rockDark;
    ctx.fillRect(0, 20, 38, 2);
    return canvas;
}

function lamp(c) {
    const { canvas, ctx } = makeCanvas(22, 74);
    ctx.fillStyle = c.metal;
    ctx.fillRect(3, 6, 3, 68);
    ctx.fillRect(3, 4, 15, 3);
    ctx.fillStyle = c.metalDark;
    ctx.fillRect(5, 6, 1, 68);
    ctx.fillStyle = c.glow;
    ctx.fillRect(13, 7, 7, 3);
    ctx.fillStyle = c.glowHalo;
    ctx.fillRect(12, 10, 9, 1);
    return canvas;
}

function billboard(c) {
    const { canvas, ctx } = makeCanvas(92, 58);
    ctx.fillStyle = c.metalDark;
    ctx.fillRect(14, 30, 4, 28);
    ctx.fillRect(74, 30, 4, 28);
    ctx.fillStyle = c.board;
    ctx.fillRect(0, 0, 92, 34);
    ctx.fillStyle = c.boardEdge;
    ctx.fillRect(0, 0, 92, 2);
    ctx.fillRect(0, 32, 92, 2);
    // a bold stripe and a block of "lettering"
    ctx.fillStyle = c.boardStripe;
    ctx.fillRect(4, 6, 84, 8);
    ctx.fillStyle = c.boardText;
    for (let i = 0; i < 6; i++) ctx.fillRect(10 + i * 13, 18, 9, 10);
    return canvas;
}

/** A warning sign: chevrons pointing right (the bend goes right). */
function chevron(c) {
    const { canvas, ctx } = makeCanvas(26, 40);
    ctx.fillStyle = c.metalDark;
    ctx.fillRect(12, 18, 3, 22);
    ctx.fillStyle = c.signBack;
    ctx.fillRect(0, 0, 26, 20);
    ctx.fillStyle = c.signArrow;
    for (const start of [3, 13]) {
        for (let row = 0; row < 16; row++) {
            const reach = row < 8 ? row : 15 - row;
            ctx.fillRect(start + reach, 2 + row, 4, 1);
        }
    }
    return canvas;
}

/** Which colour each window of a building gets, by a fixed pattern (the same building every time). */
const WINDOW_LOOK = ['windowCool', 'window', 'window', 'windowDark', 'windowDark'];
const BUILDING = { width: 104, height: 140, columns: 7, rows: 9 };

/** A city block by the road: lit and dark windows, a neon shop front at street level. */
function building(c) {
    const { width, height, columns, rows } = BUILDING;
    const { canvas, ctx } = makeCanvas(width, height);
    ctx.fillStyle = c.building;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = c.buildingEdge;
    ctx.fillRect(0, 0, width, 3);
    ctx.fillRect(0, 0, 3, height);
    ctx.fillRect(width - 3, 0, 3, height);
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            ctx.fillStyle = c[WINDOW_LOOK[(row * 7 + col * 3 + row * col) % WINDOW_LOOK.length]];
            ctx.fillRect(8 + col * 13, 10 + row * 12, 8, 7);
        }
    }
    ctx.fillStyle = c.shop;
    ctx.fillRect(4, height - 26, width - 8, 3);
    ctx.fillStyle = c.shopLight;
    ctx.fillRect(8, height - 20, width - 16, 14);
    ctx.fillStyle = c.building;
    for (let x = 8; x < width - 8; x += 18) ctx.fillRect(x, height - 20, 2, 14);
    return canvas;
}

/** A traffic cone: orange, a white band, a dark square foot. */
function cone(c) {
    const { canvas, ctx } = makeCanvas(14, 16);
    for (let row = 0; row < 13; row++) {
        const half = 1 + Math.floor(row / 2.6);
        ctx.fillStyle = row >= 5 && row <= 7 ? c.coneStripe : c.cone;
        ctx.fillRect(7 - half, row, half * 2, 1);
    }
    ctx.fillStyle = c.coneBase;
    ctx.fillRect(0, 13, 14, 3);
    return canvas;
}

/** A roadworks trestle: red and white striped boards on A legs, an amber lamp on top. */
function barrier(c) {
    const { canvas, ctx } = makeCanvas(56, 30);
    ctx.fillStyle = c.barrierLegs;
    for (const x of [6, 46]) {
        ctx.fillRect(x, 10, 3, 20);
        ctx.fillRect(x + 3, 10, 2, 20);
    }
    for (const top of [9, 17]) {
        for (let x = 0; x < 56; x++) {
            ctx.fillStyle = Math.floor((x + top) / 5) % 2 ? c.barrierWhite : c.barrierRed;
            ctx.fillRect(x, top, 1, 5);
        }
    }
    ctx.fillStyle = c.barrierLegs;
    ctx.fillRect(26, 5, 3, 4);
    ctx.fillStyle = c.barrierLamp;
    ctx.fillRect(24, 0, 7, 5);
    return canvas;
}

const PAINTERS = { pine, rock, lamp, billboard, chevron, building, cone, barrier, snowPine, snowPole, cabin, snowman, rough, ...ALIEN_PAINTERS, ...OCEAN_PAINTERS, ...NEON_PAINTERS };

/** The prop kinds that can be drawn (for the tests). */
export const PROP_KINDS = Object.keys(PAINTERS);

/**
 * The props a world uses, painted once: art[kind], plus `chevronLeft` for
 * bends to the left (chevrons are on every track).
 * @param {Record<string, string>} colors a theme's `props`
 * @param {string[]} kinds the world's prop kinds
 */
export function paintProps(colors, kinds) {
    const wanted = new Set([...kinds, 'chevron']);
    const art = Object.fromEntries([...wanted].map((kind) => [kind, PAINTERS[kind](colors)]));
    art.chevronLeft = mirror(art.chevron);
    return art;
}
