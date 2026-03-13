/**
 * Thin wrapper around Canvas 2D — handles sizing and clearing.
 * Mobile-first: resizes to fill viewport in portrait orientation.
 */
export class Renderer {
    #canvas;
    #ctx;
    #designWidth;
    #designHeight;

    /**
     * @param {HTMLCanvasElement} canvas
     * @param {number} designWidth  - logical width
     * @param {number} designHeight - logical height
     */
    constructor(canvas, designWidth = 400, designHeight = 700) {
        this.#canvas = canvas;
        this.#ctx = canvas.getContext('2d');
        this.#designWidth = designWidth;
        this.#designHeight = designHeight;
        this.resize();
    }

    get ctx() { return this.#ctx; }
    get width() { return this.#designWidth; }
    get height() { return this.#designHeight; }
    get canvas() { return this.#canvas; }

    /** Fit canvas to viewport while maintaining aspect ratio. */
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

        this.#canvas.style.width = `${w}px`;
        this.#canvas.style.height = `${h}px`;
        this.#canvas.width = this.#designWidth;
        this.#canvas.height = this.#designHeight;

        this.#ctx.imageSmoothingEnabled = true;
        this.#ctx.imageSmoothingQuality = 'high';
    }

    clear() {
        this.#ctx.clearRect(0, 0, this.#designWidth, this.#designHeight);
    }
}
