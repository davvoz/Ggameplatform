import { SCREEN } from '../config/Tuning.js';
import { fitScreen } from './screen.js';

/**
 * The canvas the whole game is drawn in, at the low resolution of
 * render/screen.js; the page scales it up with square pixels. It turns
 * page coordinates (a touch, a click) into the frame's pixels.
 */
export class Frame {
    canvas;
    ctx;
    size = { width: SCREEN.minWidth, height: SCREEN.height };

    /** @param {HTMLCanvasElement} canvas */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    /** @param {number} cssWidth @param {number} cssHeight the stage on the page */
    resize(cssWidth, cssHeight) {
        const fit = fitScreen(cssWidth, cssHeight, SCREEN);
        if (fit.width !== this.canvas.width || fit.height !== this.canvas.height) {
            this.canvas.width = fit.width;
            this.canvas.height = fit.height;
            this.size = { width: fit.width, height: fit.height };
        }
        this.ctx.imageSmoothingEnabled = false;
        this.canvas.style.width = `${fit.cssWidth}px`;
        this.canvas.style.height = `${fit.cssHeight}px`;
    }

    /** A point of the page as a pixel of the frame. */
    toFrame(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: ((clientX - rect.left) / Math.max(1, rect.width)) * this.size.width,
            y: ((clientY - rect.top) / Math.max(1, rect.height)) * this.size.height,
        };
    }
}
