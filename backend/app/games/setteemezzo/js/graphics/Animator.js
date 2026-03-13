/**
 * Named animation registry with switching and speed control.
 */
export class Animator {
    #animations = new Map();
    #currentKey = null;
    #speedMultiplier = 1;

    register(key, animation) {
        this.#animations.set(key, animation);
    }

    play(key, speedMultiplier = 1) {
        this.#speedMultiplier = speedMultiplier;
        if (this.#currentKey === key) return;
        this.#currentKey = key;
        this.current?.reset();
    }

    get currentKey() { return this.#currentKey; }

    get current() {
        return this.#animations.get(this.#currentKey) ?? null;
    }

    update(deltaTime) {
        this.current?.update(deltaTime * this.#speedMultiplier);
    }

    draw(ctx, x, y, width, height) {
        this.current?.draw(ctx, x, y, width, height);
    }

    drawCover(ctx, x, y, width, height) {
        this.current?.drawCover(ctx, x, y, width, height);
    }
}
