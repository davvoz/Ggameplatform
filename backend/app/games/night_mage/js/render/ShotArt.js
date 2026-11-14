import { paintGrid } from './pixels.js';

/**
 * The monsters' shots as pixel art, drawn pointing right and turned the way
 * they fly: the archer's arrow and the brawler's blue fireball (two frames
 * of flickering flame). 0 = empty, then the colours in order.
 */
const ARROW = {
    grid: [
        '550000000000011000',
        '665500000000013310',
        '022222222222223441',
        '665500000000013310',
        '550000000000011000',
    ],
    // steel outline, shaft, steel, shine, feathers
    colors: ['#2b2d3a', '#9a6a36', '#b9c6cf', '#ffffff', '#c23b3b', '#ff8a7a'],
};

const FIREBALL_FRAMES = [
    [
        '00000001111000',
        '00001112334100',
        '00112233455410',
        '01223334555541',
        '12233345555541',
        '01223334555541',
        '00112233455410',
        '00001112334100',
        '00000001111000',
    ],
    [
        '00000011111000',
        '00011122334100',
        '01122233455410',
        '00223334555541',
        '01233345555541',
        '11223334555541',
        '00012233455410',
        '00011112334100',
        '00000001111000',
    ],
];
const FIREBALL_COLORS = ['#0b1f5c', '#1d4fd1', '#2f8cff', '#8fdcff', '#f2fcff'];

const ARROW_PX = 3;
const FIREBALL_PX = 4;
/** Flame frames per second. */
const FLICKER = 12;

/**
 * Paints the shots once.
 * @returns {{arrow: {canvas: HTMLCanvasElement, ax: number, ay: number}, fireball: {canvas: HTMLCanvasElement, ax: number, ay: number}[]}}
 *   each with the point (`ax`, `ay`) that sits on the shot's position
 */
export function paintShots() {
    return {
        arrow: { canvas: paintGrid(ARROW, ARROW_PX), ax: 12 * ARROW_PX, ay: 2.5 * ARROW_PX },
        fireball: FIREBALL_FRAMES.map((grid) => ({
            canvas: paintGrid({ grid, colors: FIREBALL_COLORS }, FIREBALL_PX),
            ax: 10.5 * FIREBALL_PX,
            ay: 4.5 * FIREBALL_PX,
        })),
    };
}

/**
 * Draws a shot where it is, turned the way it flies.
 * @param {ReturnType<typeof paintShots>} art
 * @param {{kind: string, x: number, y: number, vx: number, vy: number}} shot
 * @param {number} time seconds, for the flicker
 */
export function drawShot(ctx, art, shot, time) {
    const look = shot.kind === 'arrow' ? art.arrow : art.fireball[Math.floor(time * FLICKER) % art.fireball.length];
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(shot.x), Math.round(shot.y));
    ctx.rotate(Math.atan2(shot.vy, shot.vx));
    ctx.drawImage(look.canvas, -look.ax, -look.ay);
    ctx.restore();
}
