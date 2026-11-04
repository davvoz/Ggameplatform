/**
 * Fixed timestep loop: the simulation always advances in equal ticks, whatever
 * the frame rate, so a run behaves the same on every device. A slow device runs
 * the game slower instead of skipping ahead.
 */

const MAX_FRAME_MS = 100;

export class GameLoop {
    #tickMs;
    #onTick;
    #onFrame;
    #schedule;
    #accumulator = 0;
    #last = null;
    #paused = false;

    /**
     * @param {number} tickRate ticks per second
     * @param {() => void} onTick
     * @param {(dt: number, alpha: number) => void} onFrame
     * @param {(callback: (now: number) => void) => void} schedule
     */
    constructor(tickRate, onTick, onFrame, schedule = (callback) => requestAnimationFrame(callback)) {
        this.#tickMs = 1000 / tickRate;
        this.#onTick = onTick;
        this.#onFrame = onFrame;
        this.#schedule = schedule;
    }

    start() {
        this.#schedule(this.#frame);
    }

    /** @param {boolean} paused */
    setPaused(paused) {
        this.#paused = paused;
    }

    #frame = (now) => {
        const elapsed = this.#last === null ? 0 : Math.min(MAX_FRAME_MS, now - this.#last);
        this.#last = now;

        if (!this.#paused) {
            this.#accumulator += elapsed;
            while (this.#accumulator >= this.#tickMs) {
                this.#accumulator -= this.#tickMs;
                this.#onTick();
            }
            this.#onFrame(elapsed / 1000, this.#accumulator / this.#tickMs);
        }

        this.#schedule(this.#frame);
    };
}
