import { WORLD } from '../config/Tuning.js';

/**
 * The curtain of a scene change, in big square pixels: they grow from the
 * edges of the arena in to a ring of light round the mage (a lighter front
 * runs ahead of the dark), he dances in it while a few stars twinkle on the
 * dark, the ring shuts, the scene changes behind, then the pixels shrink
 * away from the mage out to the edges.
 */
const CELL = 40;
/** How much of a phase the wave of cells takes to cross the arena: the rest is each cell's own growth. */
const SPREAD = 0.6;
/** A cell grows in this many steps, not smoothly: pixel art. */
const STEPS = 4;
const DARK = '#0b0616';
const FRONT = '#3b2466';
const STAR = '#ffe7a3';
/** One cell in this many carries a star. */
const STAR_EVERY = 7;
/** The ring of light round the mage while he dances, in world pixels from his chest. */
const RING = 130;
/** The last share of the dance in which the ring shuts. */
const SHUT = 0.22;

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * How much of a cell is covered (0 to 1, in steps), for a cell at `reach`
 * (0 at the mage, 1 at the farthest corner) at `progress` of the `phase`,
 * with a ring of light of radius `ring` (same unit as `reach`) round the mage.
 * Closing covers the far cells first and stops at the ring; the ring shuts
 * at the end of the dance (`cheer`); opening uncovers the near cells first. Pure.
 */
export function curtainCover(phase, progress, reach, ring = 0) {
    if (phase === 'cheer') {
        const left = ring * clamp01((1 - progress) / SHUT);
        return reach < left ? 0 : 1;
    }
    if (phase === 'close' && reach < ring) return 0;
    const lead = phase === 'close' ? 1 - (reach - ring) / (1 - ring) : reach;
    const own = clamp01((progress - lead * SPREAD) / (1 - SPREAD));
    const grown = phase === 'close' ? own : 1 - own;
    return Math.ceil(grown * STEPS) / STEPS;
}

/** The cells of the arena with their distance from `center`, nearest 0, farthest 1. */
function cellsAround(center) {
    const cells = [];
    for (let y = 0; y < WORLD.height; y += CELL) {
        for (let x = 0; x < WORLD.width; x += CELL) cells.push({ x, y, d: Math.hypot(x + CELL / 2 - center.x, y + CELL / 2 - center.y) });
    }
    const far = Math.max(...cells.map((c) => c.d));
    return { far, cells: cells.map((c, i) => ({ x: c.x, y: c.y, reach: c.d / far, star: i % STAR_EVERY === 3 })) };
}

/**
 * Draws the curtain over the arena.
 * @param {{phase: 'close'|'cheer'|'open', progress: number}} journey
 * @param {{x: number, y: number}} center where it closes to (the mage)
 * @param {number} time seconds, for the stars' twinkle
 */
export function drawCurtain(ctx, journey, center, time) {
    const { phase, progress } = journey;
    const { far, cells } = cellsAround(center);
    for (const cell of cells) {
        const cover = curtainCover(phase, progress, cell.reach, RING / far);
        if (cover <= 0) continue;
        const size = Math.round((CELL * cover) / 2) * 2;
        const inset = (CELL - size) / 2;
        ctx.fillStyle = cover < 1 ? FRONT : DARK;
        ctx.fillRect(cell.x + inset, cell.y + inset, size, size);
        if (cover === 1 && cell.star && Math.floor(time * 4 + cell.x * 0.13 + cell.y * 0.07) % 3 === 0) {
            ctx.fillStyle = STAR;
            ctx.fillRect(cell.x + CELL / 2 - 2, cell.y + CELL / 2 - 2, 4, 4);
        }
    }
}
