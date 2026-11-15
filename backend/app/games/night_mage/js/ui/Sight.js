/**
 * The mouse over the canvas, for the sight the game draws in its own pixels.
 * Keeps where the mouse is, and tells the stylesheet what is under it
 * (`data-aim` on the canvas): the system cursor hides over the arena and
 * comes back as a hand on buttons, or whole while the game is stopped.
 * Touch has no cursor: ignored.
 */
export class Sight {
    #element;
    /** The mouse in client pixels, or null when it is off the canvas. */
    #client = null;
    #shown = null;

    /** @param {HTMLElement} element */
    constructor(element) {
        this.#element = element;
        element.addEventListener('pointermove', (event) => {
            if (event.pointerType === 'mouse') this.#client = { x: event.clientX, y: event.clientY };
        });
        element.addEventListener('pointerleave', () => {
            this.#client = null;
        });
    }

    /** The mouse in CSS pixels of the canvas, or null. */
    get point() {
        if (!this.#client) return null;
        const rect = this.#element.getBoundingClientRect();
        return { x: this.#client.x - rect.left, y: this.#client.y - rect.top };
    }

    /** @param {string|null} aim what the game sees under the mouse, or 'system' while it is stopped */
    show(aim) {
        const value = aim ?? '';
        if (value === this.#shown) return;
        this.#shown = value;
        this.#element.dataset.aim = value;
    }
}
