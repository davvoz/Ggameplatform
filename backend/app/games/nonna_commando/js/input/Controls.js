import { Btn } from '../sim/Buttons.js';

/**
 * Keyboard, gamepad and touch, merged into the button bitmask the simulation
 * reads once per tick. Menus use `consume()` for single presses.
 *
 * Keyboard: arrows or WASD move and aim (up aims up, down crouches or aims
 * down in the air), Z or J fire, X, K or Space jump, C or L throw a meatball,
 * P or Esc pause.
 */
const KEYS = {
    ArrowLeft: Btn.LEFT, KeyA: Btn.LEFT,
    ArrowRight: Btn.RIGHT, KeyD: Btn.RIGHT,
    ArrowUp: Btn.UP, KeyW: Btn.UP,
    ArrowDown: Btn.DOWN, KeyS: Btn.DOWN,
    KeyZ: Btn.FIRE, KeyJ: Btn.FIRE, ControlLeft: Btn.FIRE, ControlRight: Btn.FIRE,
    KeyX: Btn.JUMP, KeyK: Btn.JUMP, Space: Btn.JUMP,
    KeyC: Btn.BOMB, KeyL: Btn.BOMB, ShiftLeft: Btn.BOMB, ShiftRight: Btn.BOMB,
};
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);
const START_KEYS = new Set(['Enter', 'NumpadEnter']);
const DEAD_ZONE = 0.35;

export class Controls {
    #keys = 0;
    #touch = 0;
    /** one-shot menu actions: 'start' | 'pause' */
    #actions = new Set();
    #onActivity = () => {};
    /** last device used, for the hints on screen */
    device = globalThis.matchMedia?.('(pointer: coarse)').matches ? 'touch' : 'keyboard';

    /** @param {Window} win */
    constructor(win = globalThis) {
        win.addEventListener('keydown', (e) => {
            if (e.repeat && !KEYS[e.code]) return;
            const bit = KEYS[e.code];
            if (bit) {
                this.#keys |= bit;
                e.preventDefault();
                if (bit === Btn.FIRE || bit === Btn.JUMP) this.#actions.add('start');
            }
            if (PAUSE_KEYS.has(e.code)) this.#actions.add('pause');
            if (START_KEYS.has(e.code)) this.#actions.add('start');
            this.device = 'keyboard';
            this.#onActivity();
        });
        win.addEventListener('keyup', (e) => {
            const bit = KEYS[e.code];
            if (bit) this.#keys &= ~bit;
        });
        win.addEventListener('blur', () => this.release());
    }

    /** Called on any input, to unlock audio. */
    onActivity(handler) {
        this.#onActivity = handler;
    }

    /** Touch controls report their held bits here. */
    setTouch(bits) {
        if (bits & ~this.#touch & (Btn.FIRE | Btn.JUMP)) this.#actions.add('start');
        this.#touch = bits;
        this.device = 'touch';
        this.#onActivity();
    }

    tap() {
        this.#actions.add('start');
        this.#onActivity();
    }

    requestPause() {
        this.#actions.add('pause');
    }

    release() {
        this.#keys = 0;
        this.#touch = 0;
    }

    /** The touch pad was reset: nothing held, no change of device. */
    clearTouch() {
        this.#touch = 0;
    }

    /** The buttons held right now. */
    bits() {
        return this.#keys | this.#touch | this.#pad();
    }

    /** True once per press of a menu action. */
    consume(action) {
        const had = this.#actions.has(action);
        this.#actions.delete(action);
        return had;
    }

    clearActions() {
        this.#actions.clear();
    }

    #padPrev = 0;

    #pad() {
        const pads = globalThis.navigator?.getGamepads?.() ?? [];
        let bits = 0;
        for (const pad of pads) {
            if (!pad) continue;
            const b = (i) => pad.buttons[i]?.pressed;
            const ax = pad.axes[0] ?? 0;
            const ay = pad.axes[1] ?? 0;
            if (b(14) || ax < -DEAD_ZONE) bits |= Btn.LEFT;
            if (b(15) || ax > DEAD_ZONE) bits |= Btn.RIGHT;
            if (b(12) || ay < -DEAD_ZONE * 1.4) bits |= Btn.UP;
            if (b(13) || ay > DEAD_ZONE * 1.4) bits |= Btn.DOWN;
            if (b(0)) bits |= Btn.JUMP;
            if (b(2) || b(3) || b(7)) bits |= Btn.FIRE;
            if (b(1) || b(5) || b(6)) bits |= Btn.BOMB;
            if (b(9) && !(this.#padPrev & 256)) this.#actions.add('pause');
            if (b(9)) bits |= 256;
        }
        if (bits & ~this.#padPrev & (Btn.FIRE | Btn.JUMP)) this.#actions.add('start');
        if (bits) {
            this.device = 'gamepad';
            this.#onActivity();
        }
        this.#padPrev = bits;
        return bits & 127;
    }
}
