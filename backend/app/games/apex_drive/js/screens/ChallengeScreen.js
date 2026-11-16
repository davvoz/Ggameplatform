import { WEATHER } from '../config/Weather.js';
import { formatTime } from '../render/hud/RaceHud.js';
import { MiniMap } from '../render/hud/MiniMap.js';
import { drawText } from '../render/PixelFont.js';
import { blink, ease, progress } from '../render/ui/ease.js';
import { panel, textCentered, textRight, UI } from '../render/ui/widgets.js';
import { trackOf } from '../sim/setup.js';
import { header, HEADER_HEIGHT, menuBackground } from './backdrop.js';
import { MenuScreen } from './Screen.js';

/**
 * The weekly challenge: one track for everybody, new every Monday, raced
 * with one's own car against the same rivals; the faster, the more points
 * on the platform's weekly leaderboard. The track's map and facts on the
 * left, the player's best of the week and their last run on the right.
 *
 * The server says which track, starts every run and checks every time
 * (app.sync). Back from a run (params.run, params.result) the time is sent
 * and its points shown; params.go starts a run as soon as the week is known.
 */
/** What the last run's panel says while a time is sent, or when it counts for nothing. */
const STATUS = {
    sending: { text: 'SENDING...', color: UI.dim },
    dnf: { text: 'DID NOT FINISH', color: UI.red },
    refused: { text: 'NOT COUNTED', color: UI.red },
};

export class ChallengeScreen extends MenuScreen {
    /** This week, from the server: {weekId, trackId, laps, seed, best}; null until known. */
    #week = null;
    /** 'loading', 'ready', 'starting' or 'offline'. */
    #state = 'loading';
    /** The run just raced: {status, time, score, newBest}. */
    #last = null;
    #map = null;
    #active = false;

    enter() {
        this.#active = true;
        this.menu.setFocus('race');
        this.#open().catch((error) => this.#fail(error));
    }

    /** Something unexpected: say the challenge cannot be raced now. */
    #fail(error) {
        console.error('[Apex Drive] challenge', error);
        this.#state = 'offline';
    }

    leave() {
        this.#active = false;
    }

    async #open() {
        this.#week = this.app.sync.online ? await this.app.sync.challenge() : null;
        if (!this.#active) return;
        this.#state = this.#week ? 'ready' : 'offline';
        if (!this.#week) return;
        const { run, result, go } = this.params;
        if (run) await this.#send(run, result);
        else if (go) await this.#start();
    }

    /** Sends a run's time; the server answers with its points and the week's best. */
    async #send(run, result) {
        const sessions = this.app.sessions;
        if (result.time === null) {
            this.#last = { status: 'dnf' };
            sessions.finishUnscoredRun(run);
            return;
        }
        this.#last = { status: 'sending', time: result.time };
        const before = this.#week.best?.score ?? 0;
        const answer = await this.app.sync.finishRun(run.raceId, { time: result.time, bestLap: result.bestLap });
        if (!answer.ok) {
            this.#last = { status: 'refused', time: result.time };
            sessions.finishUnscoredRun(run);
            return;
        }
        const { score, best } = answer.data;
        this.#week.best = best;
        this.#last = { status: 'scored', time: result.time, score, newBest: score > before, at: this.time };
        sessions.finishChallengeRun({ ...run, score, time: result.time });
        if (this.#active) this.app.audio.play(score > before ? 'podium' : 'noPodium');
    }

    async #start() {
        if (this.#state !== 'ready') return;
        this.#state = 'starting';
        const run = await this.app.sync.startRun();
        if (!this.#active) return;
        if (run) this.app.show('race', { trackId: run.trackId, challenge: run });
        else this.#state = 'offline';
    }

    layout({ width, height }) {
        const bottom = height - 22;
        const ready = this.#state === 'ready';
        return [
            { id: 'back', label: 'BACK', x: 6, y: bottom, w: 50, h: 16 },
            { id: 'garage', label: 'GARAGE', x: width - 146, y: bottom, w: 64, h: 16 },
            { id: 'race', label: 'RACE!', kind: 'primary', x: width - 76, y: bottom, w: 70, h: 16, disabled: !ready },
        ];
    }

    scene(ctx, size) {
        menuBackground(ctx, size, this.time);
        header(ctx, size, 'WEEKLY CHALLENGE', this.app.career.credits, this.app.icons);
        const { width, height } = size;
        const split = Math.round(width * 0.5);
        const top = HEADER_HEIGHT + 6;
        const h = height - top - 28;
        const rise = (1 - ease.outBack(progress(this.time, 0.05, 0.35))) * 20;
        panel(ctx, 6, top + rise, split - 10, h);
        panel(ctx, split + 2, top + rise, width - split - 8, h);
        if (this.#state === 'offline') {
            textCentered(ctx, 'ONLINE ONLY', width / 2, top + h / 2 - 10, { color: UI.gold, outline: UI.ink, scale: 2 });
            textCentered(ctx, 'PLAY IT ON THE PLATFORM', width / 2, top + h / 2 + 10, { color: UI.cream, outline: UI.ink });
            return;
        }
        if (!this.#week) {
            if (blink(this.time, 0.5)) textCentered(ctx, 'LOADING...', width / 2, top + h / 2, { color: UI.dim });
            return;
        }
        this.#track(ctx, { x: 6, y: top + rise, w: split - 10, h });
        this.#scores(ctx, { x: split + 2, y: top + rise, w: width - split - 8, h });
    }

    /** The week's track: its map, name, laps and weather. */
    #track(ctx, { x, y, w, h }) {
        const track = trackOf(this.#week.trackId);
        const mapHeight = Math.max(30, h - 34);
        const mapWidth = Math.min(w - 8, Math.round(mapHeight * 1.4));
        this.#map ??= new MiniMap(track, { width: mapWidth, height: mapHeight });
        this.#map.drawMap(ctx, x + (w - this.#map.width) / 2, y + 4);
        const line = y + mapHeight + 8;
        textCentered(ctx, track.name, x + w / 2, line, { color: UI.gold, outline: UI.ink });
        const weather = WEATHER[track.weather];
        ctx.drawImage(this.app.icons.flag[1], x + 6, line + 11);
        drawText(ctx, `${track.laps} LAPS`, x + 18, line + 12, { color: UI.cream });
        ctx.drawImage(this.app.icons[weather.icon][1], x + w / 2, line + 11);
        drawText(ctx, weather.name, x + w / 2 + 12, line + 12, { color: UI.cream });
    }

    /** The best of the week, the last run, and what the points are. */
    #scores(ctx, { x, y, w }) {
        const right = x + w - 6;
        drawText(ctx, `WEEK ${this.#week.weekId}`, x + 6, y + 6, { color: UI.dim });
        drawText(ctx, 'YOUR BEST', x + 6, y + 20, { color: UI.gold });
        const best = this.#week.best;
        drawText(ctx, 'TIME', x + 6, y + 31, { color: UI.dim });
        textRight(ctx, best ? formatTime(best.time) : '-:--.--', right, y + 31, { color: UI.cream });
        drawText(ctx, 'POINTS', x + 6, y + 41, { color: UI.dim });
        textRight(ctx, best ? String(best.score) : '---', right, y + 41, { color: UI.cream });
        if (this.#last) this.#lastRun(ctx, x, right, y + 58);
        else {
            textCentered(ctx, 'THE FASTER YOU ARE,', x + w / 2, y + 62, { color: UI.dim });
            textCentered(ctx, 'THE MORE POINTS', x + w / 2, y + 72, { color: UI.dim });
        }
    }

    #lastRun(ctx, x, right, y) {
        const last = this.#last;
        drawText(ctx, 'LAST RUN', x + 6, y, { color: UI.gold });
        if (last.time !== undefined) {
            drawText(ctx, 'TIME', x + 6, y + 11, { color: UI.dim });
            textRight(ctx, formatTime(last.time), right, y + 11, { color: UI.cream });
        }
        if (last.status !== 'scored') {
            const { text, color } = STATUS[last.status];
            drawText(ctx, text, x + 6, y + 22, { color });
            return;
        }
        drawText(ctx, 'POINTS', x + 6, y + 22, { color: UI.dim });
        textRight(ctx, String(last.score), right, y + 22, { color: UI.cream });
        if (last.newBest && blink(this.time, 0.6)) drawText(ctx, 'NEW BEST!', x + 6, y + 33, { color: UI.green, outline: UI.ink });
    }

    action(id) {
        if (id === 'back') this.back();
        else if (id === 'garage') this.app.show('garage', { challenge: true });
        else if (id === 'race') this.#start().catch((error) => this.#fail(error));
    }

    back() {
        this.app.show('worlds');
    }
}
