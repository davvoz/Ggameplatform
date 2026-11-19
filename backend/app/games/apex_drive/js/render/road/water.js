import { Rng } from '../../core/Rng.js';
import { rgbOf } from '../color.js';
import { VOID } from './raster.js';

/**
 * Under the sea, painted into the road's pixels after the road: the light
 * from the surface rippling over the asphalt and the sea floor in a moving
 * net (caustics), and the currents shown as big arrows of silt, pointing
 * the way the water flows and sliding with it. Both belong to the road (they follow it round the bends) and
 * fade with the distance; the void of a trench is left to the abyss.
 *
 * The caustics are two tiles of a light net, sliding different ways and
 * added: where their lines cross the light is brightest.
 *
 * @typedef {{light: string, strength: number, reach: number, drift: number[], streak: string, flow: number}} WaterLook
 *   a theme's `water`: the light's colour and how strong it is, how far it
 *   is seen (world units), how fast the net slides (world units/s, across and
 *   along), the currents' arrows: their colour and speed (world units/s)
 */

/** The light net: a tile SIZE x SIZE cells, each CELL world units, from SPOTS random points; its lines and their glow. */
const NET = { size: 64, cell: 32, spots: 18, seed: 4242, line: 0.035, glow: 0.07 };
/** The two layers: their scale against the tile, and how they slide (shares of the look's drift). */
const LAYERS = [{ scale: 1, dx: 1, dz: 0.6 }, { scale: 1.6, dx: -0.7, dz: 1 }];
/**
 * Arrows of a current (world units): one every `every` along the flow, `thick`,
 * as wide as the road (`apart`: one spans a road it flows along); their arms
 * sweep back `sweep` for each unit off their tip; only on the road (`road`
 * half widths from its middle), seen up to `reach`, at most `most` of the
 * streak's colour added.
 */
const ARROW = { every: 1500, thick: 200, apart: 2200, sweep: 0.55, road: 0.85, reach: 26000, most: 0.45 };

function nearestTwo(points, x, y, size) {
    let first = Infinity;
    let second = Infinity;
    for (const [px, py] of points) {
        const dx = Math.min(Math.abs(px - x), size - Math.abs(px - x));
        const dy = Math.min(Math.abs(py - y), size - Math.abs(py - y));
        const d = Math.hypot(dx, dy);
        if (d < first) [first, second] = [d, first];
        else if (d < second) second = d;
    }
    return [first, second];
}

/** The net: 2 on its lines, 1 in their glow, 0 between (the cells' borders, where two spots are as near). */
function lightNet() {
    const { size, spots, seed, line, glow } = NET;
    const rng = new Rng(seed);
    const points = Array.from({ length: spots }, () => [rng.next() * size, rng.next() * size]);
    const cells = new Uint8Array(size * size);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const [first, second] = nearestTwo(points, x, y, size);
            const edge = (second - first) / size;
            if (edge < line) cells[y * size + x] = 2;
            else if (edge < glow) cells[y * size + x] = 1;
        }
    }
    return cells;
}

/** A pixel word lit by `amount` (0..1) of a colour. */
function lit(pixel, [r, g, b], amount) {
    const pr = Math.min(255, (pixel & 255) + Math.round(r * amount));
    const pg = Math.min(255, ((pixel >> 8) & 255) + Math.round(g * amount));
    const pb = Math.min(255, ((pixel >> 16) & 255) + Math.round(b * amount));
    return ((255 << 24) | (pb << 16) | (pg << 8) | pr) >>> 0;
}

/** The rows a strip painted (not hidden by nearer road), or null. */
function shownRows({ near, far, clip }) {
    if (clip === undefined || far.y >= clip || far.y >= near.y) return null;
    const first = Math.max(0, Math.ceil(far.y));
    const last = Math.min(clip, Math.ceil(near.y));
    return last > first ? { first, last } : null;
}

const wrap = (value, size) => ((value % size) + size) % size;

/**
 * The arrows of a current on a row: chevrons pointing the way the water
 * flows, sliding with it (`wx` from the road's middle, so along the road
 * one arrow spans it); null for no current, or one too far to see.
 * @returns {{at: (wx: number, wz: number) => boolean, strength: number}|null}
 */
function arrowsOf(current, z, clock, { speed, halfWidth }) {
    if (!current || z >= ARROW.reach) return null;
    const { along, across } = current;
    const force = Math.hypot(along, across);
    if (force < 0.05) return null;
    const [ux, uz] = [across / force, along / force];
    const slide = clock * speed * force;
    const half = ARROW.apart / 2;
    const edge = halfWidth * ARROW.road;
    return {
        strength: Math.min(ARROW.most, force * ARROW.most * 1.5) * (1 - z / ARROW.reach),
        at: (wx, wz) => {
            if (Math.abs(wx) > edge) return false;
            const off = wrap(wx * uz - wz * ux + half, ARROW.apart) - half;
            return wrap(wx * ux + wz * uz + Math.abs(off) * ARROW.sweep - slide, ARROW.every) < ARROW.thick;
        },
    };
}

export class WaterPainter {
    #net = lightNet();
    #look;
    #light;
    #streak;

    /** @param {WaterLook} look */
    constructor(look) {
        this.#look = look;
        this.#light = rgbOf(look.light);
        this.#streak = rgbOf(look.streak);
    }

    /**
     * @param {Uint32Array} pixels the road's, as painted
     * @param {{width: number}} size
     * @param {import('./project.js').Strip[]} strips near to far, with their `clip`
     * @param {{camera: {z: number}, clock: number, halfWidth: number}} frame
     */
    paint(pixels, { width }, strips, frame) {
        for (const strip of strips) {
            const rows = shownRows(strip);
            if (!rows) continue;
            for (let row = rows.first; row < rows.last; row++) this.#row(pixels, width, strip, row, frame);
        }
    }

    #row(pixels, width, strip, row, { camera, clock, halfWidth }) {
        const { near, far } = strip;
        const t = (row - far.y) / (near.y - far.y);
        const z = far.z + (near.z - far.z) * t;
        const light = Math.max(0, 1 - z / this.#look.reach) * this.#look.strength;
        const flow = arrowsOf(strip.current, z, clock, { speed: this.#look.flow, halfWidth });
        if (light <= 0 && !flow) return;
        const middle = far.x + (near.x - far.x) * t;
        const half = far.w + (near.w - far.w) * t;
        const wz = camera.z + z;
        const start = row * width;
        for (let x = 0; x < width; x++) {
            const pixel = pixels[start + x];
            if (pixel === VOID || pixel === 0) continue;
            const wx = ((x - middle) / half) * halfWidth;
            let out = pixel;
            if (light > 0) out = lit(out, this.#light, this.#caustic(wx, wz, clock) * light);
            if (flow?.at(wx, wz)) out = lit(out, this.#streak, flow.strength);
            pixels[start + x] = out;
        }
    }

    /** How lit (0..1) the floor is at (wx, wz): the two nets added. */
    #caustic(wx, wz, clock) {
        const { size, cell } = NET;
        const [driftX, driftZ] = this.#look.drift;
        let sum = 0;
        for (const layer of LAYERS) {
            const step = cell * layer.scale;
            const cx = Math.floor((wx + clock * driftX * layer.dx) / step) & (size - 1);
            const cz = Math.floor((wz + clock * driftZ * layer.dz) / step) & (size - 1);
            sum += this.#net[cz * size + cx];
        }
        return sum / 4;
    }
}
