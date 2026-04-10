/**
 * Shared Canvas 2D Renderer — handles sizing, clearing, and coordinate mapping.
 * Mobile-first: resizes to fill viewport while maintaining aspect ratio.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} [opts]
 * @param {number}  opts.designWidth          - logical width  (required)
 * @param {number}  opts.designHeight         - logical height (required)
 * @param {boolean} [opts.alpha=true]         - canvas alpha channel
 * @param {boolean} [opts.imageSmoothingEnabled=false]
 * @param {string}  [opts.imageSmoothingQuality]  - 'low' | 'medium' | 'high'
 * @param {boolean} [opts.disableMobileShadows=false]
 * @param {boolean} [opts.autoResize=false]   - debounced window resize listener
 */
export class Renderer {
    #canvas;
    #ctx;
    #designWidth;
    #designHeight;
    #scale = 1;
    #opts;

    constructor(canvas, opts = {}) {
        this.#canvas = canvas;
        this.#designWidth = opts.designWidth;
        this.#designHeight = opts.designHeight;
        this.#opts = opts;

        const ctxAttrs = opts.alpha === false ? { alpha: false } : undefined;
        this.#ctx = canvas.getContext('2d', ctxAttrs);

        if (opts.disableMobileShadows && /Mobi|Android/i.test(navigator.userAgent)) {
            try {
                Object.defineProperty(this.#ctx, 'shadowBlur', {
                    get() { return 0; },
                    set() {},
                    configurable: true,
                });
                Object.defineProperty(this.#ctx, 'shadowColor', {
                    get() { return 'transparent'; },
                    set() {},
                    configurable: true,
                });
            } catch (_) { /* fallback: shadows remain active */ }
        }

        this.resize();

        if (opts.autoResize) {
            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => this.resize(), 100);
            });
        }
    }

    get ctx() { return this.#ctx; }
    get width() { return this.#designWidth; }
    get height() { return this.#designHeight; }
    get canvas() { return this.#canvas; }
    get scale() { return this.#scale; }

    resize() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const aspect = this.#designWidth / this.#designHeight;
        let w, h;

        if (vw / vh < aspect) {
            w = vw;
            h = vw / aspect;
        } else {
            h = vh;
            w = vh * aspect;
        }

        this.#scale = w / this.#designWidth;

        this.#canvas.style.width = `${w}px`;
        this.#canvas.style.height = `${h}px`;
        this.#canvas.width = this.#designWidth;
        this.#canvas.height = this.#designHeight;

        this.#ctx.imageSmoothingEnabled = this.#opts.imageSmoothingEnabled ?? false;
        if (this.#opts.imageSmoothingQuality) {
            this.#ctx.imageSmoothingQuality = this.#opts.imageSmoothingQuality;
        }
    }

    clear() {
        this.#ctx.clearRect(0, 0, this.#designWidth, this.#designHeight);
    }

    /**
     * Convert page coordinates to logical canvas coordinates.
     */
    pageToCanvas(pageX, pageY) {
        const rect = this.#canvas.getBoundingClientRect();
        const scaleX = this.#designWidth / rect.width;
        const scaleY = this.#designHeight / rect.height;
        return {
            x: (pageX - rect.left) * scaleX,
            y: (pageY - rect.top) * scaleY,
        };
    }
}
