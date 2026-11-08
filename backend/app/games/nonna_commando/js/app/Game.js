import { Simulation } from '../sim/Simulation.js';
import { DemoPilot } from './DemoPilot.js';

const DEMO_TICKS = 60 * 45;

/**
 * Coordinates the game: title with a demo playing behind it, the run, pause,
 * results. Everything it uses is handed in by main.js, so any part can be
 * replaced. It owns no rules: those are in the simulation.
 *
 * @typedef {Object} GameParts
 * @property {import('../render/Renderer.js').Renderer} renderer
 * @property {import('../render/Screens.js').Screens} screens
 * @property {import('../audio/GameAudio.js').GameAudio} audio
 * @property {import('../input/Controls.js').Controls} controls
 * @property {import('../input/TouchPad.js').TouchPad} touch
 * @property {import('../platform/PlatformGateway.js').PlatformGateway} platform
 * @property {{setMode: (mode: string) => void}} chrome the HTML buttons around the canvas
 */
export class Game {
    #p;
    state = 'title';
    paused = false;
    /** @type {Simulation | null} */
    #sim = null;
    #demo = null;
    #pilot = null;
    #demoCount = 0;
    #best = 0;
    #standings = [];
    #results = null;
    #resultsAge = 0;
    #frame = 0;
    /** a pilot that plays instead of the player: automated screenshots */
    #autopilot = null;

    /** @param {GameParts} parts */
    constructor(parts) {
        this.#p = parts;
    }

    get sim() {
        return this.#sim;
    }

    /** Start a run played by the demo pilot (for automated checks). */
    autoplay(mission = 0, seed = 0, skipTicks = 0) {
        this.#autopilot = new DemoPilot(1);
        this.#startRun(mission, seed);
        for (let i = 0; i < skipTicks && !this.#sim.finished; i++) {
            this.#sim.step(this.#autopilot.buttons(this.#sim));
            this.#p.renderer.handle(this.#sim.events);
            this.#p.renderer.tick();
        }
    }

    open() {
        this.#toTitle();
        this.#refreshStandings();
    }

    setBest(best) {
        this.#best = Math.max(this.#best, best);
    }

    /** Pause from outside (tab hidden, platform overlay, phone upright). */
    pause() {
        if (this.state === 'play' && this.#sim && !this.#sim.finished) this.paused = true;
        this.#p.controls.release();
        this.#p.touch.reset();
    }

    togglePause() {
        if (this.state !== 'play') return;
        this.paused = !this.paused;
        this.#p.controls.clearActions();
        this.#p.touch.reset();
        this.#p.chrome.setMode(this.paused ? 'paused' : 'play');
    }

    /** One fixed tick. */
    tick() {
        const { controls } = this.#p;
        switch (this.state) {
            case 'title':
                this.#tickDemo();
                if (controls.consume('start')) this.#startRun();
                controls.consume('pause');
                break;
            case 'play':
                if (controls.consume('pause')) this.togglePause();
                if (this.paused) {
                    if (controls.consume('start')) this.togglePause();
                    return;
                }
                controls.consume('start');
                this.#tickRun();
                break;
            case 'results':
                this.#resultsAge++;
                if (this.#resultsAge > 70 && controls.consume('start')) this.#startRun();
                controls.consume('pause');
                break;
            default:
                break;
        }
    }

    /** One drawn frame. */
    frame() {
        this.#frame++;
        const { renderer, screens, controls } = this.#p;

        switch (this.state) {
            case 'title': {
                const week = this.#p.platform.week();
                renderer.render((ctx) => screens.title(ctx, {
                    frame: this.#frame, best: this.#best, standings: this.#standings, device: controls.device, weekId: week.weekId,
                }), { hud: false });
                break;
            }
            case 'play': {
                const sim = this.#sim;
                renderer.render((ctx, r) => {
                    const h = r.viewHeight;
                    if (sim.phase === 'clear' || sim.phase === 'victory') screens.tally(ctx, sim, controls.device, h);
                    if (sim.phase === 'over' || sim.phase === 'done') screens.gameOver(ctx, sim, h);
                    if (this.paused) screens.paused(ctx, controls.device, h);
                });
                break;
            }
            case 'results':
                renderer.render((ctx) => screens.results(ctx, {
                    ...this.#results, rank: this.#results.rank, age: this.#resultsAge, device: controls.device, frame: this.#frame,
                }), { hud: false });
                break;
            default:
                break;
        }
    }

    // ---- states

    #toTitle() {
        this.state = 'title';
        this.paused = false;
        this.#newDemo();
        this.#p.touch.setVisible(false);
        this.#p.chrome.setMode('title');
        this.#p.audio.playMusic('title');
    }

    #newDemo() {
        this.#demo = new Simulation(4242 + (this.#demoCount++ % 3) * 101);
        this.#pilot = new DemoPilot(0.9);
        this.#p.renderer.attach(this.#demo);
        // the demo starts a little into the street, where things happen
        for (let i = 0; i < 60 * 6; i++) this.#demo.step(this.#pilot.buttons(this.#demo));
        this.#demo.events.clear();
    }

    #tickDemo() {
        const demo = this.#demo;
        demo.step(this.#pilot.buttons(demo));
        this.#p.renderer.handle(demo.events);
        this.#p.renderer.tick();
        if (demo.finished || demo.tick > DEMO_TICKS || demo.phase !== 'play') this.#newDemo();
    }

    #startRun(startMission = 0, seed = 0) {
        const { audio, controls, platform, renderer, touch, chrome } = this.#p;
        audio.unlock();
        controls.release();
        controls.clearActions();
        this.#sim = new Simulation(seed || platform.week().seed, { startMission });
        renderer.attach(this.#sim);
        // the first events (mission start, music) belong to this run
        renderer.handle(this.#sim.events);
        audio.handle(this.#sim.events);
        this.state = 'play';
        this.paused = false;
        touch.setVisible(controls.device === 'touch' || globalThis.matchMedia?.('(pointer: coarse)').matches);
        chrome.setMode('play');
        platform.startRun();
    }

    #tickRun() {
        const { audio, controls, renderer } = this.#p;
        const sim = this.#sim;
        sim.step(this.#autopilot ? this.#autopilot.buttons(sim) : controls.bits());
        renderer.handle(sim.events);
        audio.handle(sim.events);
        renderer.tick();
        if (sim.finished) this.#endRun();
    }

    #endRun() {
        const { platform, touch, chrome, audio, controls } = this.#p;
        const sim = this.#sim;
        const report = { ...sim.result(), weekId: platform.week().weekId };
        const isNewBest = report.score > this.#best;
        if (isNewBest) {
            this.#best = report.score;
            platform.saveBest(report.score);
        }
        platform.finishRun(report);
        this.#results = { report, best: this.#best, isNewBest, rank: 0 };
        this.#resultsAge = 0;
        this.state = 'results';
        touch.setVisible(false);
        controls.release();
        controls.clearActions();
        chrome.setMode('results');
        audio.playMusic('title');
        // the server needs a moment to place the score
        setTimeout(() => this.#refreshStandings(true), 1500);
    }

    async #refreshStandings(showRank = false) {
        this.#standings = await this.#p.platform.loadStandings();
        if (!showRank || !this.#results) return;
        const me = this.#standings.find((s) => s.isPlayer);
        if (me) this.#results.rank = me.rank;
    }
}
