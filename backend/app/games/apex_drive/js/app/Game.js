import { Wipe } from '../render/ui/Wipe.js';

/**
 * The game's flow: one screen at a time (title, worlds, tracks, garage,
 * race, results), changed behind a wipe. It passes on the ticks, the
 * frames, the presses and the keys to the screen shown.
 *
 * Screens are made by the factories main.js hands in, by name, with the
 * params of the call that asked for them. The music is the shown screen's.
 */
export class Game {
    #frame;
    #factories;
    #app;
    #wipe = new Wipe();
    #screen = null;
    #name = null;
    /** A screen asked for while a wipe ran: {name, params}. */
    #next = null;

    /**
     * @param {{frame: import('../render/Frame.js').Frame,
     *   factories: Record<string, (app: object, params: object) => import('../screens/Screen.js').Screen>,
     *   app: object}} parts app: what screens may use; `show` and `frameSize` are added here
     */
    constructor({ frame, factories, app }) {
        this.#frame = frame;
        this.#factories = factories;
        this.#app = Object.assign(app, {
            show: (name, params) => this.show(name, params),
            frameSize: () => this.#frame.size,
        });
    }

    get screenName() {
        return this.#name;
    }

    /** Shows a screen at once (the first one). */
    start(name, params = {}) {
        this.#swap(name, params);
    }

    /**
     * Shows a screen behind a wipe. Asked while a wipe runs (a server's
     * answer, say), it comes right after it; the last such ask wins. Presses
     * and keys wait for the wipe, so a double tap never opens two screens.
     */
    show(name, params = {}) {
        if (this.#wipe.busy) {
            this.#next = { name, params };
            return;
        }
        this.#app.audio?.play('wipe');
        this.#wipe.cover(() => this.#swap(name, params));
    }

    #swap(name, params) {
        const make = this.#factories[name];
        if (!make) throw new Error(`No screen called ${name}`);
        this.#screen?.leave();
        this.#name = name;
        this.#screen = make(this.#app, params);
        this.#screen.enter();
    }

    tick(dt) {
        this.#screen.tick(dt);
    }

    frame(dt) {
        const { ctx, size } = this.#frame;
        this.#wipe.update(dt);
        if (this.#next && !this.#wipe.busy) {
            const { name, params } = this.#next;
            this.#next = null;
            this.show(name, params);
        }
        this.#screen.update(dt);
        this.#app.audio?.music(this.#screen.music);
        this.#screen.draw(ctx, size);
        this.#wipe.draw(ctx, size);
    }

    /** @returns {boolean} whether the press steers */
    press(clientX, clientY) {
        if (this.#wipe.busy) return false;
        const { x, y } = this.#frame.toFrame(clientX, clientY);
        return this.#screen.press(x, y);
    }

    key(action) {
        if (!this.#wipe.busy) this.#screen.key(action);
    }

    suspend() {
        this.#screen?.suspend();
    }
}
