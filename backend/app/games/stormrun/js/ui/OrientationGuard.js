/**
 * The game is made for a phone held sideways: upright, it asks to turn it.
 * It asks the screen of the device, never the size of the page: inside the
 * platform the game is in an iframe, whose shape says nothing about the phone.
 */

const TOUCH_DEVICE = '(pointer: coarse)';

export class OrientationGuard {
    #root;
    #handler = () => {};

    /** @param {HTMLElement} root gets the class that shows the rotate message */
    constructor(root) {
        this.#root = root;
        const update = () => this.#refresh();
        globalThis.screen.orientation?.addEventListener('change', update);
        globalThis.addEventListener('resize', update);
        this.#refresh();
    }

    /** @returns {boolean} */
    get isUpright() {
        const { orientation, width, height } = globalThis.screen;
        const upright = orientation ? orientation.type.startsWith('portrait') : height > width;
        return upright && globalThis.matchMedia(TOUCH_DEVICE).matches;
    }

    /** @param {(upright: boolean) => void} handler */
    onChange(handler) {
        this.#handler = handler;
    }

    #refresh() {
        const upright = this.isUpright;
        this.#root.classList.toggle('is-upright', upright);
        this.#handler(upright);
    }
}
