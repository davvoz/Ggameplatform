/**
 * Fixed timestep loop: the simulation ticks at a steady rate whatever the
 * screen's refresh, drawing happens once per animation frame.
 */
const MAX_CATCH_UP = 0.25;

export class GameLoop {
    #step;
    #tick;
    #frame;
    #last = 0;
    #pending = 0;
    #running = false;
    #paused = false;

    /** @param {number} rate ticks per second @param {() => void} tick @param {(dt: number) => void} frame */
    constructor(rate, tick, frame) {
        this.#step = 1 / rate;
        this.#tick = tick;
        this.#frame = frame;
    }

    start() {
        if (this.#running) return;
        this.#running = true;
        this.#last = performance.now();
        requestAnimationFrame((now) => this.#loop(now));
    }

    setPaused(paused) {
        this.#paused = paused;
    }

    #loop(now) {
        if (!this.#running) return;
        const dt = Math.min(MAX_CATCH_UP, (now - this.#last) / 1000);
        this.#last = now;
        if (!this.#paused) {
            this.#pending += dt;
            while (this.#pending >= this.#step) {
                this.#tick();
                this.#pending -= this.#step;
            }
        }
        this.#frame(this.#paused ? 0 : dt);
        requestAnimationFrame((next) => this.#loop(next));
    }
}
