import { ease, progress } from '../render/ui/ease.js';
import { drawButton, hits } from '../render/ui/widgets.js';

/**
 * A set of buttons with a focus: the arrows move it to the nearest button
 * that way, Enter (or a tap) presses the focused one. Pressed buttons sink
 * for a moment; buttons rise into place one after the other when shown.
 * Every menu of the game, and the pause menu over a race, is one of these.
 *
 * Buttons marked `custom` take part in the focus but draw themselves.
 */
const PRESS_TIME = 0.14;
const APPEAR = { start: 0.1, stagger: 0.04, lasts: 0.28 };
const DIRECTIONS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

/** How far `to` is from `from` going one way; Infinity when it is not that way. */
function distance(from, to, [dx, dy]) {
    const ax = to.x + to.w / 2 - (from.x + from.w / 2);
    const ay = to.y + to.h / 2 - (from.y + from.h / 2);
    const along = ax * dx + ay * dy;
    if (along <= 0) return Infinity;
    const across = Math.abs(ax * dy) + Math.abs(ay * dx);
    return along + across * 2;
}

export class Menu {
    /** @type {import('../render/ui/widgets.js').Button[]} */
    buttons = [];
    #focus = null;
    #pressed = { id: null, at: -Infinity };
    #shownAt = 0;

    /** Restarts the rise-into-place animation from `time`. */
    show(time) {
        this.#shownAt = time;
    }

    /** @param {import('../render/ui/widgets.js').Button[]} buttons laid out for this frame */
    set(buttons) {
        this.buttons = buttons;
    }

    get focus() {
        const usable = this.buttons.filter((b) => !b.disabled);
        if (usable.some((b) => b.id === this.#focus)) return this.#focus;
        return usable[0]?.id ?? null;
    }

    setFocus(id) {
        this.#focus = id;
    }

    isPressed(id, time) {
        return this.#pressed.id === id && time - this.#pressed.at < PRESS_TIME;
    }

    /** 0..1: how far a button has risen into place. */
    appear(index, time) {
        return ease.outBack(progress(time - this.#shownAt, APPEAR.start + index * APPEAR.stagger, APPEAR.lasts));
    }

    /** @returns {string|null} the id pressed, if any */
    key(action, time) {
        if (action === 'confirm') return this.#activate(this.focus, time);
        const direction = DIRECTIONS[action];
        if (direction) this.move(direction);
        return null;
    }

    /** @returns {string|null} the id pressed, if any */
    press(x, y, time) {
        const button = this.buttons.find((b) => hits(b, x, y));
        if (!button || button.disabled) return null;
        this.#focus = button.id;
        return this.#activate(button.id, time);
    }

    move(direction) {
        const from = this.buttons.find((b) => b.id === this.focus);
        if (!from) return;
        let best = null;
        let bestDistance = Infinity;
        for (const button of this.buttons) {
            const d = button.disabled ? Infinity : distance(from, button, direction);
            if (d < bestDistance) [best, bestDistance] = [button, d];
        }
        if (best) this.#focus = best.id;
    }

    #activate(id, time) {
        if (id === null) return null;
        this.#pressed = { id, at: time };
        return id;
    }

    /** Draws every button that is not `custom`. */
    draw(ctx, time, icons) {
        this.buttons.forEach((button, i) => {
            if (button.custom) return;
            drawButton(ctx, button, {
                focused: button.id === this.focus,
                pressed: this.isPressed(button.id, time),
                appear: this.appear(i, time),
                time,
                icons,
            });
        });
    }
}
