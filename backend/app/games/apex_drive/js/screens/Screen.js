import { MENU_SONG } from '../config/Music.js';
import { Menu } from './Menu.js';

/**
 * A screen of the game: the title, a menu, the race... The game shows one
 * at a time, with a wipe between two. It is ticked at the simulation's
 * rate (`tick`), animated and drawn once per frame (`update`, `draw`), and
 * told of presses (frame pixels) and key actions.
 *
 * @typedef {object} App what every screen can use (built in main.js)
 * @property {import('../sim/Career.js').Career} career
 * @property {() => void} save
 * @property {(name: string, params?: object) => void} show change screen
 * @property {import('../input/Controls.js').Controls} controls
 * @property {object} icons
 * @property {boolean} keyboard whether to name the keys
 * @property {object} art shared art (logo, car, world cards...)
 * @property {(race: import('../sim/Race.js').Race) => import('../render/RaceView.js').RaceView} makeRaceView
 * @property {import('../audio/GameAudio.js').GameAudio} audio
 * @property {() => void} toggleSound mute or unmute, remembered
 * @property {(kind: 'effects'|'music', step: number) => void} setVolume a volume, remembered
 * @property {{name: string, steem: string|null, ranked: boolean}} player who is playing (ranked: on the leaderboard)
 * @property {import('../render/ui/Avatars.js').Avatars} avatars Steem avatars as pixel portraits
 */
export class Screen {
    /** Seconds since shown. */
    time = 0;

    /** @param {App} app @param {object} [params] */
    constructor(app, params = {}) {
        this.app = app;
        this.params = params;
    }

    /** Called once, when the screen becomes the current one. */
    enter() {
        // nothing by default: a screen does what it needs
    }

    /** Called once, when another screen takes its place. */
    leave() {
        // nothing by default: a screen does what it needs
    }

    /** Called at the simulation's rate with the fixed step (seconds). */
    tick() {
        // nothing by default: a screen does what it needs
    }

    update(dt) {
        this.time += dt;
    }

    /** Draws the screen: (ctx, size) with size the frame's {width, height}. */
    draw() {
        // nothing by default: a screen does what it needs
    }

    /**
     * A press at (x, y), frame pixels.
     * @returns {boolean} true: the press steers (held), false: it was a tap
     */
    press() {
        return false;
    }

    /** A press that did not steer moved to (x, y), frame pixels, still held. */
    drag() {
        // nothing by default: a screen with something to drag says so
    }

    /** The mouse wheel turned over (x, y), frame pixels: `deltaY` down positive. */
    wheel() {
        // nothing by default: a screen with something to scroll says so
    }

    /** A key action: up, down, left, right, confirm, back, pause. */
    key() {
        // nothing by default: a screen does what it needs
    }

    /** The page was hidden or the platform paused the game. */
    suspend() {
        // nothing by default: a screen does what it needs
    }

    /** The song to play while shown (config/Music.js), null for none. */
    get music() {
        return null;
    }
}

/**
 * A screen made of buttons. Subclasses lay their buttons out for the
 * frame's size (`layout`), draw what is behind them (`scene`) and answer
 * their presses (`action`) and the back key (`back`).
 */
export class MenuScreen extends Screen {
    menu = new Menu();

    get music() {
        return MENU_SONG;
    }

    /** The buttons for a frame of (size): @returns {import('../render/ui/widgets.js').Button[]} */
    layout() {
        return [];
    }

    /** What is behind the buttons: (ctx, size). */
    scene() {
        // nothing by default: a screen does what it needs
    }

    /** What is over the buttons: (ctx, size). */
    overlay() {
        // nothing by default: a screen does what it needs
    }

    /** A button was pressed: (id). */
    action() {
        // nothing by default: a screen does what it needs
    }

    back() {
        // nothing by default: a screen does what it needs
    }

    draw(ctx, size) {
        this.menu.set(this.layout(size));
        this.scene(ctx, size);
        this.menu.draw(ctx, this.time, this.app.icons);
        this.overlay(ctx, size);
    }

    /** The sound of pressing a button; null when the action makes its own. */
    pressSound(id) {
        return id === 'back' ? 'back' : 'confirm';
    }

    press(x, y) {
        const id = this.menu.press(x, y, this.time);
        if (id) this.#activate(id);
        return false;
    }

    key(action) {
        if (action === 'back') {
            this.app.audio.play('back');
            this.back();
            return;
        }
        const before = this.menu.focus;
        const id = this.menu.key(action, this.time);
        if (id) this.#activate(id);
        else if (this.menu.focus !== before) this.app.audio.play('move');
    }

    #activate(id) {
        const sound = this.pressSound(id);
        if (sound) this.app.audio.play(sound);
        this.action(id);
    }
}
