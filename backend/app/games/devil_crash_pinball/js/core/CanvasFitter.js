import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Resizes a virtual canvas to fit the viewport while preserving aspect ratio.
 *
 * Render resolution is always C.VIEW_WIDTH \u00d7 C.VIEW_HEIGHT; CSS scales the
 * element so the playfield stays crisp on every display. Owns the resize
 * listeners so {@link Game} can dispose them cleanly.
 */
export class CanvasFitter {
    /** @param {HTMLCanvasElement} canvas */
    constructor(canvas) {
        this._canvas = canvas;
        this._onResize = () => this.fit();
        globalThis.addEventListener('resize', this._onResize);
        globalThis.addEventListener('orientationchange', this._onResize);
        this.fit();
    }

    fit() {
        const totalH      = C.VIEW_HEIGHT + C.CTRL_BAR_HEIGHT;
        const targetAspect = C.VIEW_WIDTH / totalH;
        const winAspect    = globalThis.innerWidth / globalThis.innerHeight;

        let cssW;
        let cssH;
        if (winAspect > targetAspect) {
            cssH = globalThis.innerHeight;
            cssW = Math.round(cssH * targetAspect);
        } else {
            cssW = globalThis.innerWidth;
            cssH = Math.round(cssW / targetAspect);
        }
        this._canvas.width  = C.VIEW_WIDTH;
        this._canvas.height = totalH;
        this._canvas.style.width  = `${cssW}px`;
        this._canvas.style.height = `${cssH}px`;
    }

    destroy() {
        globalThis.removeEventListener('resize', this._onResize);
        globalThis.removeEventListener('orientationchange', this._onResize);
    }
}
