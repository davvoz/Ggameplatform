import { INVADER } from '../config/Tuning.js';
import { BOON_SCREEN } from '../config/Boons.js';
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
/** The mouse's sight for what a tap would hit: locked on a target, the shield on the mage. */
const AIMS = Object.freeze({ enemy: 'lock', shot: 'lock', pickup: 'lock', shield: 'shield' });

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
    /** The warning of a wave's boss: `{invader, age}`. */
    #herald = null;
    #result = null;
    /** The powers' screen while it is up: its age, and the power picked (sent to the night after the outro). */
    #offerShow = null;
    #mouse = null;
    #aim = null;
    #sightTime = 0;

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

    /** The mouse on the canvas, in CSS pixels, or null when it is away (touch has none). */
    setMouse(point) {
        this.#mouse = point;
    }

    /** What is under the mouse: 'button', 'lock', 'shield', 'free', or null without a mouse. */
    get aim() {
        return this.#aim;
    }

    /**
     * What a click at a world point would do, for the mouse's sight: 'button'
     * on a button, 'lock' on something to hit or take, 'shield' on the mage,
     * 'free' elsewhere.
     */
    #aimAt(point) {
        if (this.#buttons.some((b) => inside(b, point))) return 'button';
        if (this.#mode !== 'play' || this.#sim.offer) return 'free';
        return AIMS[this.#sim.aimAt(point.x, point.y)] ?? 'free';
    }

    /** The sight drawn over the frame; the hand of the system on buttons instead. */
    #drawSight() {
        const { renderer } = this.#parts;
        const point = this.#mouse && renderer.toWorld(this.#mouse.x, this.#mouse.y);
        this.#aim = point ? this.#aimAt(point) : null;
        if (!point || this.#aim === 'button') return;
        const dim = this.#aim === 'shield' && !this.#sim.mage.shieldReady;
        renderer.drawSight({ x: point.x, y: point.y, look: this.#aim, time: this.#sightTime, dim });
    }

    /**
     * In the fight the storm button takes its taps; while the powers are
     * offered only their cards do; every other tap goes to the night.
     */
    #playTap(point) {
        const button = this.#buttons.find((b) => inside(b, point));
        if (this.#sim.offer) {
            if (button?.id.startsWith('boon:')) this.#pickBoon(button.id.slice(5));
        } else if (button?.id === 'storm') {
            this.#sim.callStorm();
        } else {
            this.#sim.tap(point.x, point.y);
        }
    }

    /** 1, 2, 3: one of the powers offered. */
    chooseBoon(index) {
        const choice = this.#mode === 'play' ? this.#sim.offer?.[index] : null;
        if (choice) this.#pickBoon(choice);
    }

    /** A card is taken only once the screen is fully in, and only one. */
    #pickBoon(id) {
        const show = this.#offerShow;
        if (!show || show.picked || show.age < BOON_SCREEN.intro) return;
        show.picked = id;
        show.pickedAt = show.age;
        this.#parts.audio.play('boon');
    }

    /** Runs the powers' screen clock; once the outro is over, the choice goes to the night. */
    #runOffer(dt) {
        if (!this.#sim?.offer) {
            this.#offerShow = null;
            return;
        }
        this.#offerShow ??= { age: 0, picked: null, pickedAt: 0, sent: false };
        const show = this.#offerShow;
        show.age += dt;
        if (show.picked && !show.sent && show.age - show.pickedAt >= BOON_SCREEN.outro) {
            show.sent = true;
            this.#sim.choose(show.picked);
        }
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
        this.#herald = null;
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
        this.#parts.renderer.hud.playEvents(events);
        this.#parts.audio.playEvents(events);
        for (const event of events) this.#onEvent(event);
    }

    #onEvent(event) {
        if (event.type === 'wave') this.#banner = { wave: event.wave, age: 0, scene: this.#banner?.pendingScene };
        if (event.type === 'invaderComing') this.#herald = { invader: event.invader, age: 0 };
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
        this.#sightTime += dt;
        this.#drawSight();
    }

    #advanceClocks(dt) {
        if (this.#banner) this.#banner.age += dt;
        if (this.#herald) this.#herald.age += dt;
        if (this.#mode === 'play') this.#runOffer(dt);
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
            herald: this.#herald,
            result: this.#result,
            offer: this.#offerShow,
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
