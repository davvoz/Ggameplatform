import { TAUNTS } from '../../config/Taunts.js';
import { Rng } from '../../core/Rng.js';
import { drawText, LINE, textWidth } from '../PixelFont.js';
import { ease, progress } from '../ui/ease.js';
import { panel, UI } from '../ui/widgets.js';

/**
 * The player's speech bubble: on an `overtake` event of the race it pops
 * up over the player's car with a line of config/Taunts.js (gold for a
 * rival a lap down), stays a moment and blinks away. One at a time: a jibe
 * that comes while another is up is dropped, but a mock for a lapped car
 * takes the place of a plain jibe.
 */
const PAD = { x: 4, y: 3 };
const TAIL = 4;
const MARGIN = 2;
const RISE = { time: 0.18, pixels: 5 };
const BLINK = { time: 0.3, rate: 16 };
const LOOK = {
    overtake: { fill: UI.cream, text: UI.ink },
    lapped: { fill: UI.gold, text: UI.ink },
};

export class Taunts {
    #lines;
    #turn = { overtake: 0, lapped: 0 };
    /** @type {{text: string, kind: 'overtake'|'lapped', born: number} | null} */
    #bubble = null;
    #clock = 0;

    /** @param {number} seed the race's: the order of the lines */
    constructor(seed) {
        const rng = new Rng(seed);
        this.#lines = { overtake: shuffled(TAUNTS.overtake, rng), lapped: shuffled(TAUNTS.lapped, rng) };
    }

    /** @returns {'overtake'|'lapped'|null} the kind of bubble that popped up for the event, if one did */
    handle(event) {
        if (event.type !== 'overtake') return null;
        const kind = event.lapped ? 'lapped' : 'overtake';
        if (!this.#roomFor(kind)) return null;
        const lines = this.#lines[kind];
        const line = lines[this.#turn[kind]++ % lines.length];
        this.#bubble = { text: line.replace('{name}', event.name), kind, born: this.#clock };
        return kind;
    }

    /** The line being shown, or null. */
    get text() {
        return this.#bubble?.text ?? null;
    }

    update(dt) {
        this.#clock += dt;
        if (this.#bubble && this.#age > TAUNTS.show) this.#bubble = null;
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {{width: number}} size
     * @param {{x: number, y: number}} car the middle of the top of the player's car
     */
    draw(ctx, { width }, car) {
        const bubble = this.#bubble;
        if (!bubble) return;
        const age = this.#age;
        if (age > TAUNTS.show - BLINK.time && Math.floor(age * BLINK.rate) % 2) return;
        const look = LOOK[bubble.kind];
        const w = textWidth(bubble.text) + PAD.x * 2;
        const h = LINE + PAD.y * 2;
        const rise = Math.round((1 - ease.outBack(progress(age, 0, RISE.time))) * RISE.pixels);
        const tipX = Math.round(car.x + 6);
        const x = Math.round(Math.min(width - w - MARGIN, Math.max(MARGIN, tipX - w / 3)));
        const y = Math.round(car.y - TAIL - h - 2 + rise);
        panel(ctx, x, y, w, h, { fill: look.fill, edge: look.fill });
        tail(ctx, tipX, y + h - 1, look.fill);
        drawText(ctx, bubble.text, x + PAD.x, y + PAD.y, { color: look.text });
    }

    get #age() {
        return this.#clock - this.#bubble.born;
    }

    #roomFor(kind) {
        if (!this.#bubble) return true;
        if (kind === 'lapped' && this.#bubble.kind === 'overtake') return true;
        return this.#age > TAUNTS.show + TAUNTS.gap;
    }
}

/** The bubble's pointer: rows narrowing down towards the car, outlined in ink. */
function tail(ctx, x, top, fill) {
    for (let row = 0; row < TAIL; row++) {
        const half = TAIL - 1 - row;
        ctx.fillStyle = UI.ink;
        ctx.fillRect(x - half - 1, top + row, half * 2 + 3, 1);
        ctx.fillStyle = fill;
        ctx.fillRect(x - half, top + row, half * 2 + 1, 1);
    }
    ctx.fillStyle = UI.ink;
    ctx.fillRect(x, top + TAIL, 1, 1);
}

function shuffled(list, rng) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = rng.int(0, i);
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}
