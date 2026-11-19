import { Rng } from '../core/Rng.js';
import { makeCanvas } from './canvas.js';

/**
 * The scenery under the sea, for render/Backdrop.js (and the world's card):
 * shafts of light falling from the surface, the drowned city (towers leaning
 * where they sank, domes, broken arches, windows lit by living light, coral
 * on their tops), the reef nearer (coral heads, fans, kelp rising in long
 * stalks), and shoals of fish drifting by. Painted once from a seed; the
 * shafts pulse and the shoals drift (the layers' `pulse` and `drift`).
 */

const TAU = Math.PI * 2;

function dot(ctx, x, y, color, w = 1, h = 1) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** A tile painted at x and again a turn away either side, so the seam is whole. */
function wrapped(width, x, paint) {
    for (const shift of [0, -width, width]) paint(x + shift);
}

/** The sun seen from under the sea: a pale disc, its rim ragged where the waves break the light. */
function surfaceSun(ctx, cx, cy, { radius, core, rim }) {
    for (let dy = -radius; dy <= radius; dy++) {
        const half = Math.round(Math.sqrt(radius * radius - dy * dy));
        dot(ctx, cx - half, cy + dy, rim, half * 2, 1);
        if (half > 2) dot(ctx, cx - half + 2, cy + dy, core, half * 2 - 4, 1);
        // the waves: a pixel of the rim missing here and there
        if ((dy + radius) % 3 === 0) ctx.clearRect(Math.round(cx + half - 1), cy + dy, 1, 1);
    }
}

/** Shafts of light from the surface: slanted bands, brighter at the top, each a few pixels wide; the sun high among them. */
export function paintRays(width, theme, rng, { height, count }) {
    const { canvas, ctx } = makeCanvas(width, height);
    const { colors, slant } = theme.rays;
    surfaceSun(ctx, ((theme.sun.heading / TAU + 1) % 1) * width, theme.sun.radius + 2, theme.sun);
    for (let i = 0; i < count; i++) {
        const x = rng.int(0, width - 1);
        const wide = rng.int(3, 9);
        const long = Math.round(height * rng.range(0.55, 1));
        wrapped(width, x, (left) => {
            for (let y = 0; y < long; y++) {
                const band = Math.min(colors.length - 1, Math.floor((y / long) * colors.length));
                // the lowest band dithered away
                if (band === colors.length - 1 && (left + y) % 2 === 0) continue;
                dot(ctx, left + y * slant, y, colors[band], wide, 1);
            }
        });
    }
    return canvas;
}

/** A tower of the drowned city: leaning, its top broken or crowned, windows lit here and there, coral on top. */
function tower(ctx, rng, look, { x, ground, tall, wide }) {
    const lean = rng.range(-0.12, 0.12);
    const broken = rng.chance(0.4);
    for (let row = 0; row < tall; row++) {
        const left = Math.round(x + lean * (tall - row));
        const cut = broken && row < 6 ? Math.round((6 - row) * rng.range(0.4, 1.2)) : 0;
        dot(ctx, left + cut, ground - tall + row, look.body, Math.max(1, wide - cut), 1);
        dot(ctx, left + wide - 1, ground - tall + row, look.edge);
    }
    for (let wy = ground - tall + 4; wy < ground - 3; wy += 4) {
        for (let wx = 2; wx < wide - 2; wx += 3) {
            if (rng.chance(look.lit)) dot(ctx, x + wx + lean * (ground - wy), wy, rng.pick(look.windows));
        }
    }
    if (!broken) dome(ctx, look, { x: x + lean * tall + wide / 2, y: ground - tall, r: Math.ceil(wide / 2) });
    if (rng.chance(0.6)) {
        for (let k = 0; k < 4; k++) dot(ctx, x + lean * tall + rng.int(0, wide - 1), ground - tall - rng.int(0, 2), rng.pick(look.coral));
    }
}

/** A dome on a tower: a half disc, its rim lit. */
function dome(ctx, look, { x, y, r }) {
    for (let dy = 0; dy < r; dy++) {
        const half = Math.round(Math.sqrt(r * r - dy * dy));
        dot(ctx, x - half, y - dy, look.body, half * 2, 1);
        dot(ctx, x - half, y - dy, look.edge);
    }
}

/** The drowned city: towers of every height side by side, a broken arch now and then. */
export function paintRuins(width, theme, rng, { height, tall, wide }) {
    const { canvas, ctx } = makeCanvas(width, height);
    const look = theme.ruins;
    let x = 0;
    while (x < width) {
        const w = Math.min(rng.int(wide[0], wide[1]), width - x);
        const seed = rng.int(1, 2 ** 30);
        const spec = { x, ground: height, tall: rng.int(tall[0], tall[1]), wide: w };
        wrapped(width, 0, (shift) => tower(ctx, new Rng(seed), look, { ...spec, x: spec.x + shift }));
        x += w + rng.int(1, 6);
    }
    dot(ctx, 0, height - 2, look.body, width, 2);
    return canvas;
}

/** A coral head: a lumpy mound of a coral's colour, lit on top. */
function coralHead(ctx, rng, look, { x, ground }) {
    const r = rng.int(3, 7);
    const color = rng.pick(look.coral);
    for (let dy = 0; dy < r; dy++) {
        const half = Math.round(Math.sqrt(r * r - dy * dy) * 1.3) + rng.int(-1, 0);
        dot(ctx, x - half, ground - dy, look.body, half * 2, 1);
        if (dy === r - 1 || rng.chance(0.25)) dot(ctx, x - half + rng.int(0, Math.max(0, half * 2 - 1)), ground - dy, color);
    }
}

/** A stalk of kelp rising and swaying, leaves now and then. */
function kelp(ctx, rng, look, { x, ground, tall }) {
    const phase = rng.range(0, TAU);
    for (let row = 0; row < tall; row++) {
        const sway = Math.round(Math.sin(row * 0.12 + phase) * 2.5);
        dot(ctx, x + sway, ground - row, look.kelp, 1, 1);
        if (row % 7 === 3) dot(ctx, x + sway + (row % 14 === 3 ? 1 : -2), ground - row, look.kelpLight, 2, 1);
    }
}

/** The reef: a bank of rock and sand, coral heads on it, kelp rising from it, a few tips glowing. */
export function paintReef(width, theme, rng, { height, kelpTall }) {
    const { canvas, ctx } = makeCanvas(width, height);
    const look = theme.reef;
    const phase = rng.range(0, TAU);
    for (let x = 0; x < width; x++) {
        const bank = Math.round(6 + 3 * Math.sin((x / width) * TAU * 7 + phase) + 2 * Math.sin((x / width) * TAU * 17));
        dot(ctx, x, height - bank, look.body, 1, bank);
    }
    const heads = Math.round(width / 9);
    for (let i = 0; i < heads; i++) {
        const seed = rng.int(1, 2 ** 30);
        const x = rng.int(0, width - 1);
        wrapped(width, x, (at) => coralHead(ctx, new Rng(seed), look, { x: at, ground: height - 6 }));
    }
    const stalks = Math.round(width / 14);
    for (let i = 0; i < stalks; i++) {
        const seed = rng.int(1, 2 ** 30);
        const x = rng.int(0, width - 1);
        const tall = rng.int(kelpTall[0], kelpTall[1]);
        wrapped(width, x, (at) => kelp(ctx, new Rng(seed), look, { x: at, ground: height - 4, tall }));
    }
    for (let i = 0; i < width / 20; i++) dot(ctx, rng.int(0, width - 1), height - rng.int(4, 12), look.glow);
    return canvas;
}

/** A fish: a body two or three pixels long, a tail. */
function fish(ctx, x, y, look, facing) {
    dot(ctx, x, y, look.body, 3, 1);
    dot(ctx, x + (facing > 0 ? -1 : 3), y - 1, look.fin);
    dot(ctx, x + (facing > 0 ? -1 : 3), y + 1, look.fin);
    dot(ctx, x + (facing > 0 ? 2 : 0), y, look.eye);
}

/** Shoals of small fish, each a loose cloud swimming the same way. */
export function paintFish(width, theme, rng, { height, shoals }) {
    const { canvas, ctx } = makeCanvas(width, height);
    const look = theme.fish;
    for (let s = 0; s < shoals; s++) {
        const cx = rng.int(0, width - 1);
        const cy = rng.int(6, height - 6);
        const count = rng.int(5, 14);
        const facing = rng.chance(0.5) ? 1 : -1;
        const members = Array.from({ length: count }, () => [rng.range(-14, 14), rng.range(-5, 5)]);
        wrapped(width, cx, (x) => {
            for (const [dx, dy] of members) fish(ctx, x + dx, cy + dy, look, facing);
        });
    }
    return canvas;
}
