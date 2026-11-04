/** The only control of the game: pressed or not. Touch, mouse and keyboard alike. */

const KEYS = new Set(['Space', 'ArrowDown', 'KeyS']);

export class PressInput {
    #pointers = new Set();
    #keys = new Set();

    /** @param {HTMLElement} surface where a press counts */
    constructor(surface) {
        surface.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            surface.setPointerCapture?.(event.pointerId);
            this.#pointers.add(event.pointerId);
        });
        for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
            surface.addEventListener(type, (event) => this.#pointers.delete(event.pointerId));
        }
        surface.addEventListener('contextmenu', (event) => event.preventDefault());

        globalThis.addEventListener('keydown', (event) => {
            if (!KEYS.has(event.code)) return;
            event.preventDefault();
            this.#keys.add(event.code);
        });
        globalThis.addEventListener('keyup', (event) => this.#keys.delete(event.code));
        globalThis.addEventListener('blur', () => this.release());
    }

    /** @returns {boolean} */
    get held() {
        return this.#pointers.size > 0 || this.#keys.size > 0;
    }

    /** Forget every press, for example when the game pauses. */
    release() {
        this.#pointers.clear();
        this.#keys.clear();
    }
}
