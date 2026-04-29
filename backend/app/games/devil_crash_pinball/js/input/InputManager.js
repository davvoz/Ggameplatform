import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Input event types emitted by {@link InputManager}.
 * @readonly
 * @enum {string}
 */
export const InputAction = Object.freeze({
    /** Pointer down on the canvas. Carries x/y, zone and hudButton classification. */
    TAP:        'TAP',
    /** Space (configurable) keydown — keyboard equivalent of a launch-zone tap. */
    LAUNCH_KEY: 'LAUNCH_KEY',
    /** Tilt requested via T key or on-screen TILT button. */
    TILT:       'TILT',
    /** Escape pressed — toggles pause. */
    ESC:        'ESC',
});

/**
 * @typedef {Object} InputEvent
 * @property {string} action          One of {@link InputAction}.
 * @property {number} [x]             TAP only: normalised canvas x (0–1).
 * @property {number} [y]             TAP only: normalised canvas y (0–1).
 * @property {'launch'|'left'|'right'|'hud'|'none'} [zone]  TAP only: classified zone.
 * @property {string|null} [hudButton] TAP only: HUD button id under the press, or null.
 */

/**
 * Input layer.
 *
 * Two surfaces are exposed and they map cleanly onto two distinct concerns:
 *
 *   1. {@link held} — steady boolean state for actions whose semantics is
 *      "while pressed, do something every frame" (the flippers and the
 *      plunger pull). Held state is naturally idempotent and never replays.
 *
 *   2. {@link poll} — a queue of one-shot {@link InputEvent}s. Each press
 *      produces one event, consumed exactly once. Events are never
 *      reissued, so a state transition can never accidentally inherit a
 *      stale press from the previous state. This eliminates the entire
 *      class of bugs that the old InputManager papered over with manual
 *      `consume*()` calls and ad-hoc "armed" flags.
 *
 * Mouse pointers are still rejected from gameplay zones (only `touch`/`pen`
 * generate gameplay TAPs); mouse clicks below the HUD are accepted as
 * menu-dismiss TAPs so the desktop attract screen remains usable.
 */
export class InputManager {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {(canvasX:number, canvasY:number) => string|null} hudHitTest
     *   Pure function returning the HUD button id under a canvas-space
     *   point, or null. Injected to keep this class free of HUD knowledge.
     */
    constructor(canvas, hudHitTest) {
        this._canvas     = canvas;
        this._hudHitTest = hudHitTest;
        /** @type {InputEvent[]} */
        this._queue      = [];
        this.held        = { flipL: false, flipR: false, launch: false };

        // Internal: which active pointer ids are currently in which zone.
        // Touch/pen only — mouse never enters this map.
        this._activePointers = new Map(); // pointerId -> Zone
        this._spaceDown      = false;

        this._bind();
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Returns and clears the queued events. Each event is delivered exactly
     * once. Call once per frame from the game loop.
     * @returns {InputEvent[]}
     */
    poll() {
        const out = this._queue;
        this._queue = [];
        return out;
    }

    /** Discard all queued events. Used by guard timers (e.g. game-over banner). */
    drain() {
        this._queue.length = 0;
    }

    /** Synthesize a TILT event (for on-screen TILT button). */
    requestTilt() {
        this._queue.push({ action: InputAction.TILT });
    }

    /**
     * Hard reset: clear queue and held flags. Called on focus loss / fullscreen
     * change so a key/finger held during the transition cannot stay stuck.
     */
    reset() {
        this.held.flipL  = false;
        this.held.flipR  = false;
        this.held.launch = false;
        this._activePointers.clear();
        this._spaceDown  = false;
        this._queue.length = 0;
    }

    destroy() {
        globalThis.removeEventListener('keydown', this._kd);
        globalThis.removeEventListener('keyup',   this._ku);
        globalThis.removeEventListener('blur',    this._reset);
        globalThis.removeEventListener('visibilitychange', this._reset);
        document.removeEventListener('fullscreenchange',  this._reset);
        this._canvas.removeEventListener('pointerdown',   this._pd);
        this._canvas.removeEventListener('pointerup',     this._pu);
        this._canvas.removeEventListener('pointercancel', this._pu);
        this._canvas.removeEventListener('pointermove',   this._pm);
    }

    // ── Bindings ────────────────────────────────────────────────────────────

    _bind() {
        this._kd = (e) => {
            if (e.code === 'Escape') {
                e.preventDefault();
                this._queue.push({ action: InputAction.ESC });
                return;
            }
            if (e.code === C.INPUT_LEFT_KEY)        this.held.flipL = true;
            else if (e.code === C.INPUT_RIGHT_KEY)  this.held.flipR = true;
            else if (e.code === C.INPUT_TILT_KEY)   this._queue.push({ action: InputAction.TILT });
            else if (e.code === C.INPUT_LAUNCH_KEY) {
                if (!this._spaceDown) this._queue.push({ action: InputAction.LAUNCH_KEY });
                this._spaceDown   = true;
                this.held.launch  = true;
            }
        };

        this._ku = (e) => {
            if (e.code === C.INPUT_LEFT_KEY)        this.held.flipL = false;
            else if (e.code === C.INPUT_RIGHT_KEY)  this.held.flipR = false;
            else if (e.code === C.INPUT_LAUNCH_KEY) {
                this._spaceDown = false;
                this._recomputeLaunchHeld();
            }
        };

        this._pd = (e) => {
            const { xN, yN } = this._normalise(e);
            const { zone, hudButton } = this._classify(xN, yN);

            // Mouse pointers participate in TAPs (for menu dismiss + HUD clicks)
            // but never drive gameplay zones (flippers / plunger hold).
            if (e.pointerType === 'mouse') {
                this._queue.push({ action: InputAction.TAP, x: xN, y: yN, zone, hudButton });
                return;
            }

            e.preventDefault();
            this._activePointers.set(e.pointerId, zone);
            this._refreshHeld();
            this._queue.push({ action: InputAction.TAP, x: xN, y: yN, zone, hudButton });
        };

        this._pu = (e) => {
            if (e.pointerType === 'mouse') return;
            e.preventDefault();
            this._activePointers.delete(e.pointerId);
            this._refreshHeld();
        };

        this._pm = (e) => {
            if (e.pointerType === 'mouse') return;
            if (!this._activePointers.has(e.pointerId)) return;
            const { xN, yN } = this._normalise(e);
            this._activePointers.set(e.pointerId, this._classify(xN, yN).zone);
            this._refreshHeld();
        };

        this._reset = () => this.reset();

        globalThis.addEventListener('keydown', this._kd);
        globalThis.addEventListener('keyup',   this._ku);
        // Stuck-key prevention on focus / fullscreen changes.
        globalThis.addEventListener('blur',              this._reset);
        globalThis.addEventListener('visibilitychange',  this._reset);
        document.addEventListener('fullscreenchange',    this._reset);
        this._canvas.addEventListener('pointerdown',   this._pd, { passive: false });
        this._canvas.addEventListener('pointerup',     this._pu, { passive: false });
        this._canvas.addEventListener('pointercancel', this._pu, { passive: false });
        this._canvas.addEventListener('pointermove',   this._pm, { passive: false });
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    _normalise(e) {
        const rect = this._canvas.getBoundingClientRect();
        return {
            xN: (e.clientX - rect.left) / rect.width,
            yN: (e.clientY - rect.top)  / rect.height,
        };
    }

    /**
     * Single classification step: derives both the gameplay zone (held) and
     * the HUD button id (TAP) from one canvas-space hit-test.
     *
     * Mapping:
     *   HUD ctrl-bar id   →  gameplay zone (`flipL`/`flipR`/`launch`)
     *   HUD top-bar id    →  zone='hud', tap is dispatched as a momentary action
     *   no hit            →  zone='none' (no flipper is held, menu-dismiss accepted)
     *
     * The canvas now spans VIEW_HEIGHT + CTRL_BAR_HEIGHT vertically, so we
     * normalise against the full physical height.
     *
     * @private
     */
    _classify(xN, yN) {
        const cx  = xN * C.VIEW_WIDTH;
        const cy  = yN * (C.VIEW_HEIGHT + C.CTRL_BAR_HEIGHT);
        const hit = this._hudHitTest(cx, cy);
        if (hit === 'flipL')  return { zone: 'left',   hudButton: null };
        if (hit === 'flipR')  return { zone: 'right',  hudButton: null };
        if (hit === 'launch') return { zone: 'launch', hudButton: null };
        if (hit !== null)     return { zone: 'hud',    hudButton: hit  };
        return { zone: 'none', hudButton: null };
    }

    /** Recompute held flags from active touch/pen pointers + spacebar. */
    _refreshHeld() {
        let l = false;
        let r = false;
        let launchPointer = false;
        for (const z of this._activePointers.values()) {
            if (z === 'left')        l = true;
            else if (z === 'right')  r = true;
            else if (z === 'launch') launchPointer = true;
        }
        this.held.flipL  = l;
        this.held.flipR  = r;
        this.held.launch = launchPointer || this._spaceDown;
    }

    _recomputeLaunchHeld() {
        // Called only on Space keyup; pointer state hasn't changed so we can
        // recompute purely from the current map + spaceDown flag.
        let launchPointer = false;
        for (const z of this._activePointers.values()) {
            if (z === 'launch') { launchPointer = true; break; }
        }
        this.held.launch = launchPointer || this._spaceDown;
    }
}
