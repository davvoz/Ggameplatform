/**
 * Screen shake effect for impactful moments.
 */
export class ScreenShake {
    #intensity = 0;
    #duration = 0;
    #elapsed = 0;
    #offsetX = 0;
    #offsetY = 0;

    get offsetX() { return this.#offsetX; }
    get offsetY() { return this.#offsetY; }
    get isActive() { return this.#elapsed < this.#duration; }

    trigger(intensity = 5, duration = 200) {
        this.#intensity = intensity;
        this.#duration = duration;
        this.#elapsed = 0;
    }

    update(dt) {
        if (this.#elapsed >= this.#duration) {
            this.#offsetX = 0;
            this.#offsetY = 0;
            return;
        }

        this.#elapsed += dt;
        const remaining = 1 - this.#elapsed / this.#duration;
        const mag = this.#intensity * remaining;
        this.#offsetX = (Math.random() - 0.5) * 2 * mag;
        this.#offsetY = (Math.random() - 0.5) * 2 * mag;
    }

    apply(ctx) {
        if (this.isActive) {
            ctx.translate(this.#offsetX, this.#offsetY);
        }
    }
}
