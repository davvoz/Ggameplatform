import { paintGrid } from './pixels.js';

/**
 * The mouse's sight, drawn in the arena with the game's own pixels: a gold
 * sight, orange brackets that pulse on whatever a click would hit, a blue
 * shield on the mage. Each look is a mask of lit cells ('a', 'b', 'c' for its
 * colours); the dark outline is added around it, so it shows on the forest
 * and on the magic alike.
 */
const PX = 3;
const OUTLINE = '#140c1c';
const SHADES = { a: 2, b: 3, c: 4 };
const AROUND = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
/** Frames a second of the lock's pulse. */
const PULSE_RATE = 6;
/** How much a shield sight fades while the shield is recharging. */
const DIM_ALPHA = 0.45;

const LOOKS = {
    free: {
        colors: ['#ffe0a0', '#ffffff'],
        frames: [[
            '...............',
            '.......a.......',
            '.......a.......',
            '....aa...aa....',
            '...a.......a...',
            '...a.......a...',
            '...............',
            '.aa....b....aa.',
            '...............',
            '...a.......a...',
            '...a.......a...',
            '....aa...aa....',
            '.......a.......',
            '.......a.......',
            '...............',
        ]],
    },
    lock: {
        colors: ['#ff8a3c', '#ffe0a0'],
        frames: [[
            '...............',
            '.aaa.......aaa.',
            '.a...........a.',
            '.a...........a.',
            '...............',
            '...............',
            '.......a.......',
            '......aba......',
            '.......a.......',
            '...............',
            '...............',
            '.a...........a.',
            '.a...........a.',
            '.aaa.......aaa.',
            '...............',
        ], [
            '...............',
            '...............',
            '..aaa.....aaa..',
            '..a.........a..',
            '..a.........a..',
            '...............',
            '.......a.......',
            '......aba......',
            '.......a.......',
            '...............',
            '..a.........a..',
            '..a.........a..',
            '..aaa.....aaa..',
            '...............',
            '...............',
        ]],
    },
    shield: {
        colors: ['#a6ecff', '#3b9be0', '#ffffff'],
        frames: [[
            '...............',
            '...............',
            '..aaaaaaaaaaa..',
            '..abbbbbbbbba..',
            '..abcbbbbbbba..',
            '..abcbbbbbbba..',
            '..abbbbbbbbba..',
            '..abbbbbbbbba..',
            '...abbbbbbba...',
            '...abbbbbbba...',
            '....abbbbba....',
            '.....abbba.....',
            '......aba......',
            '.......a.......',
            '...............',
        ]],
    },
};

/**
 * A mask of lit cells as a grid of shades for `paintGrid`, with the outline
 * (1) on every empty cell touching a lit one. Pure, for the tests too.
 */
export function outlined(mask) {
    const lit = (x, y) => (mask[y]?.[x] ?? '.') !== '.';
    return mask.map((row, y) => [...row].map((cell, x) => {
        if (cell !== '.') return SHADES[cell];
        return AROUND.some(([dx, dy]) => lit(x + dx, y + dy)) ? 1 : 0;
    }).join(''));
}

function paintLooks() {
    const looks = {};
    for (const [name, { colors, frames }] of Object.entries(LOOKS)) {
        looks[name] = frames.map((mask) => paintGrid({ grid: outlined(mask), colors: [OUTLINE, ...colors] }, PX));
    }
    return looks;
}

export class SightArt {
    /** Painted on the first draw: the page has a document by then. */
    #looks = null;

    /**
     * The sight centred on (x, y), in world units.
     * @param {{x: number, y: number, look: 'free'|'lock'|'shield', time: number, dim?: boolean}} sight
     *   `dim` when a click there would do nothing yet (the shield recharging)
     */
    draw(ctx, { x, y, look, time, dim = false }) {
        this.#looks ??= paintLooks();
        const frames = this.#looks[look] ?? this.#looks.free;
        const image = frames[Math.floor(time * PULSE_RATE) % frames.length];
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = dim ? DIM_ALPHA : 1;
        ctx.drawImage(image, Math.round(x - image.width / 2), Math.round(y - image.height / 2));
        ctx.restore();
    }
}
