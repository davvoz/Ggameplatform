import { VORTEX } from '../../config/Hazards.js';
import { CIRCLE, spanOf, surfaceAt } from '../../sim/Vortex.js';

/**
 * The road of a vortex track (sim/Vortex.js), drawn in pieces instead of
 * rows: where it rolls up, the screen's rows no longer follow it, and the
 * camera rolls with the car, so that the surface under it is always down.
 *
 * Each strip is cut across into pieces (the ground beside a flat road, the
 * rumble strips, the asphalt and its lane marks, the walls in neon panels,
 * the seams between them, a turbo strip); a piece of a rolled strip is cut
 * again so that none spans more than STEP of a turn. Each piece is a quad
 * from the strip's far cross-section to its near one, turned with the
 * camera and filled into the pixels, far to near: nearer road covers
 * farther road. Where the road is flat the pieces are the scanline road's,
 * in its colours (RoadPalette); a half pipe stands on the ground, so the
 * ground is filled first under it; a closed tube hides everything else.
 *
 * Pure functions over a Uint32Array: testable without a browser.
 *
 * @typedef {{x: number, y: number}} Point
 * @typedef {{x: number, y: number, roll: number}} VortexCamera
 *   world units across and up from the road's line under the car, and the camera's roll (radians)
 */

/** The largest share of a turn one piece of a rolled strip spans (smaller ones make a rounder tube). */
const STEP = (Math.PI * 2) / 48;
/** The ground beside a flat road reaches this far either side (half widths): past the screen's edge. */
const GROUND = 600;
/** Rumble strips and lane marks, as on the scanline road (render/road/raster.js). */
const RUMBLE = 1 / 7;
const LANE = 1 / 28;
/** Seams between the wall's panels: so many round the tube, so wide (half widths). */
const SEAMS = { count: 12, width: 0.05 };
/** Every so many segments a ring of light goes round the walls. */
const RING_EVERY = 12;
/**
 * The neon grid on the ground beside a flat road, in a theme that has one
 * (`grid`): lines along the road `apart` half widths from each other from
 * `from` out to `reach`, `width` wide, and a line across every `every` segments.
 */
const GRID = { from: 2.6, apart: 3, reach: 32, width: 0.06, every: 8 };
/** Nothing standing on the road is cut by nearer road here (the rows do not follow it): a clip row far below the screen. */
const UNCUT = 100000;
/** A strip this narrow (pixels per half width at its near edge) is drawn without its fine lines. */
const FINE = 4;
/** A piece of a rolled strip is not cut into pieces shorter than this on screen (pixels). */
const CUT_PIXELS = 5;
/** [least width, batch]: strips at least so wide (pixels per half width) are drawn so many as one. */
const LOD = [[24, 1], [12, 2], [6, 4], [0, 8]];

/**
 * Where the camera is, riding behind a car at x on a segment rolled `roll`:
 * `height` above the surface, along the surface's upright there.
 * @returns {VortexCamera}
 */
export function vortexCamera(roll, x, height, halfWidth) {
    const p = surfaceAt(roll, x);
    return {
        x: p.x * halfWidth - Math.sin(p.angle) * height,
        y: p.y * halfWidth + Math.cos(p.angle) * height,
        roll: p.angle,
    };
}

/** Turns screen points round the pivot by the camera's roll. @returns {(point: Point) => Point} */
export function turner(pivot, roll) {
    const [cos, sin] = [Math.cos(roll), Math.sin(roll)];
    return ({ x, y }) => {
        const [dx, dy] = [x - pivot.x, y - pivot.y];
        return { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos };
    };
}

/** A point on a strip's edge: x along the surface rolled `roll`, on screen (before the turn). */
function onEdge(edge, roll, x) {
    const p = surfaceAt(roll, x);
    return { x: edge.x + p.x * edge.w, y: edge.y - p.y * edge.w };
}

/**
 * Fills a convex polygon into the pixels, a little generously: every pixel
 * it touches, sampled at the middle of each row within it. Neighbouring
 * pieces overlap by a pixel rather than leave a crack where their edges are
 * cut differently (a near strip's arc in more pieces than a far batch's).
 */
export function fillPolygon(pixels, width, height, points, color) {
    let top = Infinity;
    let bottom = -Infinity;
    for (const p of points) {
        top = Math.min(top, p.y);
        bottom = Math.max(bottom, p.y);
    }
    const first = Math.max(0, Math.floor(top));
    const last = Math.min(height - 1, Math.floor(bottom));
    for (let row = first; row <= last; row++) {
        const [left, right] = crossing(points, Math.min(bottom, Math.max(top, row + 0.5)));
        const a = Math.max(0, Math.floor(left));
        const b = Math.min(width, Math.ceil(right));
        if (b > a) pixels.fill(color, row * width + a, row * width + b);
    }
}

/** Where a row (at height y) enters and leaves a convex polygon. */
function crossing(points, y) {
    let left = Infinity;
    let right = -Infinity;
    for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        if ((a.y < y && b.y < y) || (a.y > y && b.y > y)) continue;
        const x = a.y === b.y ? Math.min(a.x, b.x) : a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y);
        if (a.y === b.y) right = Math.max(right, Math.max(a.x, b.x));
        left = Math.min(left, x);
        right = Math.max(right, x);
    }
    return [left, right];
}

/**
 * The marks across the road, as [from, to, colour key] in half widths from
 * the bottom line, the asphalt's lane marks and the walls' seams included;
 * the turbo strip over all. Fine lines are left out far away.
 */
function marks(strip, colors, fine, lanes) {
    const out = [[-1 - RUMBLE, -1, 'rumble'], [-1, 1, 'asphalt'], [1, 1 + RUMBLE, 'rumble']];
    if (fine && colors.lane !== null) {
        for (let k = 1; k < lanes; k++) {
            const at = -1 + (2 * k) / lanes;
            out.push([at - LANE, at + LANE, 'lane']);
        }
    }
    if (fine && strip.roll > 0) {
        for (let k = 1; k < SEAMS.count; k++) {
            const at = -CIRCLE / 2 + (CIRCLE * k) / SEAMS.count;
            if (Math.abs(at) > 1 + RUMBLE + SEAMS.width) out.push([at - SEAMS.width, at + SEAMS.width, 'seam']);
        }
    }
    if (strip.turbo !== undefined) out.push([strip.turbo - VORTEX.turboWidth, strip.turbo + VORTEX.turboWidth, 'turbo']);
    return out;
}

/** The grid's lines along the ground, as marks; none without a grid, or far away. */
function gridLines(colors, fine) {
    if (!fine || colors.grid === undefined) return [];
    const out = [];
    for (let at = GRID.from; at <= GRID.reach; at += GRID.apart) {
        for (const side of [-1, 1]) out.push([side * at - GRID.width, side * at + GRID.width, 'grid']);
    }
    return out;
}

/**
 * The pieces across a strip, from `from` to `to` half widths: the base
 * (walls, or the ground on a flat road) with the marks laid over, later ones on top.
 * @returns {{from: number, to: number, key: string}[]}
 */
function pieces(from, to, base, overlays) {
    const cuts = new Set([from, to]);
    for (const [a, b] of overlays) for (const x of [a, b]) if (x > from && x < to) cuts.add(x);
    const sorted = [...cuts].sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < sorted.length - 1; i++) {
        const middle = (sorted[i] + sorted[i + 1]) / 2;
        const over = overlays.findLast(([a, b]) => middle >= a && middle <= b);
        const key = over ? over[2] : base;
        const last = out.at(-1);
        if (last && last.key === key) last.to = sorted[i + 1];
        else out.push({ from: sorted[i], to: sorted[i + 1], key });
    }
    return out;
}

/** The colour of a piece. */
function colorOf(key, colors, strip, clock) {
    if (key === 'turbo') return colors.turbo[(strip.index + Math.floor(clock * 24)) % 2];
    if (key === 'wall' && strip.index % RING_EVERY === 0) return colors.ring;
    if (key === 'grass' && colors.grid !== undefined && strip.index % GRID.every === 0) return colors.grid;
    return colors[key];
}

/**
 * Fills one piece of a strip: a quad from its far cross-section to its near
 * one, cut again round a rolled surface so that it curves (no cut shorter
 * than CUT_PIXELS on screen).
 */
function fillPiece(target, strip, piece, color) {
    const { near, far, roll, farRoll } = strip;
    const width = piece.to - piece.from;
    // the turn the piece spans round the surface's circle (radius VORTEX.radius / roll)
    const turn = (width * Math.max(roll, farRoll)) / VORTEX.radius;
    const cuts = Math.max(1, Math.min(Math.ceil(turn / STEP), Math.ceil((width * near.w) / CUT_PIXELS)));
    // a half pipe's edge holds its pieces within its lips; flat ground and a closed tube hold nothing
    const lips = (edgeRoll) => (edgeRoll > 0 && edgeRoll < 1 ? spanOf(edgeRoll) : Infinity);
    const nearSpan = lips(roll);
    const farSpan = lips(farRoll);
    const at = (edge, edgeRoll, span, x) => target.turn(onEdge(edge, edgeRoll, Math.max(-span, Math.min(span, x))));
    let farA = at(far, farRoll, farSpan, piece.from);
    let nearA = at(near, roll, nearSpan, piece.from);
    for (let k = 1; k <= cuts; k++) {
        const b = piece.from + (width * k) / cuts;
        const farB = at(far, farRoll, farSpan, b);
        const nearB = at(near, roll, nearSpan, b);
        fillPolygon(target.pixels, target.width, target.height, [farA, farB, nearB, nearA], color);
        [farA, nearA] = [farB, nearB];
    }
}

/** How many strips are drawn as one where a strip is so wide (pixels per half width at its near edge). */
function batchOf(width) {
    return LOD.find(([least]) => width >= least)[1];
}

/**
 * The strips to draw, near to far: near ones one by one, far ones merged in
 * batches (from the first one's near edge to the last one's far edge, in the
 * first one's colours) that start on segments a multiple of their size, so
 * that they do not shimmer as the camera moves.
 */
function batches(strips) {
    const out = [];
    let i = 0;
    while (i < strips.length) {
        const size = batchOf(strips[i].near.w);
        let j = i + 1;
        while (j < strips.length && j - i < size && strips[j].index % size !== 0) j++;
        const last = strips[j - 1];
        out.push(j - i === 1 ? strips[i] : { ...strips[i], far: last.far, farRoll: last.farRoll });
        i = j;
    }
    return out;
}

const piecesKept = new Map();

/** The pieces across a strip, kept: they depend on few things. */
function piecesOf(strip, colors, base, { from, to, fine, lanes }) {
    const key = `${base}:${from}:${to}:${fine}:${colors.lane !== null}:${colors.grid !== undefined}:${strip.roll > 0}:${strip.turbo}`;
    let kept = piecesKept.get(key);
    if (!kept) {
        const ground = base === 'grass';
        const road = ground && strip.roll > 0 ? [] : marks(strip, colors, fine, lanes);
        kept = pieces(from, to, base, ground ? [...gridLines(colors, fine), ...road] : road);
        piecesKept.set(key, kept);
    }
    return kept;
}

/**
 * @param {Uint32Array} pixels width x height, cleared here
 * @param {{width: number, height: number}} size
 * @param {import('./project.js').Strip[]} strips near to far; each gets `clip` (nothing is cut by rows here)
 * @param {(strip: import('./project.js').Strip) => object} colorsOf the strip's colours (RoadPalette, with the vortex's)
 * @param {{pivot: Point, roll: number, clock: number, lanes: number}} frame
 */
export function paintVortex(pixels, { width, height }, strips, colorsOf, { pivot, roll, clock, lanes }) {
    pixels.fill(0);
    for (const strip of strips) strip.clip = UNCUT;
    const target = { pixels, width, height, turn: turner(pivot, roll) };
    const drawn = batches(strips);
    for (let i = drawn.length - 1; i >= 0; i--) {
        const strip = drawn[i];
        const colors = colorsOf(strip);
        const fine = strip.near.w >= FINE;
        const flat = strip.roll <= 0 && strip.farRoll <= 0;
        const paint = (piece, on) => fillPiece(target, on, piece, colorOf(piece.key, colors, strip, clock));
        // the ground: the flat road's own, or under a half pipe (hidden by it but past its lips); none round a closed tube
        if (strip.roll < 1 || strip.farRoll < 1) {
            const ground = { ...strip, roll: 0, farRoll: 0 };
            for (const piece of piecesOf(strip, colors, 'grass', { from: -GROUND, to: GROUND, fine, lanes })) paint(piece, ground);
        }
        if (flat) continue;
        const span = spanOf(Math.max(strip.roll, strip.farRoll));
        for (const piece of piecesOf(strip, colors, 'wall', { from: -span, to: span, fine, lanes })) paint(piece, strip);
    }
}

/**
 * Something standing on a vortex track (render/road/place.js `placeOnRoad`)
 * moved onto the surface: x along it from the bottom, up its upright,
 * turned with the camera, leaning with the surface (`angle`, radians, to
 * turn it about its foot).
 * @param {import('./place.js').Placement} place
 * @param {{roll: number, x: number, reference: number, turn: (point: Point) => Point, cameraRoll: number}} on
 */
export function onVortex(place, { roll, x, reference, turn, cameraRoll }) {
    const half = place.scale * reference;
    const middle = place.x - x * half;
    const p = surfaceAt(roll, x);
    const at = turn({ x: middle + p.x * half, y: place.y - p.y * half });
    return { ...place, x: at.x, y: at.y, angle: cameraRoll - p.angle };
}
