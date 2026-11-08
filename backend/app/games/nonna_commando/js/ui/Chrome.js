/**
 * The few HTML elements around the canvas: pause, sound and full screen
 * buttons, the XP and level up stickers from the platform, the loading
 * curtain and the rotate-your-phone message. Everything else is drawn in the
 * canvas.
 */
const TOUCH_DEVICE = '(pointer: coarse)';
const XP_STICKER_MS = 3500;
const LEVEL_STICKER_MS = 6000;
const PEEL_MS = 300;

export class Chrome {
    #doc;
    #handlers = { pause: () => {}, sound: () => {}, fullscreen: () => {}, tap: () => {} };
    #uprightHandler = () => {};
    #modeHandler = () => {};

    /** @param {Document} doc */
    constructor(doc) {
        this.#doc = doc;
        const $ = (id) => doc.getElementById(id);
        $('btn-pause').addEventListener('click', (e) => {
            e.stopPropagation();
            this.#handlers.pause();
        });
        $('btn-sound').addEventListener('click', (e) => {
            e.stopPropagation();
            const muted = $('btn-sound').getAttribute('aria-pressed') !== 'true';
            $('btn-sound').setAttribute('aria-pressed', String(muted));
            this.#handlers.sound(muted);
        });
        $('btn-fullscreen').addEventListener('click', (e) => {
            e.stopPropagation();
            this.#handlers.fullscreen();
        });
        // Any press inside the game takes the keyboard back from the page around
        // it (the platform). The picture cancels the browser's own handling of
        // the press, which would otherwise do it: without this, clicking the
        // game to play again left the keys going to the platform page.
        doc.addEventListener('pointerdown', () => {
            if (!doc.hasFocus()) globalThis.focus();
        }, true);
        // tapping the picture starts and resumes (the touch pad sits above it while playing)
        $('game-canvas').addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.#handlers.tap();
        });
        globalThis.addEventListener('resize', () => this.#refreshOrientation());
        this.#refreshOrientation();
    }

    on(handlers) {
        Object.assign(this.#handlers, handlers);
    }

    onUpright(handler) {
        this.#uprightHandler = handler;
    }

    /** @param {(mode: string) => void} handler called when the mode changes */
    onMode(handler) {
        this.#modeHandler = handler;
    }

    /** @param {'title'|'play'|'paused'|'results'} mode */
    setMode(mode) {
        if (this.#doc.body.dataset.mode === mode) return;
        this.#doc.body.dataset.mode = mode;
        this.#modeHandler(mode);
    }

    /** @param {number} xp */
    showXp(xp) {
        if (xp > 0) this.#stick([`+${xp.toFixed(2)} XP`], 'sticker', XP_STICKER_MS);
    }

    /** @param {{level: number, title: string, coins: number}} levelUp */
    showLevelUp({ level, title, coins }) {
        const details = [title, coins > 0 ? `+${coins} coins` : ''].filter(Boolean).join(' - ');
        this.#stick([`Level ${level}!`, details], 'sticker is-level', LEVEL_STICKER_MS);
    }

    // Rewards arrive when the server answers, in any state of the game, so they
    // live outside the canvas and take care of themselves.
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

    hideLoading() {
        this.#doc.getElementById('loading').hidden = true;
    }

    setMutedButton(muted) {
        this.#doc.getElementById('btn-sound').setAttribute('aria-pressed', String(muted));
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
