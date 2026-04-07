/**
 * Renderer - Canvas rendering abstraction
 * Single Responsibility: Handle canvas sizing and coordinate transformation.
 */

import { DESIGN_WIDTH, DESIGN_HEIGHT, IS_MOBILE } from '../config/Constants.js';

export class Renderer {
    #canvas;
    #ctx;
    #designWidth;
    #designHeight;
    #scale = 1;

    constructor(canvas) {
        this.#canvas = canvas;
        // alpha:false → skip compositor blending with page background (perf win)
        this.#ctx = canvas.getContext('2d', { alpha: false });
        this.#designWidth = DESIGN_WIDTH;
        this.#designHeight = DESIGN_HEIGHT;

        // On mobile, disable Canvas2D shadows entirely.
        // shadowBlur triggers a Gaussian blur pass on EVERY subsequent fill/stroke,
        // which is the single biggest performance killer on mobile GPUs.
        if (IS_MOBILE) {
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
            } catch (_) { /* fallback: shadows remain active but slow */ }
        }

        this.resize();
        
        // Debounce resize — mobile fires rapid resize events (keyboard, rotation)
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => this.resize(), 100);
        });
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
        
        this.#ctx.imageSmoothingEnabled = false;
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
