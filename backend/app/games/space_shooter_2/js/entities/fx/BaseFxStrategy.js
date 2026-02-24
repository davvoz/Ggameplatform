// ═══════════════════════════════════════════════
//  Base class for all FX strategies
// ═══════════════════════════════════════════════

/**
 * Abstract base for every background-FX particle type.
 * Subclasses MUST implement: _init(initial), _update(dt, W, H, time), _render(ctx, W, H)
 */
export class BaseFxStrategy {
    /**
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     * @param {object|null} config - theme-specific config blob
     */
    constructor(canvasWidth, canvasHeight, config = null) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.config = config;

        // Common particle properties (set by subclasses)
        this.x = 0;
        this.y = 0;
        this.size = 1;
        this.speed = 10;
        this.alpha = 0.1;
    }

    /** Reset / initialise the particle. Called from constructor & when off-screen. */
    reset(initial = false) {
        this._init(initial);
    }

    /** Frame tick — move the particle. */
    update(dt, canvasWidth, canvasHeight, time) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this._update(dt, canvasWidth, canvasHeight, time);
    }

    /** Draw the particle. Skip if fully transparent. */
    render(ctx, canvasWidth, canvasHeight) {
        if (this.alpha <= 0.005) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        this._render(ctx, canvasWidth, canvasHeight);
        ctx.restore();
    }

    // ── abstract hooks (override in subclasses) ──

    /** @abstract */
    _init(_initial) {
        throw new Error('BaseFxStrategy._init() must be overridden');
    }

    /** @abstract */
    _update(_dt, _W, _H, _time) {
        throw new Error('BaseFxStrategy._update() must be overridden');
    }

    /** @abstract */
    _render(_ctx, _W, _H) {
        throw new Error('BaseFxStrategy._render() must be overridden');
    }

    // ── shared helpers ──

    /** Check whether the particle has scrolled past the bottom (+margin). */
    _isOffBottom(margin = 10) {
        return this.y > this.canvasHeight + this.size + margin;
    }

    /** Check whether the particle has scrolled past the top (-margin). */
    _isOffTop(margin = 10) {
        return this.y < -this.size - margin;
    }
}
