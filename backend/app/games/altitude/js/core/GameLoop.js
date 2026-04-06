/**
 * GameLoop - Fixed timestep game loop with interpolation
 * Single Responsibility: Manage frame timing and update/render cycle.
 */

export class GameLoop {
    #callback;
    #animFrame = null;
    #lastTime = 0;
    #accumulator = 0;
    #running = false;
    
    // Fixed timestep (60 FPS physics)
    static FIXED_DT = 1 / 60;
    static MAX_FRAME_TIME = 0.1; // Cap to prevent spiral of death

    constructor(callback) {
        this.#callback = callback;
    }

    start() {
        if (this.#running) return;
        this.#running = true;
        this.#lastTime = performance.now();
        this.#accumulator = 0;
        this.#loop();
    }

    stop() {
        this.#running = false;
        if (this.#animFrame) {
            cancelAnimationFrame(this.#animFrame);
            this.#animFrame = null;
        }
    }

    get isRunning() { return this.#running; }

    #loop = () => {
        if (!this.#running) return;
        
        const now = performance.now();
        let frameTime = (now - this.#lastTime) / 1000;
        this.#lastTime = now;
        
        // Clamp frame time to prevent death spiral
        if (frameTime > GameLoop.MAX_FRAME_TIME) {
            frameTime = GameLoop.MAX_FRAME_TIME;
        }
        
        this.#accumulator += frameTime;
        
        // Fixed timestep updates
        while (this.#accumulator >= GameLoop.FIXED_DT) {
            this.#callback(GameLoop.FIXED_DT);
            this.#accumulator -= GameLoop.FIXED_DT;
        }
        
        this.#animFrame = requestAnimationFrame(this.#loop);
    };
}
