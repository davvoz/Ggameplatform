/**
 * A single animation backed by a SpriteSheet.
 * Time-based frame advancement with loop/one-shot support.
 */
export class Animation {
    #spriteSheet;
    #frameDuration;
    #loop;
    #currentFrame = 0;
    #elapsed = 0;
    #finished = false;
    #onFinish = null;

    /**
     * @param {import('./SpriteSheet.js').SpriteSheet} spriteSheet
     * @param {object} opts
     * @param {number}   opts.frameDuration - ms per frame
     * @param {boolean}  opts.loop
     * @param {Function} opts.onFinish - callback when one-shot ends
     */
    constructor(spriteSheet, { frameDuration = 100, loop = true, onFinish = null } = {}) {
        this.#spriteSheet = spriteSheet;
        this.#frameDuration = frameDuration;
        this.#loop = loop;
        this.#onFinish = onFinish;
    }

    get currentFrame() { return this.#currentFrame; }
    get frameCount() { return this.#spriteSheet.frameCount; }
    get finished() { return this.#finished; }

    set onFinish(fn) { this.#onFinish = fn; }

    reset() {
        this.#currentFrame = 0;
        this.#elapsed = 0;
        this.#finished = false;
    }

    update(deltaTime) {
        if (this.#finished) return;
        this.#elapsed += deltaTime;

        while (this.#elapsed >= this.#frameDuration) {
            this.#elapsed -= this.#frameDuration;
            this.#currentFrame++;

            if (this.#currentFrame >= this.#spriteSheet.frameCount) {
                if (this.#loop) {
                    this.#currentFrame = 0;
                } else {
                    this.#currentFrame = this.#spriteSheet.frameCount - 1;
                    this.#finished = true;
                    this.#onFinish?.();
                    break;
                }
            }
        }
    }

    draw(ctx, x, y, width, height) {
        this.#spriteSheet.drawFrame(ctx, this.#currentFrame, x, y, width, height);
    }

    drawCover(ctx, x, y, width, height) {
        this.#spriteSheet.drawFrameCover(ctx, this.#currentFrame, x, y, width, height);
    }
}
