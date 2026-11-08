/**
 * Fixed timestep loop. The simulation always advances in equal ticks whatever
 * the frame rate, so a run plays out the same on a 30 Hz phone and a 144 Hz
 * monitor. A device too slow to keep up runs the game slower instead of
 * skipping ahead, which keeps the input timing fair.
 */

const MAX_FRAME_MS = 100;
const MAX_TICKS_PER_FRAME = 4;

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
     * @param {(dt: number, alpha: number) => void} onFrame called every frame, paused or not
     * @param {(callback: (now: number) => void) => void} [schedule]
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

    get paused() {
        return this.#paused;
    }

    /** @param {boolean} paused */
    setPaused(paused) {
        this.#paused = paused;
        this.#accumulator = 0;
    }

    #frame = (now) => {
        const elapsed = this.#last === null ? 0 : Math.min(MAX_FRAME_MS, now - this.#last);
        this.#last = now;

        if (!this.#paused) {
            this.#accumulator += elapsed;
            let ticks = 0;
            while (this.#accumulator >= this.#tickMs && ticks < MAX_TICKS_PER_FRAME) {
                this.#accumulator -= this.#tickMs;
                this.#onTick();
                ticks++;
            }
            if (ticks === MAX_TICKS_PER_FRAME) this.#accumulator = 0;
        }
        this.#onFrame(elapsed / 1000, this.#paused ? 1 : this.#accumulator / this.#tickMs);
        this.#schedule(this.#frame);
    };
}
