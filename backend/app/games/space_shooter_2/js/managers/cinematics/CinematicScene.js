/**
 * CinematicScene — Abstract base class for all cinematic scenes.
 *
 * Subclasses override:
 *   - setup(options)       → initialise scene-specific state
 *   - onUpdate(dt)         → per-frame logic
 *   - onRender(ctx, w, h)  → per-frame drawing
 *
 * Lifecycle managed by CinematicManager:
 *   begin(options) → update(dt) loop → finish() or skip()
 */
export default class CinematicScene {
    constructor(game) {
        this.game = game;
        this.timer = 0;
        this.duration = 0;
        this.active = false;
        this.skipReady = false;
        this._onFinish = null;
        this._skipHandler = null;
        this._skippable = false;
    }

    /**
     * Start the scene.
     * @param {Object} options
     * @param {Function} [options.onFinish] — called when the scene ends (skip or natural end)
     * @param {boolean}  [options.skippable=false] — enable tap/key skip
     */
    begin(options = {}) {
        this.timer = 0;
        this.active = true;
        this.skipReady = false;
        this._skippable = options.skippable || false;
        this._skipDelay = options.skipDelay ?? 0.5;
        this._onFinish = options.onFinish || null;
        if (this._skippable) this._setupSkipHandler();
        this.setup(options);
    }

    /** Override in subclass to initialise state. */
    setup(/* options */) {}

    // ── Skip handling ─────────────────────────────────

    _setupSkipHandler() {
        this._skipHandler = () => {
            if (this.active && this.skipReady) this.finish();
        };
        this.game.canvas.addEventListener('pointerdown', this._skipHandler, { once: false });
    }

    _removeSkipHandler() {
        if (this._skipHandler) {
            this.game.canvas.removeEventListener('pointerdown', this._skipHandler);
            this._skipHandler = null;
        }
    }

    /** End the scene and invoke the completion callback. */
    finish() {
        if (!this.active) return;
        this.active = false;
        this._removeSkipHandler();
        if (this._onFinish) {
            const cb = this._onFinish;
            this._onFinish = null;
            cb();
        }
    }

    // ── Frame loop ────────────────────────────────────

    update(dt) {
        if (!this.active) return;
        this.timer += dt;

        // Enable skip after configurable delay
        if (this._skippable && !this.skipReady && this.timer > this._skipDelay) {
            this.skipReady = true;
        }

        // Keyboard skip
        if (this._skippable && this.skipReady) {
            for (const [, pressed] of this.game.input.keys) {
                if (pressed) {
                    this.game.input.keys.clear();
                    this.finish();
                    return;
                }
            }
        }

        this.onUpdate(dt);

        // Natural end
        if (this.duration > 0 && this.timer >= this.duration) {
            this.finish();
        }
    }

    /** Override for per-frame logic. */
    onUpdate(/* dt */) {}

    render(ctx, w, h) {
        if (!this.active) return;
        this.onRender(ctx, w, h);
    }

    /** Override for per-frame drawing. */
    onRender(/* ctx, w, h */) {}

    // ── Cleanup ───────────────────────────────────────

    reset() {
        this.active = false;
        this.timer = 0;
        this.skipReady = false;
        this._skippable = false;
        this._skipDelay = 0.5;
        this._removeSkipHandler();
        this._onFinish = null;
    }
}
