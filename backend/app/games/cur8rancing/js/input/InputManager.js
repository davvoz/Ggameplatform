/**
 * Keyboard + touch input aggregator. It exposes a single normalized direction
 * state that controllers read; it never knows about cars or physics (SRP).
 *
 * Touch buttons (created by the HUD) call {@link setTouch}, so keyboard and
 * touch feed the same flags.
 */
export class InputManager {
    constructor() {
        /** Active intent flags, reused object (no per-frame allocation). */
        this.state = { up: false, down: false, left: false, right: false };
        this._touch = { up: false, down: false, left: false, right: false };
        this._keys = new Set();
        this._onKeyDown = (e) => this._setKey(e, true);
        this._onKeyUp = (e) => this._setKey(e, false);
    }

    /** Register global keyboard listeners. */
    attach() {
        globalThis.addEventListener('keydown', this._onKeyDown);
        globalThis.addEventListener('keyup', this._onKeyUp);
    }

    /** Remove listeners and clear state. */
    detach() {
        globalThis.removeEventListener('keydown', this._onKeyDown);
        globalThis.removeEventListener('keyup', this._onKeyUp);
        this._keys.clear();
        this.reset();
    }

    /**
     * @param {'up'|'down'|'left'|'right'} dir
     * @param {boolean} active
     */
    setTouch(dir, active) {
        this._touch[dir] = active;
        this._sync();
    }

    /** Clear all input (used when input must be blocked, e.g. countdown). */
    reset() {
        this._touch.up = this._touch.down = this._touch.left = this._touch.right = false;
        this.state.up = this.state.down = this.state.left = this.state.right = false;
    }

    _setKey(event, active) {
        const dir = InputManager._DIR[event.key];
        if (!dir) return;
        event.preventDefault();
        if (active) this._keys.add(dir); else this._keys.delete(dir);
        this._sync();
    }

    _sync() {
        this.state.up = this._keys.has('up') || this._touch.up;
        this.state.down = this._keys.has('down') || this._touch.down;
        this.state.left = this._keys.has('left') || this._touch.left;
        this.state.right = this._keys.has('right') || this._touch.right;
    }
}

/** Mapping from keyboard keys to direction intents. */
InputManager._DIR = Object.freeze({
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down',
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
});
