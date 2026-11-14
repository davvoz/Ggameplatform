/**
 * The few HTML elements around the canvas: pause, sound and full screen
 * buttons, the XP and level up stickers from the platform, the loading
 * curtain and the turn-your-phone message. Everything else is in the canvas.
 */
const TOUCH_DEVICE = '(pointer: coarse)';
const XP_STICKER_MS = 3500;
const LEVEL_STICKER_MS = 6000;
const PEEL_MS = 300;

export class Chrome {
    #doc;
    #handlers = { pause: () => {}, sound: () => {}, fullscreen: () => {} };
    #uprightHandler = () => {};

    /** @param {Document} doc */
    constructor(doc) {
        this.#doc = doc;
        const $ = (id) => doc.getElementById(id);
        const button = (id, action) => $(id).addEventListener('pointerdown', (event) => {
            event.stopPropagation();
            event.preventDefault();
            action();
        });
        button('btn-pause', () => this.#handlers.pause());
        button('btn-fullscreen', () => this.#handlers.fullscreen());
        button('btn-sound', () => {
            const muted = $('btn-sound').getAttribute('aria-pressed') !== 'true';
            $('btn-sound').setAttribute('aria-pressed', String(muted));
            this.#handlers.sound(muted);
        });
        // a press inside the game takes the keyboard back from the platform page
        doc.addEventListener('pointerdown', () => {
            if (!doc.hasFocus()) globalThis.focus();
        }, true);
        globalThis.addEventListener('resize', () => this.#refreshOrientation());
        this.#refreshOrientation();
    }

    on(handlers) {
        Object.assign(this.#handlers, handlers);
    }

    onUpright(handler) {
        this.#uprightHandler = handler;
    }

    /** @param {'title'|'play'|'paused'|'results'} mode */
    setMode(mode) {
        this.#doc.body.dataset.mode = mode;
    }

    showXp(xp) {
        if (xp > 0) this.#stick([`+${xp.toFixed(2)} XP`], 'sticker', XP_STICKER_MS);
    }

    showLevelUp({ level, title, coins }) {
        const details = [title, coins > 0 ? `+${coins} coins` : ''].filter(Boolean).join(' - ');
        this.#stick([`Level ${level}!`, details], 'sticker is-level', LEVEL_STICKER_MS);
    }

    #stick(lines, className, lifetime) {
        const doc = this.#doc;
        const sticker = doc.createElement('p');
        sticker.className = className;
        for (const line of lines.filter(Boolean)) {
            const row = doc.createElement('span');
            row.textContent = line;
            sticker.append(row);
        }
        doc.getElementById('rewards').append(sticker);
        setTimeout(() => {
            sticker.classList.add('is-leaving');
            setTimeout(() => sticker.remove(), PEEL_MS);
        }, lifetime);
    }

    setLoading(fraction) {
        this.#doc.getElementById('loading-bar').style.width = `${Math.round(fraction * 100)}%`;
    }

    hideLoading() {
        this.#doc.getElementById('loading').hidden = true;
    }

    /** Phones held upright get a message: the game is made for a wide screen. */
    get isUpright() {
        return globalThis.innerHeight > globalThis.innerWidth && globalThis.matchMedia(TOUCH_DEVICE).matches;
    }

    #refreshOrientation() {
        const upright = this.isUpright;
        this.#doc.documentElement.classList.toggle('is-upright', upright);
        this.#uprightHandler(upright);
    }
}
