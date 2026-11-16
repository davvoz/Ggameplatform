/**
 * The few HTML elements around the canvas: the full screen button (desktop
 * only, as in the platform's other games), the turn-your-phone message and
 * the line that shows a failed frame. Everything else is drawn in the canvas.
 */
const TOUCH_DEVICE = '(pointer: coarse)';

export class Chrome {
    #doc;
    #onUpright = () => {};

    /** @param {Document} doc */
    constructor(doc) {
        this.#doc = doc;
        globalThis.addEventListener('resize', () => this.#refreshOrientation());
        this.#refreshOrientation();
    }

    onUpright(handler) {
        this.#onUpright = handler;
    }

    /** @param {() => void} handler the full screen button was pressed */
    onFullscreen(handler) {
        const button = this.#doc.getElementById('btn-fullscreen');
        button?.addEventListener('click', (event) => {
            event.stopPropagation();
            handler();
            button.blur(); // the keys go back to the game
        });
    }

    /** One game pixel in CSS pixels: the button over the canvas is sized in game pixels. */
    setPixelSize(cssPixels) {
        this.#doc.documentElement.style.setProperty('--px', `${cssPixels}px`);
    }

    /** Phones held upright are asked to turn: the game is made for a wide screen. */
    get isUpright() {
        return globalThis.innerHeight > globalThis.innerWidth && globalThis.matchMedia(TOUCH_DEVICE).matches;
    }

    showFrameError(error) {
        let line = this.#doc.getElementById('frame-error');
        if (!line) {
            line = this.#doc.createElement('p');
            line.id = 'frame-error';
            line.className = 'frame-error';
            this.#doc.body.append(line);
        }
        line.textContent = String(error?.message ?? error).slice(0, 160);
    }

    #refreshOrientation() {
        const upright = this.isUpright;
        this.#doc.documentElement.classList.toggle('is-upright', upright);
        this.#onUpright(upright);
    }
}
