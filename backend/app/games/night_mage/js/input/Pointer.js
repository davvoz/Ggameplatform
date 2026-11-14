/**
 * Taps and clicks on the canvas, as points in CSS pixels relative to it.
 * One gesture only: every press is a tap, wherever it lands. Keyboard: Space
 * or Enter press the main button of a screen (in the fight: the shield),
 * E calls the storm, 1 2 3 choose a power, P / Esc pause.
 */
export class Pointer {
    #element;
    #onTap = () => {};
    #onKey = () => {};

    /** @param {HTMLElement} element */
    constructor(element) {
        this.#element = element;
        element.addEventListener('pointerdown', (event) => this.#press(event));
        element.addEventListener('contextmenu', (event) => event.preventDefault());
        globalThis.addEventListener('keydown', (event) => this.#key(event));
    }

    /** @param {(x: number, y: number) => void} handler */
    onTap(handler) {
        this.#onTap = handler;
    }

    /** @param {(action: 'confirm'|'storm'|'choose'|'pause', index?: number) => void} handler */
    onKey(handler) {
        this.#onKey = handler;
    }

    #press(event) {
        if (event.button !== undefined && event.button > 0) return;
        event.preventDefault();
        const rect = this.#element.getBoundingClientRect();
        this.#onTap(event.clientX - rect.left, event.clientY - rect.top);
    }

    #key(event) {
        if (event.repeat) return;
        if (event.code === 'Space' || event.code === 'Enter') {
            event.preventDefault();
            this.#onKey('confirm');
        } else if (/^(Digit|Numpad)[123]$/.test(event.code)) {
            this.#onKey('choose', Number(event.code.at(-1)) - 1);
        } else if (event.code === 'KeyE') {
            this.#onKey('storm');
        } else if (event.code === 'KeyP' || event.code === 'Escape') {
            this.#onKey('pause');
        }
    }
}
