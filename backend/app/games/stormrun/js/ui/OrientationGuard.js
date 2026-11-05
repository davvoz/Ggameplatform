/**
 * The game is made for a wide picture: on a touch device with a tall one, it asks
 * to turn the phone. It looks at its own shape and not at the phone, because an
 * installed app stays upright and the platform turns this page sideways for it.
 */

const TOUCH_DEVICE = '(pointer: coarse)';

export class OrientationGuard {
    #root;
    #handler = () => {};

    /** @param {HTMLElement} root gets the class that shows the rotate message */
    constructor(root) {
        this.#root = root;
        const update = () => this.#refresh();
        globalThis.addEventListener('resize', update);
        this.#refresh();
    }

    /** @returns {boolean} */
    get isUpright() {
        const tall = globalThis.innerHeight > globalThis.innerWidth;
        return tall && globalThis.matchMedia(TOUCH_DEVICE).matches;
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
