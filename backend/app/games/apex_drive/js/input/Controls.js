/**
 * Keys and touches. Two uses:
 * - actions for the screens (up, down, left, right, confirm, back, pause),
 *   told as they happen (full screen and sound are buttons, not keys);
 * - the driving, read once per tick as a DriveInput.
 *
 * Keyboard driving: arrows or WASD, up to accelerate, down to brake, Space
 * (or Shift, N, X) for the nitro. Pointer driving (the mouse): hold the left
 * or the right half of the screen to steer that way with the throttle open;
 * both halves at once: straight ahead; lifting every finger lets the car coast.
 *
 * Touch mode (phones and tablets, as the mobile racers do it): the throttle
 * stays open while racing (`read({cruise})`), so no finger means straight
 * ahead at full speed; a held half steers gently at first and fully after a
 * moment (config TOUCH), so a short tap is a small correction; a held BRAKE
 * button brakes.
 *
 * Whether a press steers is the current screen's call (`onPress` answers
 * true to steer, 'brake' for the brake, false for a tap on a button).
 */
import { TOUCH } from '../config/Tuning.js';

const DRIVE = {
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    throttle: ['ArrowUp', 'KeyW'],
    brake: ['ArrowDown', 'KeyS'],
    nitro: ['Space', 'ShiftLeft', 'ShiftRight', 'KeyN', 'KeyX'],
};
const ACTIONS = {
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    Enter: 'confirm',
    NumpadEnter: 'confirm',
    Space: 'confirm',
    Escape: 'back',
    Backspace: 'back',
    KeyP: 'pause',
};
/** Held down, these repeat (scrolling a menu); the others act once. */
const REPEATING = new Set(['up', 'down', 'left', 'right']);
const CAPTURED = new Set([...Object.values(DRIVE).flat(), ...Object.keys(ACTIONS)]);

export class Controls {
    #held = new Set();
    /** pointer id -> {side: -1 (left half) or 1 (right half), since: seconds} */
    #touches = new Map();
    /** pointers holding the brake button */
    #brakes = new Set();
    #nitro = false;
    #element;
    #onPress;
    #onKey;
    #touch;
    #now;

    /**
     * @param {HTMLElement} element where touches count
     * @param {EventTarget} target where keys are heard
     * @param {{onPress: (clientX: number, clientY: number) => boolean|'brake', onKey: (action: string) => void}} handlers
     *   onPress: true when the press should steer, 'brake' when it holds the brake
     * @param {{touch?: boolean, now?: () => number}} [options] touch: a touch screen (see above); now: seconds
     */
    constructor(element, target, { onPress, onKey }, { touch = false, now = () => globalThis.performance.now() / 1000 } = {}) {
        this.#element = element;
        this.#onPress = onPress;
        this.#onKey = onKey;
        this.#touch = touch;
        this.#now = now;
        element.addEventListener('pointerdown', (event) => this.#press(event));
        element.addEventListener('pointermove', (event) => this.#move(event));
        for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
            element.addEventListener(type, (event) => {
                this.#touches.delete(event.pointerId);
                this.#brakes.delete(event.pointerId);
            });
        }
        element.addEventListener('contextmenu', (event) => event.preventDefault());
        target.addEventListener('keydown', (event) => this.#key(event, true));
        target.addEventListener('keyup', (event) => this.#key(event, false));
        target.addEventListener('blur', () => this.release());
    }

    /** Lets go of everything (the page lost the focus, a pause, a new race). */
    release() {
        this.#held.clear();
        this.#touches.clear();
        this.#brakes.clear();
        this.#nitro = false;
    }

    /** Whether the touch mode is on: the race shows a BRAKE button then. */
    get touch() {
        return this.#touch;
    }

    /** The nitro button was touched: lit on the next read. */
    queueNitro() {
        this.#nitro = true;
    }

    /**
     * @param {{cruise?: boolean}} [race] cruise: the race is on (in touch mode the throttle stays open)
     * @returns {import('../sim/Car.js').DriveInput}
     */
    read({ cruise = false } = {}) {
        const now = this.#now();
        const touchSteer = [...this.#touches.values()].reduce((sum, { side, since }) => sum + side * this.#strength(now - since), 0);
        const keySteer = Number(this.#any('right')) - Number(this.#any('left'));
        const nitro = this.#nitro;
        this.#nitro = false;
        return {
            steer: Math.max(-1, Math.min(1, keySteer + touchSteer)),
            throttle: this.#any('throttle') || this.#touches.size > 0 || (this.#touch && cruise),
            brake: this.#any('brake') || this.#brakes.size > 0,
            nitro,
        };
    }

    /** How hard a finger held this long steers: all at once with a mouse, growing on a touch screen. */
    #strength(held) {
        if (!this.#touch) return 1;
        return Math.min(1, TOUCH.steerFrom + ((1 - TOUCH.steerFrom) * held) / TOUCH.steerRamp);
    }

    #any(action) {
        return DRIVE[action].some((code) => this.#held.has(code));
    }

    #key(event, down) {
        if (!CAPTURED.has(event.code)) return;
        event.preventDefault();
        if (!down) {
            this.#held.delete(event.code);
            return;
        }
        const action = ACTIONS[event.code];
        if (!event.repeat || REPEATING.has(action)) {
            if (action) this.#onKey(action);
        }
        if (event.repeat) return;
        this.#held.add(event.code);
        if (DRIVE.nitro.includes(event.code)) this.#nitro = true;
    }

    #press(event) {
        if (event.button !== undefined && event.button > 0) return;
        event.preventDefault();
        // the default action, focusing the page, is cancelled with the rest: in the
        // platform's frame the keys would keep going to the platform's page
        this.#element.focus?.({ preventScroll: true });
        const role = this.#onPress(event.clientX, event.clientY);
        if (!role) return;
        if (role === 'brake') this.#brakes.add(event.pointerId);
        else this.#touches.set(event.pointerId, { side: this.#side(event), since: this.#now() });
        // keeps the finger's moves and lift even if it slides off the canvas
        try {
            this.#element.setPointerCapture?.(event.pointerId);
        } catch {
            // a pointer the browser no longer tracks: it has nothing to capture
        }
    }

    /** A finger sliding to the other half steers that way, gently again. */
    #move(event) {
        const touch = this.#touches.get(event.pointerId);
        const side = touch && this.#side(event);
        if (touch && side !== touch.side) this.#touches.set(event.pointerId, { side, since: this.#now() });
    }

    #side(event) {
        const rect = this.#element.getBoundingClientRect();
        return event.clientX < rect.left + rect.width / 2 ? -1 : 1;
    }
}
