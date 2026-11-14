import { WORLD } from '../config/Tuning.js';

/** On screens wider than 16:9, rows cut from the bottom first (below the floor), then the top. */
const BOTTOM_SPARE = 64;
const MAX_PIXEL_RATIO = 2;

/**
 * Fits the 960 x 540 arena to the screen. Wider than 16:9 (a phone on its
 * side): the arena fills the width and loses a little sky and soil. Narrower:
 * it fits the width with bars above and below. Converts taps to world points.
 */
export class Viewport {
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    width = WORLD.width;
    height = WORLD.height;
    /** World rows visible: from `top` to `top + visibleHeight`. */
    top = 0;
    visibleHeight = WORLD.height;

    /** @param {number} cssWidth @param {number} cssHeight @param {number} pixelRatio */
    fit(cssWidth, cssHeight, pixelRatio) {
        const ratio = Math.min(MAX_PIXEL_RATIO, Math.max(1, pixelRatio || 1));
        this.width = Math.max(1, Math.round(cssWidth * ratio));
        this.height = Math.max(1, Math.round(cssHeight * ratio));
        this.scale = this.width / WORLD.width;
        this.visibleHeight = Math.min(WORLD.height, this.height / this.scale);
        const cut = WORLD.height - this.visibleHeight;
        const bottomCut = Math.min(cut, BOTTOM_SPARE);
        this.top = cut - bottomCut;
        this.offsetX = 0;
        this.offsetY = this.visibleHeight < WORLD.height ? -this.top * this.scale : (this.height - WORLD.height * this.scale) / 2;
        this.pixelRatio = ratio;
    }

    /** Sets a context to draw in world coordinates. @param {CanvasRenderingContext2D} ctx */
    apply(ctx, shakeX = 0, shakeY = 0) {
        ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX + shakeX * this.scale, this.offsetY + shakeY * this.scale);
    }

    /** A point on the canvas element (CSS pixels) as a world point. */
    toWorld(cssX, cssY) {
        const px = cssX * this.pixelRatio;
        const py = cssY * this.pixelRatio;
        return { x: (px - this.offsetX) / this.scale, y: (py - this.offsetY) / this.scale };
    }

    /** The world rectangle that is on screen, for laying out the HUD and the screens. */
    get visible() {
        const top = Math.max(0, -this.offsetY / this.scale);
        const height = Math.min(WORLD.height, this.height / this.scale);
        return { left: 0, top, width: WORLD.width, height, bottom: top + height };
    }
}
