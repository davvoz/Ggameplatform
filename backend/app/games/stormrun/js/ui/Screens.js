import { Strings } from '../config/Strings.js';

/** The few things drawn in HTML: score, start screen, end screen, two buttons. */

const RETRY_GUARD_MS = 450;

export class Screens {
    #elements;
    #shownMetres = -1;
    #playHandler = () => {};
    #armedAt = 0;

    /** @param {Document} doc */
    constructor(doc) {
        const byId = (id) => doc.getElementById(id);
        this.#elements = {
            loading: byId('loading'),
            hud: byId('hud'),
            metres: byId('hud-metres'),
            ready: byId('screen-ready'),
            title: byId('title'),
            readyBest: byId('ready-best'),
            over: byId('screen-over'),
            overMetres: byId('over-metres'),
            overBest: byId('over-best'),
            overRank: byId('over-rank'),
            play: byId('btn-play'),
            again: byId('btn-again'),
            sound: byId('btn-sound'),
            fullscreen: byId('btn-fullscreen'),
        };

        const press = () => this.#play();
        this.#elements.play.addEventListener('click', press);
        this.#elements.again.addEventListener('click', press);
        globalThis.addEventListener('keydown', (event) => {
            if (!event.repeat && (event.code === 'Space' || event.code === 'Enter')) press();
        });
    }

    /** @param {HTMLCanvasElement} image the lettered name of the game */
    setTitle(image) {
        this.#elements.title.append(image);
    }

    /** @param {() => void} handler */
    onPlay(handler) {
        this.#playHandler = handler;
    }

    /** @param {(muted: boolean) => void} handler */
    onSoundToggle(handler) {
        const { sound } = this.#elements;
        sound.addEventListener('click', () => {
            const muted = sound.classList.toggle('is-off');
            sound.setAttribute('aria-pressed', String(muted));
            handler(muted);
        });
    }

    /** @param {() => void} handler */
    onFullscreen(handler) {
        this.#elements.fullscreen.addEventListener('click', handler);
    }

    hideLoading() {
        this.#elements.loading.hidden = true;
    }

    /** @param {number} best */
    showReady(best) {
        const { ready, readyBest } = this.#elements;
        readyBest.textContent = best > 0 ? `${Strings.best}: ${best} m` : '';
        this.#setVisible(ready);
        this.#arm();
    }

    showRunning() {
        this.#setVisible(this.#elements.hud);
        this.setMetres(0);
    }

    /** @param {{metres: number, best: number, isNewBest: boolean}} result */
    showOver({ metres, best, isNewBest }) {
        const { over, overMetres, overBest, overRank } = this.#elements;
        overMetres.textContent = `${metres} m`;
        overBest.textContent = isNewBest ? Strings.newBest : `${Strings.best}: ${best} m`;
        overBest.classList.toggle('is-new', isNewBest);
        overRank.textContent = '';
        this.#setVisible(over);
        this.#arm();
    }

    /** @param {number} rank */
    showRank(rank) {
        this.#elements.overRank.textContent = Strings.weekRank(rank);
    }

    /** @param {number} metres */
    setMetres(metres) {
        if (metres === this.#shownMetres) return;
        this.#shownMetres = metres;
        this.#elements.metres.textContent = `${metres} m`;
    }

    #setVisible(active) {
        const { hud, ready, over } = this.#elements;
        for (const element of [hud, ready, over]) element.hidden = element !== active;
    }

    // A finger still down from the run must not restart the game by accident.
    #arm() {
        this.#armedAt = performance.now() + RETRY_GUARD_MS;
    }

    #play() {
        const { ready, over } = this.#elements;
        const visible = !ready.hidden || !over.hidden;
        if (visible && performance.now() >= this.#armedAt) this.#playHandler();
    }
}
