import { makeCanvas } from './PixelCanvas.js';

const PAGE = 1024;
const PAD = 1;
const WHITE = 0xffffffff;

/**
 * All sprites, packed at load into a few atlas pages. Every frame is stored
 * three times: as drawn, mirrored, and as a white silhouette for the hit
 * flash, so drawing never needs transforms or filters.
 *
 * @typedef {{page: any, x: number, y: number, w: number, h: number, ax: number, ay: number}} Frame
 */
export class SpriteBank {
    /** @type {Map<string, {n: Frame, f: Frame, w: Frame, wf: Frame}>} */
    #frames = new Map();
    #pages = [];
    #page = null;
    #pageCtx = null;
    #cx = 0;
    #cy = 0;
    #rowH = 0;

    /**
     * @param {string} name
     * @param {import('./PixelCanvas.js').PixelCanvas} pc
     * @param {number} ax anchor x inside the frame (feet, pivot)
     * @param {number} ay anchor y
     */
    add(name, pc, ax, ay) {
        const flipped = new Uint32Array(pc.data.length);
        const white = new Uint32Array(pc.data.length);
        const whiteFlipped = new Uint32Array(pc.data.length);
        for (let y = 0; y < pc.h; y++) {
            for (let x = 0; x < pc.w; x++) {
                const v = pc.data[y * pc.w + x];
                const m = y * pc.w + (pc.w - 1 - x);
                flipped[m] = v;
                if (v) {
                    white[y * pc.w + x] = WHITE;
                    whiteFlipped[m] = WHITE;
                }
            }
        }
        this.#frames.set(name, {
            n: this.#pack(pc.data, pc.w, pc.h, ax, ay),
            f: this.#pack(flipped, pc.w, pc.h, pc.w - ax, ay),
            w: this.#pack(white, pc.w, pc.h, ax, ay),
            wf: this.#pack(whiteFlipped, pc.w, pc.h, pc.w - ax, ay),
        });
    }

    has(name) {
        return this.#frames.has(name);
    }

    /** @returns {Frame | undefined} */
    frame(name, flip = false) {
        const f = this.#frames.get(name);
        return f && (flip ? f.f : f.n);
    }

    /**
     * Draw a sprite with its anchor at (x, y).
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx, name, x, y, flip = false, flash = false) {
        const set = this.#frames.get(name);
        if (!set) return;
        const f = flash ? (flip ? set.wf : set.w) : (flip ? set.f : set.n);
        ctx.drawImage(f.page, f.x, f.y, f.w, f.h, Math.round(x - f.ax), Math.round(y - f.ay), f.w, f.h);
    }

    #pack(data, w, h, ax, ay) {
        if (!this.#page || this.#cx + w + PAD > PAGE) {
            this.#cx = 0;
            this.#cy += this.#rowH + PAD;
            this.#rowH = 0;
        }
        if (!this.#page || this.#cy + h + PAD > PAGE) this.#newPage();
        const img = this.#pageCtx.createImageData(w, h);
        new Uint32Array(img.data.buffer).set(data);
        this.#pageCtx.putImageData(img, this.#cx, this.#cy);
        const frame = { page: this.#page, x: this.#cx, y: this.#cy, w, h, ax, ay };
        this.#cx += w + PAD;
        this.#rowH = Math.max(this.#rowH, h);
        return frame;
    }

    #newPage() {
        this.#page = makeCanvas(PAGE, PAGE);
        this.#pageCtx = this.#page.getContext('2d');
        this.#pages.push(this.#page);
        this.#cx = 0;
        this.#cy = 0;
        this.#rowH = 0;
    }

    get pageCount() {
        return this.#pages.length;
    }
}
