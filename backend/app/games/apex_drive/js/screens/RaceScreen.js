import { Banners } from '../render/hud/Banners.js';
import { RaceHud } from '../render/hud/RaceHud.js';
import { Taunts } from '../render/hud/Taunts.js';
import { ease, progress } from '../render/ui/ease.js';
import { panel, textCentered, UI } from '../render/ui/widgets.js';
import { createRace, musicOf, worldOf } from '../sim/setup.js';
import { Menu } from './Menu.js';
import { Screen } from './Screen.js';
import { SoundPanel } from './SoundPanel.js';

/**
 * A race: it steps the simulation with the controls, draws the road, the
 * HUD and the banners, and pauses (button, P or Esc, or the page hidden)
 * with a small menu: resume, restart, sound (the volumes), quit. When the results are due it
 * pays the race into the career (app.sync) and moves on. Each race is one
 * platform session.
 *
 * A weekly challenge run (params.challenge, as the server started it) is
 * raced with this week's seed and goes back to the challenge screen, which
 * sends the time.
 *
 * A press steers unless it lands on the nitro or the pause button.
 */
export class RaceScreen extends Screen {
    #race;
    #view;
    #hud;
    #banners = new Banners();
    #taunts;
    #paused = false;
    #pausedAt = 0;
    #pauseMenu = new Menu();
    #sound = new SoundPanel(this.app);
    #done = false;
    /** Seconds the race has been drawn (stops while paused). */
    #clock = 0;
    /** A career race as app.sync started it: {seed, id}. */
    #entry = null;

    enter() {
        const run = this.params.challenge;
        this.#entry = run ? null : this.app.sync.startRace(this.params.trackId);
        const seed = run ? run.seed : this.#entry.seed;
        this.#race = createRace({ trackId: this.params.trackId, playerStats: this.app.career.stats(), seed, playerName: this.app.player.name, challenge: Boolean(run) });
        this.#view = this.app.makeRaceView(this.#race);
        this.#hud = new RaceHud(this.#race, this.app.icons, { keyboard: this.app.keyboard, brake: this.app.controls.touch });
        this.#taunts = new Taunts(seed);
        this.app.controls.release();
        this.app.sessions.startRace();
    }

    tick(dt) {
        if (this.#paused || this.#done) return;
        const race = this.#race;
        // automated checks hand the wheel to the pilot (?autoplay)
        const racing = race.phase === 'racing';
        const input = this.app.autopilot && racing ? race.player.brain.read(race.player, race) : this.app.controls.read({ cruise: racing });
        race.step(input, dt);
        const events = race.drain();
        for (const event of events) this.#banners.handle(event);
        this.app.audio.raceEvents(events);
        for (const event of events) this.#taunt(event);
        if (race.over) this.#finish();
    }

    /** The track's song plays from the green light to the flag. */
    get music() {
        return this.#race.phase === 'racing' ? musicOf(this.params.trackId) : null;
    }

    update(dt) {
        super.update(dt);
        // the music comes back up while its volume is being set
        this.app.audio.duckMusic(this.#paused && !this.#sound.open);
        if (this.#paused || this.#done) {
            this.app.audio.quiet();
            return;
        }
        this.#clock += dt;
        this.#banners.update(dt);
        this.#taunts.update(dt);
        this.app.audio.drive(this.#race, this.#clock);
    }

    leave() {
        this.app.audio.quiet();
        this.app.audio.duckMusic(false);
    }

    draw(ctx, size) {
        const [dx, dy] = this.#banners.shake;
        ctx.save();
        ctx.translate(dx, dy);
        this.#view.draw(ctx, size, this.#clock);
        ctx.restore();
        this.#taunts.draw(ctx, size, this.#view.playerTop);
        this.#hud.draw(ctx, size, this.#race, this.#clock);
        this.#banners.draw(ctx, size, this.#race);
        if (this.#paused) this.#drawPause(ctx, size);
        if (this.#paused && this.#sound.open) this.#sound.draw(ctx, size, this.time);
    }

    press(x, y) {
        if (this.#sound.open) {
            this.#sound.press(x, y, this.time);
            return false;
        }
        if (this.#paused) {
            const id = this.#pauseMenu.press(x, y, this.time);
            if (id) this.#pauseAction(id);
            return false;
        }
        const button = this.#hud.buttons(this.#size).find((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
        if (!button) return true;
        if (button.id === 'brake') return 'brake';
        this.#hud.press(button.id, this.#clock);
        if (button.id === 'nitro') this.app.controls.queueNitro();
        else this.#pause();
        return false;
    }

    key(action) {
        if (this.#sound.open) {
            this.#sound.key(action, this.time);
            return;
        }
        if (action === 'pause' || action === 'back') {
            if (this.#paused) this.#resume();
            else this.#pause();
            return;
        }
        if (!this.#paused) return;
        const before = this.#pauseMenu.focus;
        const id = this.#pauseMenu.key(action, this.time);
        if (id) this.#pauseAction(id);
        else if (this.#pauseMenu.focus !== before) this.app.audio.play('move');
    }

    suspend() {
        this.#pause();
    }

    /** Going by a rival: a speech bubble over the car, and its chatter. */
    #taunt(event) {
        const kind = this.#taunts.handle(event);
        if (kind) this.app.audio.play(kind === 'lapped' ? 'taunt:lapped' : 'taunt');
    }

    get #size() {
        return this.app.frameSize();
    }

    #pause() {
        if (this.#paused || this.#done) return;
        this.#paused = true;
        this.#pausedAt = this.time;
        this.#pauseMenu.show(this.time);
        this.#pauseMenu.setFocus('resume');
        this.app.controls.release();
    }

    #resume() {
        this.#paused = false;
        this.app.controls.release();
    }

    #pauseAction(id) {
        this.app.audio.play(id === 'quit' ? 'back' : 'confirm');
        if (id === 'sound') this.#sound.show(this.time);
        else if (id === 'resume') this.#resume();
        else if (id === 'restart') this.#again();
        else if (id === 'quit') this.#quit();
    }

    /** A new race on the same track; a challenge run is a new run. */
    #again() {
        this.#retire();
        if (this.params.challenge) this.app.show('challenge', { go: true });
        else this.app.show('race', this.params);
    }

    #quit() {
        this.#retire();
        if (this.params.challenge) this.app.show('challenge');
        else this.app.show('tracks', this.params);
    }

    /** The race left before the flag: its session ends as a retirement (its ping says DNF, not 0 points). */
    #retire() {
        if (this.#done) return;
        this.#done = true;
        const { trackId, challenge } = this.params;
        if (challenge) this.app.sessions.finishUnscoredRun({ trackId, weekId: challenge.weekId });
        else this.app.sessions.retireCareerRace({ trackId });
    }

    #drawPause(ctx, size) {
        const { width, height } = size;
        const t = ease.outCubic(progress(this.time, this.#pausedAt, 0.2));
        ctx.fillStyle = `rgba(10, 6, 24, ${0.7 * t})`;
        ctx.fillRect(0, 0, width, height);
        const w = 120;
        const x = Math.round(width / 2 - w / 2);
        const y = Math.round(height / 2 - 58 + (1 - t) * 20);
        panel(ctx, x, y, w, 116);
        textCentered(ctx, 'PAUSED', width / 2, y + 8, { color: UI.gold, outline: UI.ink, scale: 2 });
        this.#pauseMenu.set([
            { id: 'resume', label: 'RESUME', kind: 'primary', x: x + 14, y: y + 30, w: w - 28, h: 16 },
            { id: 'restart', label: 'RESTART', x: x + 14, y: y + 50, w: w - 28, h: 16 },
            { id: 'sound', label: 'SOUND', icon: this.app.audio.muted ? 'mute' : 'sound', x: x + 14, y: y + 70, w: w - 28, h: 16 },
            { id: 'quit', label: 'QUIT RACE', kind: 'danger', x: x + 14, y: y + 90, w: w - 28, h: 16 },
        ]);
        this.#pauseMenu.draw(ctx, this.time, this.app.icons);
    }

    /** Pays the race into the career and shows the results; a challenge run goes back to be sent. */
    #finish() {
        this.#done = true;
        const result = this.#race.result();
        const { trackId, challenge } = this.params;
        if (challenge) {
            this.app.show('challenge', { run: challenge, result });
            return;
        }
        const creditsBefore = this.app.career.credits;
        const payout = this.app.sync.finishRace(this.#entry, trackId, result, worldOf(trackId).prizeScale);
        this.app.sessions.finishCareerRace({ trackId, position: result.position, bestLap: result.bestLap, time: result.time });
        this.app.show('results', { ...this.params, result, payout, creditsBefore });
    }
}
