import { RAINBOW } from '../config/Palette.js';
import { Strings } from '../config/Strings.js';
import { Simulation } from '../sim/Simulation.js';
import { StateMachine } from './StateMachine.js';
import { FinishedState, ReadyState, RunningState } from './States.js';

/**
 * Coordinates a game: it owns the current run and connects it to screen, sound
 * and platform. Everything it uses is handed in, so any part can be replaced.
 *
 * @typedef {Object} GameParts
 * @property {import('../input/PressInput.js').PressInput} input
 * @property {import('../render/SceneRenderer.js').SceneRenderer} renderer
 * @property {import('../audio/GameAudio.js').GameAudio} audio
 * @property {import('../ui/Screens.js').Screens} screens
 * @property {import('../platform/PlatformGateway.js').PlatformGateway} platform
 * @property {{weekId: string, seed: number}} week
 */

const FINISH_DELAY_MS = 700;
const STANDINGS_DELAY_MS = 1200;
const RIVAL_FLAGS = 3;
const HINTS_UNTIL_BEST = 250;
const PLAYER_FLAG_COLOR = RAINBOW[0];
const RIVAL_FLAG_COLOR = RAINBOW[4];

export class Game {
    #parts;
    #machine = new StateMachine();
    #ready = new ReadyState(this);
    #running = new RunningState(this);
    #finished = new FinishedState(this);
    #sim;
    #best = 0;
    #standings = [];

    /** @param {GameParts} parts */
    constructor(parts) {
        this.#parts = parts;
        this.#sim = this.#newRun();
    }

    /** Show the first screen. */
    open() {
        this.#parts.renderer.attach(this.#sim);
        this.#machine.change(this.#ready);
        this.#refreshStandings();
    }

    /** The player asked to play. */
    play() {
        this.#parts.audio.unlock();
        this.#machine.change(this.#running);
    }

    /** @param {number} best personal record */
    setBest(best) {
        this.#best = Math.max(this.#best, best);
        this.#updateFlags();
    }

    /** One tick of the loop. */
    tick() {
        this.#machine.tick();
    }

    /** One frame of the loop. */
    frame(dt, alpha) {
        this.#parts.renderer.render(dt, alpha);
        this.#parts.audio.update(this.#sim);
        this.#parts.screens.setMetres(this.#sim.metres);
    }

    showReady() {
        this.#parts.screens.showReady(this.#best);
    }

    beginRun() {
        const { audio, platform, renderer, screens } = this.#parts;
        this.#sim = this.#newRun();
        renderer.attach(this.#sim);
        renderer.setHints(this.#best < HINTS_UNTIL_BEST);
        audio.setPlaying(true);
        screens.showRunning();
        platform.startRun();
    }

    advanceRun() {
        const { audio, input, renderer } = this.#parts;
        const sim = this.#sim;
        sim.step(input.held);
        const events = sim.drainEvents();
        renderer.handle(events);
        audio.handle(events);
        if (sim.finished) this.#machine.change(this.#finished);
    }

    closeRun() {
        const { audio, platform, screens } = this.#parts;
        const { metres, drops, rainbows, perfectLandings } = this.#sim;
        const isNewBest = metres > this.#best;

        audio.setPlaying(false);
        platform.finishRun({ metres, drops, rainbows, perfectLandings, weekId: this.#parts.week.weekId });
        if (isNewBest) {
            this.#best = metres;
            platform.saveBest(metres);
        }

        setTimeout(() => screens.showOver({ metres, best: this.#best, isNewBest }), FINISH_DELAY_MS);
        setTimeout(() => this.#refreshStandings(true), STANDINGS_DELAY_MS);
    }

    #newRun() {
        return new Simulation(this.#parts.week.seed);
    }

    async #refreshStandings(showRank = false) {
        const { platform, screens } = this.#parts;
        this.#standings = await platform.loadStandings();
        this.#updateFlags();
        if (!showRank) return;
        const player = this.#standings.find((standing) => standing.isPlayer);
        if (player) screens.showRank(player.rank);
    }

    #updateFlags() {
        const rivals = this.#standings
            .filter((standing) => !standing.isPlayer)
            .slice(0, RIVAL_FLAGS)
            .map(({ username, metres }) => ({ label: username, metres, color: RIVAL_FLAG_COLOR }));
        const own = this.#best > 0 ? [{ label: Strings.you, metres: this.#best, color: PLAYER_FLAG_COLOR }] : [];
        this.#parts.renderer.setFlags([...own, ...rivals]);
    }
}
