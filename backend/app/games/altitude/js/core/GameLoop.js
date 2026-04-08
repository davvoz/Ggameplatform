/**
 * GameLoop - Fixed timestep game loop with interpolation
 * Single Responsibility: Manage frame timing and update/render cycle.
 *
 * IMPORTANT: Physics updates run N times per frame (fixed dt),
 * but render runs exactly ONCE per animation frame.
 */

import { IS_MOBILE } from '../config/Constants.js';

export class GameLoop {
    #updateCallback;
    #renderCallback;
    #animFrame = null;
    #lastTime = 0;
    #accumulator = 0;
    #running = false;
    
    // Fixed timestep (60 FPS physics)
    static FIXED_DT = 1 / 60;
    // Cap to prevent spiral of death — tighter on mobile (max 3 catch-up frames vs 6)
    static MAX_FRAME_TIME = IS_MOBILE ? 0.05 : 0.1;

    constructor(updateCallback, renderCallback) {
        this.#updateCallback = updateCallback;
        this.#renderCallback = renderCallback;
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
        
        // Fixed timestep updates (may run multiple times per frame)
        while (this.#accumulator >= GameLoop.FIXED_DT) {
            this.#updateCallback(GameLoop.FIXED_DT);
            this.#accumulator -= GameLoop.FIXED_DT;
        }

        // Render exactly ONCE per animation frame
        this.#renderCallback();
        
        this.#animFrame = requestAnimationFrame(this.#loop);
    };
}
