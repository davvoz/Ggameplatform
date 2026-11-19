import { Rng } from '../core/Rng.js';
import { paintPlanet, paintSpires } from './AlienSky.js';
import { paintGridPeaks, paintNeonSun } from './NeonScenery.js';
import { paintFish, paintReef, paintRays, paintRuins } from './OceanScenery.js';
import { drawWrapped, makeCanvas } from './canvas.js';

/**
 * The scenery beyond the road, in layers that wrap around the world, as
 * the theme lists them (`theme.layers`, far to near): clouds, stars, an
 * aurora, mountains, hills, a city skyline... Each layer is painted once, in
 * pixel art, from a seed; it is exactly one full turn wide x its `factor`,
 * so the sun (or the moon) always sits in the same direction of the map.
 * While the road bends the layers slide sideways, the nearer ones faster:
 * the parallax of the 16-bit racers. A layer may also drift on its own
 * (`drift`, pixels a second) and pulse (`pulse`: {rate, depth} of its dimming).
 *
 * A new kind of layer: a painter in PAINTERS, `(width, theme, rng, layer)`.
 */

const SEED = 1987;
const TAU = Math.PI * 2;
const MAX_WIDTH = 4096;

/** Heights of the mountains (pixels) and the waves that shape them: [waves per turn, amplitude]. */
const MOUNTAINS = { height: 64, base: 22, waves: [[3, 9], [7, 7], [13, 4], [29, 2], [61, 1]], snowAbove: 40, snowDepth: 3 };
/** Aurora curtains: their lower edge waves (waves per turn, amplitude), their rays rise and fall along it. */
const AURORA = { edge: [[2, 5], [5, 3], [11, 1]], rays: [[7, 0.35], [17, 0.25], [37, 0.15]], tall: [0.3, 0.8], streak: 0.25 };
const HILLS = { height: 30, base: 12, waves: [[4, 4], [9, 3], [19, 2], [41, 1]], trees: 70 };
const CLOUDS = { height: 70, count: 9 };
/** Rows of the sky band blend into the next with a checker pattern. */
const DITHER_ROWS = 2;

/** A ridge line that wraps: heights[x] for x in 0..width-1. */
function ridge(width, rng, { base, waves }) {
    const phases = waves.map(() => rng.range(0, TAU));
    return Array.from({ length: width }, (_, x) => {
        const angle = (x / width) * TAU;
        return Math.round(base + waves.reduce((sum, [k, amp], i) => sum + amp * Math.sin(k * angle + phases[i]), 0));
    });
}

/** Where the theme's sun (or moon) stands across a layer one turn wide. */
function bodyX(width, body) {
    return ((body.heading / TAU + 1) % 1) * width;
}

/** @param {{snowAbove?: number, snowDepth?: number}} layer how high the snow starts, how deep it lies (pixels) */
function paintMountains(width, theme, rng, { snowAbove = MOUNTAINS.snowAbove, snowDepth = MOUNTAINS.snowDepth } = {}) {
    const { canvas, ctx } = makeCanvas(width, MOUNTAINS.height);
    const { sun, mountains } = theme;
    paintBody(ctx, bodyX(width, sun), MOUNTAINS.height - sun.lift, sun);
    const heights = ridge(width, rng, MOUNTAINS);
    heights.forEach((h, x) => {
        const top = MOUNTAINS.height - h;
        // a slope going down to the right faces away from the sun
        const facing = h >= heights[(x + 1) % width] ? mountains.shade : mountains.lit;
        ctx.fillStyle = mountains.base;
        ctx.fillRect(x, top, 1, h);
        ctx.fillStyle = facing;
        ctx.fillRect(x, top, 1, Math.ceil(h * 0.45));
        if (h > snowAbove) {
            ctx.fillStyle = mountains.snow;
            ctx.fillRect(x, top, 1, Math.min(snowDepth, h - snowAbove));
        }
    });
    return canvas;
}

/** The sun (round, cut by thinner and thinner gaps towards its bottom) or the moon (`shape: 'moon'`). */
export function paintBody(ctx, cx, cy, body) {
    if (body.shape === 'moon') {
        paintMoon(ctx, cx, cy, body);
        return;
    }
    for (let dy = -body.radius; dy <= body.radius; dy++) {
        const half = Math.round(Math.sqrt(body.radius * body.radius - dy * dy));
        const gap = dy > 2 && dy % 4 === 0;
        if (gap) continue;
        ctx.fillStyle = dy < body.radius / 3 ? body.core : body.rim;
        ctx.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2, 1);
    }
}

/** A full moon: a pale disc, its right side in shade, two faint seas. */
function paintMoon(ctx, cx, cy, { radius, core, rim, seas }) {
    for (let dy = -radius; dy <= radius; dy++) {
        const half = Math.round(Math.sqrt(radius * radius - dy * dy));
        ctx.fillStyle = core;
        ctx.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2, 1);
        ctx.fillStyle = rim;
        const shade = Math.max(1, Math.round(half * 0.35 + dy * 0.15));
        ctx.fillRect(Math.round(cx + half - shade), Math.round(cy + dy), shade, 1);
    }
    ctx.fillStyle = seas;
    for (const [dx, dy, w, h] of [[-3, -3, 2, 2], [1, 2, 2, 1]]) {
        ctx.fillRect(Math.round(cx + (dx * radius) / 8), Math.round(cy + (dy * radius) / 8), w, h);
    }
}

function paintHills(width, theme, rng) {
    const { canvas, ctx } = makeCanvas(width, HILLS.height);
    const { hills } = theme;
    const heights = ridge(width, rng, HILLS);
    heights.forEach((h, x) => {
        ctx.fillStyle = hills.body;
        ctx.fillRect(x, HILLS.height - h, 1, h);
        ctx.fillStyle = hills.top;
        ctx.fillRect(x, HILLS.height - h, 1, 2);
    });
    ctx.fillStyle = hills.trees;
    for (let i = 0; i < HILLS.trees; i++) {
        const x = rng.int(0, width - 1);
        const tall = rng.int(4, 9);
        // drawn once more a turn away, so a pine on the seam is whole
        for (const shift of [0, -width, width]) paintPine(ctx, x + shift, HILLS.height - heights[x] + 1, tall);
    }
    return canvas;
}

/** A pine: a stack of rows two pixels wider every second row, on a trunk. */
function paintPine(ctx, x, ground, tall) {
    for (let row = 0; row < tall; row++) {
        const half = Math.floor(row / 2);
        ctx.fillRect(x - half, ground - tall + row, half * 2 + 1, 1);
    }
    ctx.fillRect(x, ground, 1, 2);
}

function paintClouds(width, theme, rng) {
    const { canvas, ctx } = makeCanvas(width, CLOUDS.height);
    const { clouds } = theme;
    for (let i = 0; i < CLOUDS.count; i++) {
        const x = rng.int(0, width - 1);
        const y = rng.int(8, CLOUDS.height - 8);
        const long = rng.int(18, 46);
        // a cloud is a few stacked bars, the widest at the bottom, with a shaded underside
        for (let bar = 0; bar < 3; bar++) {
            const w = Math.round(long * (1 - bar * 0.28));
            const left = x + rng.int(0, long - w);
            ctx.fillStyle = clouds.light;
            for (const shift of [0, -width]) ctx.fillRect(left + shift, y - bar * 2, w, 2);
        }
        ctx.fillStyle = clouds.shade;
        for (const shift of [0, -width]) ctx.fillRect(x + shift + 2, y + 2, long - 4, 1);
    }
    return canvas;
}

/** Stars: single pixels, a few brighter ones with a cross, thinning towards the horizon. */
function paintStars(width, theme, rng, { height, perPixel }) {
    const { canvas, ctx } = makeCanvas(width, height);
    const { colors, bright } = theme.stars;
    const count = Math.round(width * perPixel);
    for (let i = 0; i < count; i++) {
        const x = rng.int(0, width - 1);
        // more stars high up, where the city's glow does not reach
        const y = Math.floor(height * rng.next() * rng.next());
        ctx.fillStyle = rng.pick(colors);
        ctx.fillRect(x, y, 1, 1);
        if (rng.chance(0.06)) {
            ctx.fillStyle = bright;
            ctx.fillRect(x - 1, y, 3, 1);
            ctx.fillRect(x, y - 1, 1, 3);
        }
    }
    return canvas;
}

/**
 * A skyline: blocks of every width and height side by side, lit windows in
 * rows, now and then an antenna with a red light; the theme's moon behind
 * the far one (`body`).
 */
function paintSkyline(width, theme, rng, layer) {
    const { height, tall, wide, lit } = layer;
    const look = theme.city[layer.look];
    const { canvas, ctx } = makeCanvas(width, height);
    if (layer.body) paintBody(ctx, bodyX(width, theme.sun), height - theme.sun.lift, theme.sun);
    let x = 0;
    while (x < width) {
        const w = Math.min(rng.int(wide[0], wide[1]), width - x);
        const h = rng.int(tall[0], tall[1]);
        paintBlock(ctx, { x, top: height - h, w, h }, look, rng, lit);
        x += w + (rng.chance(0.3) ? 1 : 0);
    }
    return canvas;
}

function paintBlock(ctx, { x, top, w, h }, look, rng, lit) {
    ctx.fillStyle = look.body;
    ctx.fillRect(x, top, w, h);
    ctx.fillStyle = look.edge;
    ctx.fillRect(x, top, w, 1);
    ctx.fillRect(x + w - 1, top, 1, h);
    // windows: a pixel every second column and every third row, lit by chance
    for (let wy = top + 3; wy < top + h - 2; wy += 3) {
        for (let wx = x + 2; wx < x + w - 2; wx += 2) {
            if (!rng.chance(lit)) continue;
            ctx.fillStyle = rng.pick(look.windows);
            ctx.fillRect(wx, wy, 1, 1);
        }
    }
    if (h > 20 && rng.chance(0.25)) {
        const ax = x + Math.floor(w / 2);
        ctx.fillStyle = look.edge;
        ctx.fillRect(ax, top - 5, 1, 5);
        ctx.fillStyle = look.beacon;
        ctx.fillRect(ax, top - 6, 1, 1);
    }
}

/**
 * The aurora: curtains of light whose lower edge waves across the sky, each
 * column a ray from the bright edge up through the theme's colours, the
 * last of them dithered away. One full turn wide, so it wraps.
 */
export function paintAuroraOn(ctx, width, height, theme, rng, curtains) {
    const { colors } = theme.aurora;
    for (let c = 0; c < curtains; c++) {
        const edgeAt = waveOf(rng, AURORA.edge);
        const rayAt = waveOf(rng, AURORA.rays);
        // the curtains hang one above the other, the lowest the brightest
        const base = height * (0.85 - 0.25 * (c / Math.max(1, curtains - 1)));
        for (let x = 0; x < width; x++) {
            const angle = (x / width) * TAU;
            const strength = Math.max(0, Math.min(1, 0.5 + rayAt(angle)));
            // every column a ray of its own length: the streaks of a real aurora
            const streak = 1 - AURORA.streak * rng.next();
            if (strength < 0.15) continue;
            const bottom = Math.round(base + edgeAt(angle));
            const tall = Math.round(height * streak * (AURORA.tall[0] + (AURORA.tall[1] - AURORA.tall[0]) * strength));
            paintRay(ctx, x, bottom, tall, colors);
        }
    }
}

/** A sum of sines that wraps once round: (angle) => value. */
function waveOf(rng, waves) {
    const phases = waves.map(() => rng.range(0, TAU));
    return (angle) => waves.reduce((sum, [k, amp], i) => sum + amp * Math.sin(k * angle + phases[i]), 0);
}

/** One column of a curtain, bright at the bottom, fading upwards; the top band dithered. */
function paintRay(ctx, x, bottom, tall, colors) {
    const band = Math.max(1, tall / colors.length);
    for (let dy = 0; dy < tall; dy++) {
        const i = Math.min(colors.length - 1, Math.floor(dy / band));
        if (i === colors.length - 1 && (x + dy) % 2 === 1) continue;
        ctx.fillStyle = colors[i];
        ctx.fillRect(x, bottom - dy, 1, 1);
    }
}

function paintAurora(width, theme, rng, { height, curtains }) {
    const { canvas, ctx } = makeCanvas(width, height);
    paintAuroraOn(ctx, width, height, theme, rng, curtains);
    return canvas;
}

const PAINTERS = {
    clouds: paintClouds,
    aurora: paintAurora,
    mountains: paintMountains,
    hills: paintHills,
    stars: paintStars,
    skyline: paintSkyline,
    planet: paintPlanet,
    spires: paintSpires,
    rays: paintRays,
    fish: paintFish,
    ruins: paintRuins,
    reef: paintReef,
    neonSun: paintNeonSun,
    gridPeaks: paintGridPeaks,
};

/** The layer kinds the backdrop knows (for the tests). */
export const LAYER_KINDS = Object.keys(PAINTERS);

/** The sky: flat bands with a checkered edge between two, the horizon at its bottom. */
function paintSky(width, height, bands) {
    const { canvas, ctx } = makeCanvas(width, height);
    const band = height / bands.length;
    bands.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, Math.round(i * band), width, Math.ceil(band) + 1);
    });
    for (let i = 1; i < bands.length; i++) {
        const edge = Math.round(i * band);
        ctx.fillStyle = bands[i];
        for (let row = 1; row <= DITHER_ROWS; row++) {
            for (let x = row % 2; x < width; x += 2) ctx.fillRect(x, edge - row, 1, 1);
        }
    }
    return canvas;
}

export class Backdrop {
    #theme;
    #focal;
    #sky = null;
    #layers;

    /**
     * @param {typeof import('../config/Themes.js').THEMES.dusk} theme its `layers`, far to near
     * @param {number} focal pixels per radian of turn
     */
    constructor(theme, focal) {
        this.#theme = theme;
        this.#focal = focal;
        const rng = new Rng(SEED);
        this.#layers = theme.layers.map((layer) => {
            const paint = PAINTERS[layer.kind];
            if (!paint) throw new Error(`No backdrop layer called ${layer.kind}`);
            const width = Math.min(MAX_WIDTH, Math.round(TAU * focal * layer.factor));
            return { image: paint(width, theme, rng, layer), factor: layer.factor, lift: layer.lift, drift: layer.drift ?? 0, pulse: layer.pulse };
        });
    }

    /** Paints the sky for a frame this wide, its horizon `skyHeight` rows down. */
    resize(width, skyHeight) {
        this.#sky = paintSky(width, skyHeight, this.#theme.sky);
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {{width: number, height: number}} size
     * @param {number} horizon screen row
     * @param {number} heading the road's heading under the car (radians, unwrapped)
     * @param {number} [clock] seconds, for the layers that drift and pulse
     */
    draw(ctx, { width, height }, horizon, heading, clock = 0) {
        const sky = this.#sky;
        ctx.fillStyle = this.#theme.sky[0];
        ctx.fillRect(0, 0, width, horizon);
        ctx.drawImage(sky, 0, horizon - sky.height);
        for (const layer of this.#layers) {
            const y = horizon - layer.image.height - layer.lift;
            if (layer.pulse) ctx.globalAlpha = 1 - layer.pulse.depth * (0.5 + 0.5 * Math.sin(clock * layer.pulse.rate));
            drawWrapped(ctx, layer.image, heading * this.#focal * layer.factor + layer.drift * clock, y, width);
            ctx.globalAlpha = 1;
        }
        // the land under the nearest layer, seen where a crest hides the road's far end
        const ground = horizon - this.#layers.at(-1).lift;
        ctx.fillStyle = this.#theme.fog;
        ctx.fillRect(0, ground, width, height - ground);
    }
}
