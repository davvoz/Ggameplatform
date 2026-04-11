/**
 * ScreenShake - Camera shake effect
 * Single Responsibility: Apply screenshake transforms to canvas.
 */

export class ScreenShake {
    #intensity = 0;
    #duration = 0;
    #elapsed = 0;
    #offsetX = 0;
    #offsetY = 0;

    /**
     * Trigger a screen shake
     * @param {number} intensity - Shake magnitude in pixels
     * @param {number} duration - Duration in seconds
     */
    shake(intensity = 10, duration = 0.3) {
        this.#intensity = Math.max(this.#intensity, intensity);
        this.#duration = Math.max(this.#duration, duration);
        this.#elapsed = 0;
    }

    update(dt) {
        if (this.#duration <= 0) {
            this.#offsetX = 0;
            this.#offsetY = 0;
            return;
        }

        this.#elapsed += dt;
        
        if (this.#elapsed >= this.#duration) {
            this.#duration = 0;
            this.#intensity = 0;
            this.#offsetX = 0;
            this.#offsetY = 0;
            return;
        }

        // Linear decay
        const progress = 1 - (this.#elapsed / this.#duration);
        const currentIntensity = this.#intensity * progress;

        // Random offset
        this.#offsetX = (Math.random() - 0.5) * 2 * currentIntensity;
        this.#offsetY = (Math.random() - 0.5) * 2 * currentIntensity;
    }

    /**
     * Apply shake transform to context
     */
    apply(ctx) {
        if (this.#offsetX !== 0 || this.#offsetY !== 0) {
            ctx.translate(this.#offsetX, this.#offsetY);
        }
    }

    get offsetX() { return this.#offsetX; }
    get offsetY() { return this.#offsetY; }
    get isShaking() { return this.#duration > 0; }
}
