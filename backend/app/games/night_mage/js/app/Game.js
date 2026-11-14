import { INVADER } from '../config/Tuning.js';
import { MAPS } from '../config/Scenes.js';
import { playEvents } from '../render/EventFx.js';
import { titleCue } from '../render/TitleDemo.js';
import { Simulation } from '../sim/Simulation.js';
import { Pilot } from './Pilot.js';

const COUNTDOWN = 1.8;
const DEATH_PAUSE = 1.3;
const INVADERS_PER_RUN = 6;
const SPECS = new Map(MAPS.map((spec) => [spec.id, spec]));
/** The music of each mode: calm around the fight, the fight's own while it lasts, none in the pause. */
const MOODS = Object.freeze({ title: 'calm', countdown: 'fight', play: 'fight', dying: 'fight', paused: null, results: 'calm' });

/** The level of the invader a run lets the player send, or 0 when it is too short. */
export function sendLevel(wave) {
    if (wave < INVADER.minWaveToSend) return 0;
    return Math.min(INVADER.maxLevel, 1 + Math.floor((wave - INVADER.minWaveToSend) / INVADER.wavesPerLevel));
}

function inside(button, point) {
    return point.x >= button.x && point.x <= button.x + button.w && point.y >= button.y && point.y <= button.y + button.h;
}

/**
 * The flow of the game: title → countdown → fight → results → again.
 * Receives its parts from `main.js`; owns the current night.
 */
export class Game {
    #parts;
    #maps;
    #mode = 'title';
    #sim = null;
    #preview = null;
    #buttons = [];
    #best = 0;
    #inbox = null;
    #invaders = [];
    #pilot = null;
    #clock = 0;
    #titleTime = 0;
    #lastBeep = 0;
    #banner = null;
    #result = null;

    /**
     * @param {{renderer: object, audio: object, platform: object, chrome: object, scenes: object, maps: object[]}} parts
     */
    constructor(parts) {
        this.#parts = parts;
        this.#maps = parts.maps;
    }

    get sim() {
        return this.#sim;
    }

    get mode() {
        return this.#mode;
    }

    open() {
        this.#toTitle();
    }

    setBest(best) {
        this.#best = Math.max(this.#best, best);
    }

    /** Plays by itself (for screenshots); `skip` fast-forwards that many ticks. */
    autoplay(skip = 0) {
        this.#pilot = new Pilot({ seed: 5, interval: 9 });
        this.#startRun();
        this.#clock = 0;
        this.#setMode('play');
        for (let i = 0; i < skip && !this.#sim.over; i++) this.tick();
    }

    // ── input ──────────────────────────────────────────────────────────

    /** A tap at a CSS point on the canvas. */
    tap(cssX, cssY) {
        const point = this.#parts.renderer.toWorld(cssX, cssY);
        this.#parts.audio.unlock();
        if (this.#mode === 'play') {
            this.#playTap(point);
            return;
        }
        if (this.#mode === 'paused') {
            this.togglePause();
            return;
        }
        const button = this.#buttons.find((b) => inside(b, point));
        if (button) this.#press(button.id);
    }

    /**
     * In the fight the storm button takes its taps; while the powers are
     * offered only their cards do; every other tap goes to the night.
     */
    #playTap(point) {
        const button = this.#buttons.find((b) => inside(b, point));
        if (this.#sim.offer) {
            if (button?.id.startsWith('boon:')) this.#sim.choose(button.id.slice(5));
        } else if (button?.id === 'storm') {
            this.#sim.callStorm();
        } else {
            this.#sim.tap(point.x, point.y);
        }
    }

    /** 1, 2, 3: one of the powers offered. */
    chooseBoon(index) {
        const choice = this.#mode === 'play' ? this.#sim.offer?.[index] : null;
        if (choice) this.#sim.choose(choice);
    }

    /** Space / Enter: the main button of the screen; in the fight, the shield. */
    confirm() {
        this.#parts.audio.unlock();
        if (this.#mode === 'play') this.#sim.shield();
        else if (this.#mode === 'title') this.#press('start');
        else if (this.#mode === 'results' && this.#buttons.some((b) => b.id === 'again')) this.#press('again');
        else if (this.#mode === 'paused') this.togglePause();
    }

    /** E: the storm. */
    callStorm() {
        if (this.#mode === 'play') this.#sim.callStorm();
    }

    togglePause() {
        if (this.#mode === 'play') this.#setMode('paused');
        else if (this.#mode === 'paused') this.#setMode('play');
    }

    /** The platform or the browser hid the game. */
    pause() {
        if (this.#mode === 'play') this.#setMode('paused');
    }

    #press(id) {
        if (id === 'start' || id === 'again') this.#startRun();
        else if (id === 'home') this.#toTitle();
        else if (id.startsWith('send:')) this.#sendStep(id.slice(5));
    }

    /** Picking the invader: a monster, then SEND or BACK (BACK also after a failure). */
    #sendStep(choice) {
        const send = this.#result?.send;
        if (!send) return;
        if (choice === 'back' && (send.state === 'confirm' || send.state === 'failed')) send.state = 'choose';
        else if (choice === 'confirm' && send.state === 'confirm') this.#send().catch(() => this.#sendFailed());
        else if (send.state === 'choose') Object.assign(send, { state: 'confirm', kind: choice });
    }

    #sendFailed() {
        if (this.#result) this.#result.send.state = 'failed';
    }

    // ── flow ───────────────────────────────────────────────────────────

    #setMode(mode) {
        this.#mode = mode;
        this.#parts.audio.setMusic(MOODS[mode]);
        const shown = { countdown: 'play', dying: 'play' }[mode] ?? mode;
        this.#parts.chrome.setMode(shown);
    }

    #toTitle() {
        const { seed } = this.#parts.platform.week();
        this.#preview = new Simulation({ seed, maps: this.#maps });
        this.#preview.mage.facing = -1; // towards the rules shown on the left
        this.#titleTime = 0;
        this.#parts.renderer.weather.set(this.#spec(this.#preview.map.id).weather);
        this.#setMode('title');
        this.#refreshFromServer();
    }

    #refreshFromServer() {
        const { platform } = this.#parts;
        const ignore = () => {};
        platform.loadInvaders(INVADERS_PER_RUN).then((list) => {
            this.#invaders = list;
        }, ignore);
        platform.loadInbox().then((inbox) => {
            // shown once the player has sent an invader that went out
            this.#inbox = inbox && (inbox.seen > 0 || inbox.active > 0) ? inbox : null;
        }, ignore);
    }

    #startRun() {
        const { platform, renderer, audio } = this.#parts;
        const { seed } = platform.week();
        this.#sim = new Simulation({ seed, maps: this.#maps, invaders: this.#invaders });
        this.#invaders = [];
        renderer.effects.clear();
        renderer.hud.reset();
        renderer.weather.set(this.#spec(this.#sim.map.id).weather);
        this.#parts.scenes.prepare(this.#spec(this.#sim.nextMap.id));
        this.#result = null;
        this.#banner = null;
        this.#clock = COUNTDOWN;
        this.#lastBeep = Math.ceil(COUNTDOWN / 0.6);
        platform.startRun();
        audio.play('countdown');
        this.#setMode('countdown');
    }

    /** One simulation tick (60 per second). */
    tick() {
        if (this.#mode !== 'play' && this.#mode !== 'dying') return;
        const sim = this.#sim;
        this.#pilot?.play(sim);
        sim.step();
        const events = sim.drainEvents();
        playEvents(this.#parts.renderer.effects, events, sim);
        this.#parts.audio.playEvents(events);
        for (const event of events) this.#onEvent(event);
    }

    #onEvent(event) {
        if (event.type === 'wave') this.#banner = { wave: event.wave, age: 0, scene: this.#banner?.pendingScene };
        if (event.type === 'scene') {
            const spec = this.#spec(event.mapId);
            this.#parts.renderer.weather.set(spec.weather);
            this.#parts.scenes.prepare(this.#spec(this.#sim.nextMap.id));
            this.#banner = { wave: this.#sim.wave, age: 99, pendingScene: spec.name };
        }
        if (event.type === 'death') {
            this.#clock = DEATH_PAUSE;
            this.#setMode('dying');
        }
    }

    /** One drawn frame; `dt` in seconds. */
    frame(dt) {
        const { renderer } = this.#parts;
        renderer.update(dt, this.#sim);
        this.#advanceClocks(dt);
        this.#buttons = this.#draw();
    }

    #advanceClocks(dt) {
        if (this.#banner) this.#banner.age += dt;
        if (this.#mode === 'title') this.#animateTitle(dt);
        else if (this.#mode === 'countdown') this.#countdown(dt);
        else if (this.#mode === 'dying') {
            this.#clock -= dt;
            if (this.#clock <= 0) this.#finish();
        } else if (this.#mode === 'results') {
            this.#result.age += dt;
        }
    }

    /** The title's mage breathes, casts at the demo's targets and raises the shield with it. */
    #animateTitle(dt) {
        const before = this.#titleTime;
        this.#titleTime += dt;
        const mage = this.#preview.mage;
        const cue = titleCue(before, this.#titleTime);
        if (cue?.move === 'shield') mage.raiseShield();
        else if (cue) mage.cast(cue.x);
        mage.update(dt);
    }

    #countdown(dt) {
        this.#clock -= dt;
        const step = Math.ceil(this.#clock / 0.6);
        if (step !== this.#lastBeep) {
            this.#lastBeep = step;
            this.#parts.audio.play(step > 0 ? 'countdown' : 'go');
        }
        if (this.#clock <= -0.35) this.#setMode('play');
    }

    #draw() {
        const { renderer } = this.#parts;
        if (this.#mode === 'title') {
            const preview = this.#preview;
            const model = { best: this.#best, inbox: this.#inbox, time: this.#titleTime, ground: (x) => preview.terrain.floorAt(x) };
            return renderer.drawTitle(this.#spec(preview.map.id), preview.mage, model);
        }
        const overlay = {
            countdown: this.#mode === 'countdown' ? this.#clock : null,
            paused: this.#mode === 'paused',
            banner: this.#banner?.age < 99 ? this.#banner : null,
            result: this.#result,
        };
        return renderer.drawPlay(this.#sim, this.#spec(this.#sim.map.id), overlay);
    }

    #finish() {
        const { platform } = this.#parts;
        const report = { ...this.#sim.report(), weekId: platform.week().weekId };
        const newBest = report.score > this.#best;
        if (newBest) {
            this.#best = report.score;
            platform.saveBest(report.score);
        }
        platform.finishRun(report);
        platform.reportInvaders(report.invaders);
        const level = sendLevel(report.wave);
        this.#result = { report, newBest, age: 0, send: { state: level > 0 ? 'choose' : 'locked', level } };
        this.#pilot = null;
        this.#setMode('results');
        this.#refreshFromServer();
    }

    async #send() {
        const send = this.#result.send;
        send.state = 'sending';
        const ok = await this.#parts.platform.sendInvader(send.kind, this.#result.report.wave);
        send.state = ok ? 'sent' : 'failed';
        this.#parts.audio.play(ok ? 'pickup' : 'miss');
    }

    #spec(id) {
        return SPECS.get(id);
    }
}
