import { Rng } from '../../core/Rng.js';
import { mixPixel, rgbOf, toPixel } from '../color.js';
import { VOID } from './raster.js';

/**
 * What one sees of the abyss, painted into the road's pixels wherever the
 * road left them VOID (render/road/raster.js): first the rock nearest the
 * eye, then the floor far below.
 *
 * - Walls: under the near edge of the asphalt that follows a gap, the far
 *   wall of the chasm drops to the floor; every few segments a pillar holds
 *   the road up over the void. Both are rock in strata, lit on the left,
 *   in shade on the right, glowing red where the magma lights them from below.
 * - The floor: a sea of magma under a cracked crust, a plane `depth` below
 *   the road, projected row by row like the road itself (the 16-bit floors),
 *   slower than the road (it is far deeper), flowing, lost in a red haze far off.
 *
 * Pure over the pixel buffer, like the road: numbers in, pixels out.
 *
 * @typedef {{floor: string[], haze: string, rock: string[], glow: string, fog: number[], flow: number}} AbyssLook
 *   a theme's `abyss`: the floor's colours (crust dark to hot magma), the haze it fades into,
 *   the rock's tones (lit, face, strata, shade), the glow from below, the floor's fog (world
 *   units, from and to) and how fast the magma flows (world units a second)
 */

/** The floor's texture: cells this many world units wide, a tile of SIZE x SIZE cells. */
const TEXTURE = { size: 128, cell: 240, seed: 6661 };
/**
 * Rock strata this many world units tall; pillars every so many segments, this share of the asphalt
 * wide, drawn up to this many segments away (farther they would only stack into a comb).
 */
const ROCK = { strata: 420, pillarEvery: 10, pillar: 0.3, pillarReach: 90, lip: 2, glowFrom: 0.55, glowSteps: 3 };
/** Fog steps for the floor and the walls. */
const FOG_STEPS = 8;
/** The floor slides sideways this many world units per radian the road turns, so bends sweep it by. */
const SWEEP = 30000;

/** A tiling value noise: smooth bumps on a lattice `every` cells apart. */
function valueNoise(rng, size, every) {
    const lattice = size / every;
    const grid = Array.from({ length: lattice * lattice }, () => rng.next());
    const at = (gx, gy) => grid[(gy % lattice) * lattice + (gx % lattice)];
    const smooth = (t) => t * t * (3 - 2 * t);
    return (x, y) => {
        const gx = Math.floor(x / every);
        const gy = Math.floor(y / every);
        const tx = smooth((x % every) / every);
        const ty = smooth((y % every) / every);
        const top = at(gx, gy) + (at(gx + 1, gy) - at(gx, gy)) * tx;
        const bottom = at(gx, gy + 1) + (at(gx + 1, gy + 1) - at(gx, gy + 1)) * tx;
        return top + (bottom - top) * ty;
    };
}

/**
 * The floor's cells: 0..2 crust (dark, plain, its rims), 3 magma, 4 white-hot.
 * Rivers of magma run where a ridged noise peaks; the crust between is mottled.
 */
function floorTexture() {
    const { size, seed } = TEXTURE;
    const rng = new Rng(seed);
    const rivers = [valueNoise(rng, size, 32), valueNoise(rng, size, 16)];
    const crust = [valueNoise(rng, size, 8), valueNoise(rng, size, 4)];
    const cells = new Uint8Array(size * size);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const n = rivers[0](x, y) * 0.7 + rivers[1](x, y) * 0.3;
            const ridge = 1 - Math.abs(n * 2 - 1);
            const mottle = crust[0](x, y) * 0.6 + crust[1](x, y) * 0.4;
            let kind = mottle < 0.42 ? 0 : 1;
            if (ridge > 0.8) kind = 2;
            if (ridge > 0.87) kind = 3;
            if (ridge > 0.95) kind = 4;
            cells[y * size + x] = kind;
        }
    }
    return cells;
}

export class AbyssPainter {
    #cells = floorTexture();
    #look;
    /** floor[fog][kind] and rock[fog][glow][tone], as pixel words. */
    #floor;
    #rock;
    #haze;

    /** @param {AbyssLook} look */
    constructor(look) {
        this.#look = look;
        this.#haze = toPixel(rgbOf(look.haze));
        this.#floor = Array.from({ length: FOG_STEPS + 1 }, (_, f) => look.floor.map((color) => mixPixel(color, look.haze, f / FOG_STEPS)));
        this.#rock = Array.from({ length: FOG_STEPS + 1 }, (_, f) => Array.from({ length: ROCK.glowSteps + 1 }, (_, g) => {
            const glow = (g / ROCK.glowSteps) * 0.75;
            return look.rock.map((tone) => mixPixel(rgbHex(mixPixel(tone, look.glow, glow)), look.haze, f / FOG_STEPS));
        }));
    }

    /**
     * @param {Uint32Array} pixels the road's, VOID where the abyss shows
     * @param {{width: number, height: number}} size
     * @param {import('./project.js').Strip[]} strips near to far, as painted
     * @param {{horizon: number, focal: number, camera: {x: number, y: number, z: number}, floor: number,
     *   heading: number, clock: number, halfWidth: number, drawDistance: number}} frame
     */
    paint(pixels, size, strips, frame) {
        for (const strip of strips) this.#walls(pixels, size, strip, frame);
        this.#floorRows(pixels, size, frame);
    }

    /** The far wall of a gap under the asphalt that follows it, and the pillars under the road. */
    #walls(pixels, size, strip, frame) {
        if (strip.clip === undefined || strip.near.y >= size.height) return;
        const pillar = strip.abyss && strip.index % ROCK.pillarEvery === 0 && strip.n < ROCK.pillarReach;
        for (const ribbon of strip.ribbons) {
            if (!ribbon.face && !pillar) continue;
            const share = ribbon.face ? 1 + 1 / 7 : ROCK.pillar;
            this.#column(pixels, size, strip, frame, { c: ribbon.c, w: ribbon.w * share });
        }
    }

    /** A column of rock from the strip's near edge down to the floor, over the void only. */
    #column(pixels, { width, height }, strip, frame, { c, w }) {
        const { near } = strip;
        const perUnit = near.w / frame.halfWidth;
        const left = Math.max(0, Math.round(near.x + (c - w) * near.w));
        const right = Math.min(width, Math.round(near.x + (c + w) * near.w));
        if (right <= left) return;
        const top = Math.max(0, Math.ceil(near.y));
        const bottom = Math.min(height, Math.ceil(frame.horizon + (frame.camera.y - frame.floor) * perUnit));
        const fog = this.#rock[Math.round(Math.min(1, strip.n / frame.drawDistance) * FOG_STEPS)];
        const lit = left + (right - left) * 0.22;
        const shade = left + (right - left) * 0.74;
        for (let row = top; row < bottom; row++) {
            const below = (row - near.y) / perUnit;
            const down = (row - top) / Math.max(1, bottom - top);
            const glow = fog[glowStep(down)];
            const strata = Math.floor(below / ROCK.strata) % 2 === 1;
            const lip = row - top < ROCK.lip;
            const start = row * width;
            for (let x = left; x < right; x++) {
                if (pixels[start + x] !== VOID) continue;
                pixels[start + x] = glow[toneAt(x, { lit, shade, strata, lip })];
            }
        }
    }

    /** The magma floor, row by row: each row is a line of the plane at the depth that row sees. */
    #floorRows(pixels, { width, height }, frame) {
        const { horizon, focal, camera, floor, heading, clock } = frame;
        const { size, cell } = TEXTURE;
        const [fogNear, fogFar] = this.#look.fog;
        const drop = camera.y - floor;
        for (let row = 0; row < height; row++) {
            const start = row * width;
            const sees = row - horizon;
            const z = sees > 0 ? (drop * focal) / sees : Infinity;
            const fog = Math.round(Math.max(0, Math.min(1, (z - fogNear) / (fogFar - fogNear))) * FOG_STEPS);
            const colors = this.#floor[fog];
            const step = z / focal / cell;
            const left = (camera.x + heading * SWEEP) / cell - (width / 2) * step;
            const ty = (Math.floor((camera.z + z + clock * this.#look.flow) / cell) & (size - 1)) * size;
            for (let x = 0; x < width; x++) {
                if (pixels[start + x] !== VOID) continue;
                if (fog === FOG_STEPS) {
                    pixels[start + x] = this.#haze;
                    continue;
                }
                const tx = Math.floor(left + x * step) & (size - 1);
                pixels[start + x] = colors[this.#cells[ty + tx]];
            }
        }
    }
}

/** How lit from below a row of a column is, by how far down it is (0 at the road, 1 at the floor). */
function glowStep(down) {
    const share = (down - ROCK.glowFrom) / (1 - ROCK.glowFrom);
    return Math.max(0, Math.min(ROCK.glowSteps, Math.floor(share * (ROCK.glowSteps + 1))));
}

/** Which tone of the rock a pixel of a column takes: the lip in shade, then lit, face (or strata), shade. */
function toneAt(x, { lit, shade, strata, lip }) {
    if (lip || x >= shade) return 3;
    if (x < lit) return 0;
    return strata ? 2 : 1;
}

/** A pixel word back to '#rrggbb' (to mix it again). */
function rgbHex(pixel) {
    const r = pixel & 255;
    const g = (pixel >> 8) & 255;
    const b = (pixel >> 16) & 255;
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
