/**
 * Loads a horizontal-strip spritesheet and extracts frames.
 * Supports custom rows/columns for grid-based sheets.
 */
export class SpriteSheet {
    #image;
    #frameWidth;
    #frameHeight;
    #frameCount;
    #cols;
    #rows;
    #loaded = false;
    #loadPromise;

    /**
     * @param {string} imagePath
     * @param {object} opts
     * @param {number|null} opts.frameCount - total frames (auto-detect if null)
     * @param {number}      opts.cols       - columns in sheet (default: auto)
     * @param {number}      opts.rows       - rows in sheet (default: 1)
     */
    constructor(imagePath, { frameCount = null, cols = null, rows = 1 } = {}) {
        this.#image = new Image();
        this.#rows = rows;
        this.#loadPromise = new Promise((resolve, reject) => {
            this.#image.onload = () => {
                this.#frameHeight = this.#image.height / this.#rows;
                if (cols) {
                    this.#cols = cols;
                } else {
                    this.#cols = Math.round(this.#image.width / this.#frameHeight);
                }
                this.#frameWidth = this.#image.width / this.#cols;
                this.#frameCount = frameCount ?? (this.#cols * this.#rows);
                this.#loaded = true;
                resolve(this);
            };
            this.#image.onerror = () => reject(new Error(`Failed to load: ${imagePath}`));
        });
        this.#image.src = imagePath;
    }

    get loaded() { return this.#loaded; }
    get frameCount() { return this.#frameCount; }
    get frameWidth() { return this.#frameWidth; }
    get frameHeight() { return this.#frameHeight; }

    load() { return this.#loadPromise; }

    /**
     * Draw a specific frame at (x, y) with given dimensions.
     */
    drawFrame(ctx, frameIndex, x, y, width, height) {
        if (!this.#loaded) return;
        const col = frameIndex % this.#cols;
        const row = Math.floor(frameIndex / this.#cols);
        const sx = Math.floor(col * this.#frameWidth);
        const sy = Math.floor(row * this.#frameHeight);
        const sw = Math.floor(this.#frameWidth);
        const sh = Math.floor(this.#frameHeight);
        ctx.drawImage(this.#image, sx, sy, sw, sh, x, y, width, height);
    }

    /**
     * Draw a frame with "cover" behavior — fills the target area
     * while preserving aspect ratio (crops the excess).
     */
    drawFrameCover(ctx, frameIndex, x, y, destW, destH) {
        if (!this.#loaded) return;
        const col = frameIndex % this.#cols;
        const row = Math.floor(frameIndex / this.#cols);
        const sw = Math.floor(this.#frameWidth);
        const sh = Math.floor(this.#frameHeight);
        const sx = Math.floor(col * this.#frameWidth);
        const sy = Math.floor(row * this.#frameHeight);

        const srcAspect = sw / sh;
        const dstAspect = destW / destH;

        let cropW = sw, cropH = sh, cropX = sx, cropY = sy;
        if (srcAspect > dstAspect) {
            // Source wider — crop sides
            cropW = Math.floor(sh * dstAspect);
            cropX = sx + Math.floor((sw - cropW) / 2);
        } else {
            // Source taller — crop top/bottom
            cropH = Math.floor(sw / dstAspect);
            cropY = sy + Math.floor((sh - cropH) / 2);
        }

        ctx.drawImage(this.#image, cropX, cropY, cropW, cropH, x, y, destW, destH);
    }
}
