import { WEATHER } from '../config/Weather.js';
import { formatTime } from '../render/hud/RaceHud.js';
import { MiniMap } from '../render/hud/MiniMap.js';
import { drawText, textWidth } from '../render/PixelFont.js';
import { blink, ease, progress } from '../render/ui/ease.js';
import { drawAvatar } from '../render/ui/Avatars.js';
import { panel, textCentered, textRight, UI } from '../render/ui/widgets.js';
import { trackOf } from '../sim/setup.js';
import { header, HEADER_HEIGHT, menuBackground } from './backdrop.js';
import { MenuScreen } from './Screen.js';

/**
 * The weekly challenge: one track for everybody, new every Monday, raced
 * with one's own car against the same rivals; the faster, the more points
 * on the platform's weekly leaderboard (the ribbon on top says so, or tells
 * a guest how to be on it). The track's map and facts, the time left in the
 * week and the last run on the left; the week's standings on the right,
 * every driver with their Steem name and avatar, the player's own row lit
 * (and shown at the bottom when beyond the first ones).
 *
 * The server says which track, starts every run, checks every time and
 * ranks the drivers (app.sync). Back from a run (params.run, params.result)
 * the time is sent, its points shown and the standings fetched again;
 * params.go starts a run as soon as the week is known.
 */
/** What the last run's panel says while a time is sent, or when it counts for nothing. */
const STATUS = {
    sending: { text: 'SENDING...', color: UI.dim },
    dnf: { text: 'DID NOT FINISH', color: UI.red },
    refused: { text: 'NOT COUNTED', color: UI.red },
};

/** The standings' rows: their height, the portrait's size, and the places paid in coins on the platform. */
const BOARD = { row: 12, avatar: 9, paid: 10 };
const RIBBON = 13;
const DAY = 24 * 3600 * 1000;
const HOUR = 3600 * 1000;

/** Time left until the week ends (Monday 00:00 UTC, when the platform's leaderboard resets): '3D 4H', '5H 12M'. */
export function endsIn(nowMs) {
    const now = new Date(nowMs);
    const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const daysToMonday = (8 - now.getUTCDay()) % 7 || 7;
    const left = midnight + daysToMonday * DAY - nowMs;
    const hours = Math.floor(left / HOUR);
    if (hours >= 24) return `${Math.floor(hours / 24)}D ${hours % 24}H`;
    return `${hours}H ${Math.floor((left % HOUR) / 60000)}M`;
}

/**
 * The rows shown, `room` at most: the first places, and the player's own at
 * the bottom when it is beyond them (it takes the last row's place).
 * @param {{entries: object[], me: object|null}} board
 */
export function boardRows(board, room) {
    const rows = board.entries.slice(0, room);
    const mine = board.me;
    if (mine && room > 0 && !rows.some((row) => row.me)) rows.splice(room - 1, rows.length, mine);
    return rows;
}

export class ChallengeScreen extends MenuScreen {
    /** This week, from the server: {weekId, trackId, laps, seed, best}; null until known. */
    #week = null;
    /** This week's standings, from the server; null until known. */
    #board = null;
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
        await this.#standings();
        if (go && !run) await this.#start();
    }

    async #standings() {
        const board = await this.app.sync.leaderboard();
        if (this.#active && board) this.#board = board;
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
        this.#board = null;
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
        const split = Math.round(width * 0.42);
        this.#ribbon(ctx, size);
        const top = HEADER_HEIGHT + RIBBON + 4;
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
        this.#standingsPanel(ctx, { x: split + 2, y: top + rise, w: width - split - 8, h });
    }

    /** What the challenge is worth: the platform's weekly leaderboard; a guest is told how to be on it. */
    #ribbon(ctx, { width }) {
        const y = HEADER_HEIGHT + 3;
        ctx.fillStyle = UI.shade;
        ctx.fillRect(0, y - 2, width, RIBBON - 1);
        const ranked = this.app.player.ranked;
        const text = ranked ? 'COUNTS ON THE CUR8 WEEKLY LEADERBOARD' : 'GUEST: SIGN IN WITH STEEM TO BE RANKED';
        textCentered(ctx, text, width / 2, y, { color: ranked ? UI.gold : UI.red, outline: UI.ink });
    }

    /** The week's track: its map, name, laps and weather; the time left in the week and the last run. */
    #track(ctx, { x, y, w, h }) {
        const track = trackOf(this.#week.trackId);
        const mapHeight = Math.max(24, h - 58);
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
        drawText(ctx, 'ENDS IN', x + 6, line + 24, { color: UI.dim });
        textRight(ctx, endsIn(Date.now()), x + w - 6, line + 24, { color: UI.cream });
        this.#lastRun(ctx, x, x + w - 6, line + 35);
    }

    /** The week's standings: place, portrait, Steem name, time; the player's row lit. */
    #standingsPanel(ctx, { x, y, w, h }) {
        const paid = `TOP ${BOARD.paid} WIN`;
        drawText(ctx, 'STANDINGS', x + 6, y + 5, { color: UI.gold });
        ctx.drawImage(this.app.icons.coin[1], x + w - 6 - textWidth(paid) - 11, y + 4);
        textRight(ctx, paid, x + w - 6, y + 5, { color: UI.dim });
        const top = y + 18;
        if (!this.#board) {
            if (blink(this.time, 0.5)) textCentered(ctx, 'LOADING...', x + w / 2, top + 20, { color: UI.dim });
            return;
        }
        const rows = boardRows(this.#board, Math.floor((h - 20) / BOARD.row));
        if (rows.length === 0) {
            textCentered(ctx, 'NO TIMES YET:', x + w / 2, top + 16, { color: UI.cream });
            textCentered(ctx, 'BE THE FIRST!', x + w / 2, top + 27, { color: UI.gold });
            return;
        }
        rows.forEach((row, i) => this.#row(ctx, row, { x, y: top + i * BOARD.row, w }));
    }

    /** One driver: place (the podium in gold), portrait, name cut to fit, best time. */
    #row(ctx, row, { x, y, w }) {
        if (row.me) {
            ctx.fillStyle = UI.panelLight;
            ctx.fillRect(x + 3, y - 2, w - 6, BOARD.row - 1);
        }
        textRight(ctx, String(row.rank), x + 21, y, { color: row.rank <= 3 ? UI.gold : UI.dim });
        drawAvatar(ctx, this.app.avatars, row, x + 25, y - 1, BOARD.avatar);
        const time = formatTime(row.time);
        const name = x + 25 + BOARD.avatar + 4;
        const room = Math.floor((x + w - 6 - textWidth(time) - 6 - name) / 6);
        const color = row.me ? UI.gold : UI.cream;
        drawText(ctx, row.name.slice(0, Math.max(3, room)), name, y, { color });
        textRight(ctx, time, x + w - 6, y, { color });
    }

    /** The last run, in two lines: its time and points (or why it does not count). */
    #lastRun(ctx, x, right, y) {
        const last = this.#last;
        if (!last) {
            drawText(ctx, 'FASTER: MORE POINTS', x + 6, y, { color: UI.dim });
            return;
        }
        drawText(ctx, 'LAST RUN', x + 6, y, { color: UI.gold });
        if (last.time !== undefined) textRight(ctx, formatTime(last.time), right, y, { color: UI.cream });
        if (last.status !== 'scored') {
            const { text, color } = STATUS[last.status];
            drawText(ctx, text, x + 6, y + 11, { color });
            return;
        }
        const newBest = last.newBest && blink(this.time, 0.6);
        drawText(ctx, newBest ? 'NEW BEST!' : 'POINTS', x + 6, y + 11, { color: newBest ? UI.green : UI.dim });
        textRight(ctx, String(last.score), right, y + 11, { color: UI.cream });
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
