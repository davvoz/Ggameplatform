/**
 * Fixed-timestep game loop using requestAnimationFrame.
 * Calls back with deltaTime in milliseconds.
 */
export class GameLoop {
    #callback;
    #lastTime = 0;
    #running = false;
    #rafId = null;

    /** @param {(dt: number) => void} callback */
    constructor(callback) {
        this.#callback = callback;
    }

    start() {
        if (this.#running) return;
        this.#running = true;
        this.#lastTime = performance.now();
        this.#rafId = requestAnimationFrame(this.#loop);
    }

    stop() {
        this.#running = false;
        if (this.#rafId) cancelAnimationFrame(this.#rafId);
        this.#rafId = null;
    }

    #loop = (now) => {
        if (!this.#running) return;
        const dt = now - this.#lastTime;
        this.#lastTime = now;
        // Cap delta to avoid spiral of death
        this.#callback(Math.min(dt, 50));
        this.#rafId = requestAnimationFrame(this.#loop);
    };
}
