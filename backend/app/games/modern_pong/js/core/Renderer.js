/**
 * Thin wrapper around Canvas 2D — handles sizing and clearing.
 * Mobile-first: resizes to fill viewport in portrait orientation.
 */
export class Renderer {
    #canvas;
    #ctx;
    #designWidth;
    #designHeight;

    constructor(canvas, designWidth, designHeight) {
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

    resize() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const aspect = this.#designWidth / this.#designHeight;
        let w;
        let h;

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
