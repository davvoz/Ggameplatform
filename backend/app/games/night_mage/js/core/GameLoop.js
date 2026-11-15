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
    #reported = new Set();

    #onError;

    /**
     * @param {number} rate ticks per second @param {() => void} tick @param {(dt: number) => void} frame
     * @param {(error: unknown) => void} [onError] told once of each different error in a frame
     */
    constructor(rate, tick, frame, onError = () => {}) {
        this.#step = 1 / rate;
        this.#tick = tick;
        this.#frame = frame;
        this.#onError = onError;
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

    /**
     * The next frame is asked for first, and a frame that fails is reported
     * and dropped: one bad frame must not stop the game on a black screen.
     */
    #loop(now) {
        if (!this.#running) return;
        requestAnimationFrame((next) => this.#loop(next));
        // the first frame's time can be a little before start(): never a negative step
        const dt = Math.max(0, Math.min(MAX_CATCH_UP, (now - this.#last) / 1000));
        this.#last = now;
        try {
            this.#run(dt);
        } catch (error) {
            this.#report(error);
        }
    }

    #run(dt) {
        if (!this.#paused) {
            this.#pending += dt;
            while (this.#pending >= this.#step) {
                this.#pending -= this.#step;
                this.#tick();
            }
        }
        this.#frame(this.#paused ? 0 : dt);
    }

    /** Each different error once in the console, not sixty times a second. */
    #report(error) {
        const key = String(error?.stack ?? error);
        if (this.#reported.has(key)) return;
        this.#reported.add(key);
        console.error('[Night Mage] frame failed', error);
        this.#onError(error);
    }
}
