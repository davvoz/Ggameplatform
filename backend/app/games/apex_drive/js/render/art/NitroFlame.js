import { mirror, paintRows } from './pixels.js';

/**
 * The nitro, seen from behind the car as the 16-bit racers showed it: one
 * wide fireball out of the twin exhausts (white cores, yellow, orange, red
 * tongues), redrawn from a few hand-made frames so it licks and flickers;
 * embers sprayed out to the sides; the asphalt under the car lit orange.
 * The player's car sits low on the screen, so the fire is wide rather than
 * long, and everything moves down and out like the road does: it reads at
 * a glance and never fights the rain or the road for the eye.
 */
export const FLAME_INK = { w: '#ffffff', y: '#ffd34a', o: '#ff7a2a', r: '#e8303c' };
export const FLAME_FRAMES = [
    [
        '....w...w....',
        '...wyw.wyw...',
        '..wyyywyyyw..',
        '..yyyyyyyyy..',
        '.yyyoyyyoyyy.',
        '.yyooyyyooyy.',
        '..yooooooyy..',
        '..ooooroooo..',
        '...ooorooo...',
        '....orrro....',
        '.....r.r.....',
        '.....r.r.....',
    ],
    [
        '....w...w....',
        '...wyw.wyw...',
        '...wyywyyw...',
        '..wyyyyyyyw..',
        '.yyyyoyoyyyy.',
        'yyyooyyyooyyy',
        '.yyooooooyyy.',
        '..oooorooooo.',
        '..ooorrrooo..',
        '...or.r.ro...',
        '...r..r..r...',
        '..r.......r..',
    ],
    [
        '....w...w....',
        '..wywywywyw..',
        '.wyyyyyyyyyw.',
        'wyyyoyyyoyyyw',
        '.yyooyyyooyy.',
        '..ooooooooo..',
        '...oororoo...',
        '....rr.rr....',
        '.............',
        '.............',
        '.............',
        '.............',
    ],
];
/** Flame frames a second. */
const FRAME_RATE = 20;
/** Embers; how many times a second each is blown out; how far out to the side and down (pixels). */
const EMBERS = { count: 14, rate: 2.2, spread: 30, drop: 12 };
const EMBER_COLORS = ['#ffffff', '#ffd34a', '#ff7a2a', '#e8303c'];
/** The orange light on the road under the car, two strengths to flicker between. */
const GLOW = ['rgba(255, 150, 50, 0.42)', 'rgba(255, 120, 40, 0.3)'];

export class NitroFlame {
    #frames = null;

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {{left: number, top: number, width: number, height: number}} box the car's sprite on screen
     * @param {{x: number, y: number}[]} pipes the exhausts, in sprite pixels: the fire comes from between them
     * @param {number} clock seconds
     */
    draw(ctx, box, pipes, clock) {
        this.#frames ??= this.#paint();
        const tick = Math.floor(clock * FRAME_RATE);
        glow(ctx, box, tick);
        const x = box.left + Math.round(pipes.reduce((sum, pipe) => sum + pipe.x, 0) / pipes.length);
        const y = box.top + Math.max(...pipes.map((pipe) => pipe.y)) + 1;
        embers(ctx, x, y, clock);
        const frame = this.#frames[tick % this.#frames.length];
        ctx.drawImage(frame, x - Math.floor(frame.width / 2), y);
    }

    /** The frames, and the two tallest mirrored, so the tongues lick both ways. */
    #paint() {
        const [low, high, squat] = FLAME_FRAMES.map((rows) => paintRows(rows, FLAME_INK));
        return [low, high, squat, mirror(high), mirror(low), high];
    }
}

function glow(ctx, { left, top, width, height }, tick) {
    ctx.fillStyle = GLOW[tick % 2];
    const middle = left + width / 2;
    const bottom = top + height;
    for (let row = 0; row < 6; row++) {
        const half = Math.round(width / 2 + 8 - row * 4);
        ctx.fillRect(Math.round(middle - half), bottom - 1 + row, half * 2, 1);
    }
}

/** Sparks thrown out to both sides of the fire, falling a little and cooling as they go. */
function embers(ctx, x, y, clock) {
    for (let e = 0; e < EMBERS.count; e++) {
        const side = e % 2 ? 1 : -1;
        const t = (clock * EMBERS.rate + ((e * 0.618) % 1)) % 1;
        const reach = 0.45 + ((e * 37) % 11) / 20;
        ctx.fillStyle = EMBER_COLORS[Math.min(EMBER_COLORS.length - 1, Math.floor(t * EMBER_COLORS.length))];
        ctx.fillRect(Math.round(x + side * (4 + t * EMBERS.spread * reach)), Math.round(y + 2 + t * t * EMBERS.drop + (e % 3)), 1, 1);
    }
}
