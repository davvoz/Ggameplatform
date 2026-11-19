import { Rng } from '../core/Rng.js';
import { makeCanvas } from './canvas.js';

/**
 * The scenery of a hostile world, for render/Backdrop.js (and the world's
 * card): a ringed gas giant hanging in the sky, and ranges of basalt spires
 * veined with magma, hive lights glowing in the nearer ones, now and then an
 * arch of rock between two of them. Painted once from a seed, like the rest.
 */

const TAU = Math.PI * 2;
/** The ring: its width and height over the planet's radius, its tilt, the bands it is made of (out to in) and its gap. */
const RING = { wide: 1.85, tall: 0.36, tilt: -0.16, bands: [1, 0.95, 0.9, 0.85, 0.78, 0.74], gap: 3 };
/** The great storm on the planet: where (shares of the radius) and how big. */
const STORM = { x: -0.35, y: 0.28, rx: 0.22, ry: 0.1 };
/** A spire's ragged edge: a pixel more or less, by chance, on this share of its rows. */
const RAGGED = 0.3;
/** Arches between spires: how often, and how far they reach (pixels). */
const ARCH = { chance: 0.12, span: [16, 34], thick: 2 };

/** Pixel by pixel helper: a 1 x 1 fill. */
function dot(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

/** One half of the ring (back: the upper half, behind the planet; front: the lower half, over it). */
function paintRing(ctx, cx, cy, radius, look, front) {
    const rx = radius * RING.wide;
    const ry = radius * RING.tall;
    RING.bands.forEach((k, i) => {
        if (i === RING.gap) return;
        const color = look.ring[Math.min(look.ring.length - 1, Math.floor((i / RING.bands.length) * look.ring.length))];
        for (let x = -rx * k; x <= rx * k; x += 0.5) {
            const y = ry * k * Math.sqrt(Math.max(0, 1 - (x / (rx * k)) ** 2));
            const tilt = x * RING.tilt;
            dot(ctx, cx + x, cy + (front ? y : -y) + tilt, color);
        }
    });
}

/** The planet's disc: wavy bands, a storm, the night side dithered in. */
function paintDisc(ctx, cx, cy, radius, look) {
    const { bands, night } = look;
    for (let dy = -radius; dy <= radius; dy++) {
        const half = Math.round(Math.sqrt(radius * radius - dy * dy));
        for (let dx = -half; dx < half; dx++) {
            const wave = 0.45 * Math.sin(dx * 0.22 + dy * 0.13);
            const band = Math.max(0, Math.min(bands.length - 1, Math.floor(((dy + radius) / (2 * radius)) * bands.length + wave)));
            let color = bands[band];
            const sx = (dx / radius - STORM.x) / STORM.rx;
            const sy = (dy / radius - STORM.y) / STORM.ry;
            if (sx * sx + sy * sy < 1) color = bands[(band + 3) % bands.length];
            // the night side: past the terminator, with a checkered edge two pixels wide
            const dark = dx - half * 0.35;
            if (dark > 2 || (dark > 0 && (dx + dy) % 2 === 0)) color = night;
            dot(ctx, cx + dx, cy + dy, color);
        }
    }
}

/** A ringed gas giant centred on (cx, cy): the ring's back half, the disc, the ring's front half. */
export function paintPlanetOn(ctx, cx, cy, look, radius = look.radius) {
    paintRing(ctx, cx, cy, radius, look, false);
    paintDisc(ctx, cx, cy, radius, look);
    paintRing(ctx, cx, cy, radius, look, true);
}

/** The layer with the planet, one turn wide, the planet where its heading says. */
export function paintPlanet(width, theme, rng, { height }) {
    const { canvas, ctx } = makeCanvas(width, height);
    const look = theme.planet;
    const x = ((look.heading / TAU + 1) % 1) * width;
    paintPlanetOn(ctx, x, look.y, look);
    return canvas;
}

/** A spire from its foot at (x, ground): `tall`, `half` wide at the base, leaning; its veins of magma and hive lights. */
function paintSpire(ctx, rng, look, { x, ground, tall, half, lean }) {
    const vein = rng.chance(look.veins) ? { at: rng.int(-1, 1), from: Math.round(tall * rng.range(0.25, 0.6)) } : null;
    for (let row = 0; row < tall; row++) {
        const share = (row + 1) / tall;
        const w = Math.max(0.5, half * share ** 0.85 + (rng.chance(RAGGED) ? rng.int(-1, 1) : 0));
        const middle = x + lean * (tall - row);
        const y = ground - tall + row;
        ctx.fillStyle = look.body;
        ctx.fillRect(Math.round(middle - w), y, Math.max(1, Math.round(w * 2)), 1);
        ctx.fillStyle = look.lit;
        ctx.fillRect(Math.round(middle - w), y, Math.max(1, Math.round(w * 0.5)), 1);
        if (vein && row >= tall - vein.from && rng.chance(0.85)) dot(ctx, middle + vein.at + rng.int(-1, 0), y, look.vein);
    }
    if (look.eyes && rng.chance(0.4)) {
        const y = ground - Math.round(tall * rng.range(0.2, 0.5));
        const middle = x + lean * (ground - y);
        dot(ctx, middle - 1, y, look.eyes);
        dot(ctx, middle + 1, y, look.eyes);
    }
}

/** An arch of rock from (x, ground) reaching `span` pixels, `rise` high at its middle. */
function paintArch(ctx, look, { x, ground, span, rise }) {
    for (let t = 0; t <= 1; t += 1 / (span * 2)) {
        const ax = x + t * span;
        const ay = ground - rise * Math.sin(Math.PI * t);
        ctx.fillStyle = look.body;
        ctx.fillRect(Math.round(ax), Math.round(ay), 2, ARCH.thick + Math.round(4 * (1 - Math.sin(Math.PI * t))));
        dot(ctx, ax, ay, look.lit);
    }
}

/**
 * A range of spires, one turn wide: a low ridge of rubble, then `perPixel`
 * spires a column, each drawn again a turn away so the seam is whole.
 * @param {{look: string, height: number, perPixel: number, tall: number[], wide: number[]}} layer
 */
export function paintSpires(width, theme, rng, layer) {
    const { height, perPixel, tall, wide } = layer;
    const look = theme.spires[layer.look];
    const { canvas, ctx } = makeCanvas(width, height);
    const phase = rng.range(0, TAU);
    for (let x = 0; x < width; x++) {
        const rubble = Math.round(4 + 2 * Math.sin((x / width) * TAU * 9 + phase) + rng.int(0, 1));
        ctx.fillStyle = look.base;
        ctx.fillRect(x, height - rubble, 1, rubble);
    }
    const count = Math.round(width * perPixel);
    for (let i = 0; i < count; i++) {
        const spire = {
            x: rng.int(0, width - 1),
            ground: height,
            tall: Math.min(height - 1, rng.int(tall[0], tall[1])),
            half: rng.int(wide[0], wide[1]) / 2,
            lean: rng.range(-0.18, 0.18),
        };
        // each copy a turn away from its own generator, so it comes out the same
        const seed = rng.int(1, 2 ** 30);
        for (const shift of [0, -width, width]) paintSpire(ctx, new Rng(seed), look, { ...spire, x: spire.x + shift });
        if (!rng.chance(ARCH.chance)) continue;
        const arch = { x: spire.x, ground: height, span: rng.int(ARCH.span[0], ARCH.span[1]), rise: Math.round(spire.tall * 0.55) };
        for (const shift of [0, -width]) paintArch(ctx, look, { ...arch, x: arch.x + shift });
    }
    return canvas;
}
