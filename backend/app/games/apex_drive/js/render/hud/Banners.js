import { drawText, LINE, textWidth } from '../PixelFont.js';
import { ease, progress } from '../ui/ease.js';
import { UI } from '../ui/widgets.js';
import { ordinal } from './RaceHud.js';

/**
 * What the race says out loud, in big pixel letters: the start lights and
 * the countdown, GO, the laps, the flag, and small pop ups for pickups,
 * bumps, potholes and places won or lost. They are made from the race's events
 * (sim/Race.js) and live a moment each. Hard hits shake the frame; the
 * nitro flashes it orange.
 */

const POP_TEXT = {
    cash: (value) => `+${value}`,
    nitro: (value) => (value > 0 ? 'NITRO +1' : 'NITRO FULL'),
    repair: () => 'REPAIR',
    shield: () => 'SHIELD',
    boost: () => 'BOOST!',
};
/** The nitro lights with an orange flash over the whole frame, gone in a moment. */
const NITRO_FLASH = { life: 0.28, color: [255, 150, 60], alpha: 0.4 };

const POP_COLOR = { cash: UI.gold, nitro: '#ff8a2a', repair: UI.green, shield: UI.cyan, boost: UI.gold };
const LIGHTS = { size: 12, gap: 4 };

/** Draws text centred on cx, scaled (whole steps keep the pixels square). */
function centred(ctx, text, cx, y, color, scale) {
    drawText(ctx, text, Math.round(cx - textWidth(text, scale) / 2), Math.round(y), { color, outline: UI.ink, scale });
}

/** A scale that starts big and lands: whole steps from `from` down to `to`. */
function landing(t, from, to) {
    return Math.max(to, Math.round(from - (from - to) * ease.outCubic(Math.min(1, t * 4))));
}

export class Banners {
    /** @type {{kind: string, born: number, life: number, data: object}[]} */
    #items = [];
    #shake = 0;
    #clock = 0;
    #goAt = -Infinity;

    /** Pixels the frame is shaken by now: [x, y]. */
    get shake() {
        if (this.#shake <= 0.05) return [0, 0];
        const amount = Math.round(this.#shake * 3);
        return [Math.round(Math.sin(this.#clock * 90) * amount), Math.round(Math.cos(this.#clock * 77) * amount)];
    }

    /** @param {import('../../sim/Race.js').RaceEvent} event */
    handle(event) {
        const add = (kind, life, data = {}) => {
            // the same pop up again while it shows starts over, it does not stack on itself
            this.#items = this.#items.filter((item) => !(kind === 'pop' && item.kind === 'pop' && item.data.text === data.text));
            this.#items.push({ kind, born: this.#clock, life, data });
        };
        switch (event.type) {
            case 'count': return add('count', 0.9, { text: String(event.n) });
            case 'go':
                this.#goAt = this.#clock;
                return add('go', 0.9);
            case 'perfectStart': return add('note', 1.6, { text: 'PERFECT START!', color: UI.gold });
            case 'wheelspin': return add('note', 1.6, { text: 'WHEELSPIN!', color: UI.red });
            case 'lap': return add('lap', 1.8, { text: `LAP ${event.lap}`, color: UI.cream });
            case 'finalLap': return add('lap', 2.2, { text: 'FINAL LAP!', color: UI.gold });
            case 'finish': return add('finish', 99, { position: event.position });
            case 'pickup': return add('pop', 1, { text: POP_TEXT[event.kind]?.(event.value) ?? '', color: POP_COLOR[event.kind] ?? UI.cream });
            case 'nitro':
                add('flash', NITRO_FLASH.life);
                return add('pop', 0.8, { text: 'NITRO!', color: '#ff8a2a' });
            case 'bump':
                this.#shake = Math.max(this.#shake, event.hurt ? 1 : 0.5);
                return event.hurt ? add('pop', 0.7, { text: 'BUMP!', color: UI.cream }) : undefined;
            case 'pothole':
                this.#shake = Math.max(this.#shake, 1.3);
                return add('pop', 0.8, { text: 'POTHOLE!', color: '#ff8a2a' });
            case 'crash':
                this.#shake = 2;
                return add('note', 1.1, { text: 'CRASH!', color: UI.red });
            case 'position': return add('place', 1.3, event);
            default: return undefined;
        }
    }

    update(dt) {
        this.#clock += dt;
        this.#shake = Math.max(0, this.#shake - dt * 4);
        this.#items = this.#items.filter((item) => this.#clock - item.born < item.life);
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {{width: number, height: number}} size
     * @param {import('../../sim/Race.js').Race} race
     */
    draw(ctx, size, race) {
        this.#lights(ctx, size, race);
        let pops = 0;
        for (const item of this.#items) {
            const t = (this.#clock - item.born) / item.life;
            if (item.kind === 'pop') this.#pop(ctx, size, item, t, pops++);
            else if (item.kind === 'flash') flash(ctx, size, t);
            else this.#banner(ctx, size, item, t);
        }
    }

    /** Three red lamps lighting one by one, all green on GO. */
    #lights(ctx, { width }, race) {
        const sinceGo = this.#clock - this.#goAt;
        const counting = race.phase === 'countdown';
        if (!counting && sinceGo > 1) return;
        const drop = counting ? ease.outBack(Math.min(1, race.clock * 3)) : 1 - progress(sinceGo, 0.7, 0.3);
        const total = LIGHTS.size * 3 + LIGHTS.gap * 4;
        const x = Math.round(width / 2 - total / 2);
        const y = Math.round(-LIGHTS.size - 8 + drop * (LIGHTS.size + 30));
        ctx.fillStyle = UI.ink;
        ctx.fillRect(x, y, total, LIGHTS.size + LIGHTS.gap * 2);
        const lit = counting ? Math.floor(race.clock) + 1 : 3;
        for (let i = 0; i < 3; i++) {
            let color = '#3a1a2a';
            if (!counting) color = UI.green;
            else if (i < lit) color = UI.red;
            ctx.fillStyle = color;
            ctx.fillRect(x + LIGHTS.gap + i * (LIGHTS.size + LIGHTS.gap), y + LIGHTS.gap, LIGHTS.size, LIGHTS.size);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.fillRect(x + LIGHTS.gap + i * (LIGHTS.size + LIGHTS.gap) + 2, y + LIGHTS.gap + 2, 3, 2);
        }
    }

    #banner(ctx, { width, height }, item, t) {
        const middle = height * 0.42;
        switch (item.kind) {
            case 'count':
                centred(ctx, item.data.text, width / 2, middle - LINE * 2.5, UI.cream, landing(t, 9, 5));
                break;
            case 'go':
                centred(ctx, 'GO!', width / 2, middle - LINE * 2.5, UI.green, landing(t, 9, 5));
                break;
            case 'note':
                centred(ctx, item.data.text, width / 2, middle + 30 - ease.outCubic(Math.min(1, t * 5)) * 6, item.data.color, 2);
                break;
            case 'lap': {
                // slides in from the right, holds, slides out to the left
                const x = width * (1.5 - ease.outCubic(Math.min(1, t * 4)) - ease.inCubic(Math.max(0, t * 4 - 3)));
                const blinkOff = item.data.text === 'FINAL LAP!' && Math.floor(t * 12) % 2 === 1;
                if (!blinkOff) centred(ctx, item.data.text, x, middle - LINE * 1.5, item.data.color, 3);
                break;
            }
            case 'finish':
                this.#flag(ctx, width, middle, t, item.data.position);
                break;
            case 'place':
                this.#place(ctx, height, item.data, t);
                break;
            default:
                break;
        }
    }

    /** FINISH on a band of chequers sweeping across, and the place under it. */
    #flag(ctx, width, middle, t, position) {
        const since = t * 99;
        const reach = ease.outCubic(Math.min(1, since * 2)) * width;
        const top = Math.round(middle - 18);
        for (let x = 0; x < reach; x += 6) {
            for (let row = 0; row < 3; row++) {
                ctx.fillStyle = (x / 6 + row) % 2 === 0 ? UI.cream : UI.ink;
                ctx.fillRect(x, top + row * 6, 6, 6);
                ctx.fillRect(x, top + 30 + row * 6, 6, 6);
            }
        }
        if (since < 0.35) return;
        centred(ctx, 'FINISH', width / 2, top + 19 - 7, UI.gold, landing(since - 0.35, 5, 2));
        if (since > 0.9) centred(ctx, `${ordinal(position)} PLACE`, width / 2, top + 50, position <= 3 ? UI.gold : UI.cream, 2);
    }

    /** P3 with an arrow: green up for a place won, red down for one lost. */
    #place(ctx, height, { from, to }, t) {
        const better = to < from;
        const x = Math.round(5 - (1 - ease.outBack(Math.min(1, t * 4))) * 40);
        const y = Math.round(height * 0.38);
        const color = better ? UI.green : UI.red;
        drawText(ctx, `P${to}`, x + 8, y, { color, outline: UI.ink, scale: 2 });
        ctx.fillStyle = color;
        for (let row = 0; row < 4; row++) {
            const half = better ? row : 3 - row;
            ctx.fillRect(x + 3 - half, y + 3 + row, half * 2 + 1, 1);
        }
    }

    /** Small words rising over the player's car, stacked when several come at once. */
    #pop(ctx, { width, height }, item, t, index) {
        const y = height * 0.66 - index * 9 - ease.outCubic(t) * 16;
        if (t > 0.75 && Math.floor(t * 20) % 2 === 0) return;
        centred(ctx, item.data.text, width / 2, y, item.data.color, 1);
    }
}

function flash(ctx, { width, height }, t) {
    const [r, g, b] = NITRO_FLASH.color;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${NITRO_FLASH.alpha * (1 - t) * (1 - t)})`;
    ctx.fillRect(0, 0, width, height);
}
