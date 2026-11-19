import { WEATHER } from '../config/Weather.js';
import { formatTime } from '../render/hud/RaceHud.js';
import { MiniMap } from '../render/hud/MiniMap.js';
import { drawText, LINE, textWidth } from '../render/PixelFont.js';
import { blink, ease, progress } from '../render/ui/ease.js';
import { drawAvatar } from '../render/ui/Avatars.js';
import { hits, panel, textCentered, textRight, UI } from '../render/ui/widgets.js';
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
 * (and kept at the bottom while it is not in sight). The standings scroll:
 * dragged, with the mouse wheel over them, or with the up and down keys; a
 * bar on their right says where, a gold line marks the last paid place.
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

/** The standings: where the rows start below the panel's top, their height, the portrait's size, the places paid in coins. */
export const BOARD = { top: 18, row: 12, avatar: 9, paid: 10 };
/** The track's facts under its map: the gap below the map, the line pitch, how many lines, the margin left at the bottom. */
const FACTS = { gap: 6, pitch: 11, lines: 5, margin: 6 };
/** The map's margin from the panel's top. */
const MAP_TOP = 4;
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

/** The two panels' top and height, for a frame `height` pixels tall (the buttons below). */
export function panels(height) {
    const top = HEADER_HEIGHT + RIBBON + 4;
    return { top, h: height - top - 28 };
}

/** How many standings rows fit in a panel `h` tall, inside its 2-pixel border. */
export function boardRoom(h) {
    return Math.floor((h - BOARD.top - 2) / BOARD.row);
}

/**
 * The left panel's column, offsets from its top: the map's height, then the
 * first line of the facts below it (the name; laps, time left and last run
 * follow a pitch apart); the map takes what the facts leave.
 */
export function trackLayout(h) {
    const facts = FACTS.gap + (FACTS.lines - 1) * FACTS.pitch + LINE + FACTS.margin;
    const map = Math.max(24, h - MAP_TOP - facts);
    return { map, line: MAP_TOP + map + FACTS.gap, pitch: FACTS.pitch };
}

/** Whether the player's own row is among the `room` rows from `scroll`. */
function mineInSight({ entries, me }, room, scroll) {
    const at = me.rank - 1;
    return at < entries.length && at >= scroll && at < scroll + room;
}

/**
 * The rows shown, `room` at most, from the `scroll`-th place on; the
 * player's own at the bottom while it is not among them (it takes the last
 * row's place).
 * @param {{entries: object[], me: object|null}} board
 */
export function boardRows(board, room, scroll = 0) {
    if (room <= 0) return [];
    const pinned = board.me !== null && board.me !== undefined && !mineInSight(board, room, scroll);
    const rows = board.entries.slice(scroll, scroll + (pinned ? room - 1 : room));
    if (pinned) rows.push(board.me);
    return rows;
}

/** How far the standings scroll: to the last place, with a row more when the player's own may sit at the bottom. */
export function maxScroll(board, room) {
    return Math.max(0, board.entries.length - room + (board.me ? 1 : 0));
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
    /** The first place in sight, and a drag going on: {y, scroll} where it began, or null. */
    #scroll = 0;
    #drag = null;
    /** The frame's size, as last drawn (presses and the wheel are told in its pixels). */
    #width = 0;
    #height = 0;

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
        if (!this.#active || !board) return;
        this.#board = board;
        this.#scrollTo(this.#scroll);
    }

    /** Where the standings stand on a frame of this size. */
    #boardBox({ width, height }) {
        const split = Math.round(width * 0.42);
        const { top, h } = panels(height);
        return { x: split + 2, y: top, w: width - split - 8, h };
    }

    /** Scrolls to the place `scroll` (kept within the standings). @returns {boolean} whether it moved */
    #scrollTo(scroll) {
        const room = boardRoom(panels(this.#height).h);
        // nothing drawn yet, or nothing to scroll: the first places
        const next = this.#board && room > 0 ? Math.max(0, Math.min(maxScroll(this.#board, room), scroll)) : 0;
        const moved = next !== this.#scroll;
        this.#scroll = next;
        return moved;
    }

    press(x, y) {
        const box = this.#boardBox({ width: this.#width, height: this.#height });
        this.#drag = hits(box, x, y) ? { y, scroll: this.#scroll } : null;
        return super.press(x, y);
    }

    drag(x, y) {
        if (this.#drag) this.#scrollTo(this.#drag.scroll + Math.round((this.#drag.y - y) / BOARD.row));
    }

    wheel(x, y, deltaY) {
        const box = this.#boardBox({ width: this.#width, height: this.#height });
        if (hits(box, x, y) && deltaY !== 0) this.#scrollTo(this.#scroll + Math.sign(deltaY));
    }

    key(action) {
        if (action !== 'up' && action !== 'down') {
            super.key(action);
            return;
        }
        if (this.#scrollTo(this.#scroll + (action === 'down' ? 1 : -1))) this.app.audio.play('move');
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
        this.#width = size.width;
        this.#height = size.height;
        menuBackground(ctx, size, this.time);
        header(ctx, size, 'WEEKLY CHALLENGE', this.app.career.credits, this.app.icons);
        const { width, height } = size;
        const split = Math.round(width * 0.42);
        this.#ribbon(ctx, size);
        const { top, h } = panels(height);
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
        const { map, line: first, pitch } = trackLayout(h);
        const mapWidth = Math.min(w - 8, Math.round(map * 1.4));
        this.#map ??= new MiniMap(track, { width: mapWidth, height: map });
        this.#map.drawMap(ctx, x + (w - this.#map.width) / 2, y + MAP_TOP);
        const line = y + first;
        textCentered(ctx, track.name, x + w / 2, line, { color: UI.gold, outline: UI.ink });
        const weather = WEATHER[track.weather];
        const facts = line + pitch;
        ctx.drawImage(this.app.icons.flag[1], x + 6, facts - 1);
        drawText(ctx, `${track.laps} LAPS`, x + 18, facts, { color: UI.cream });
        ctx.drawImage(this.app.icons[weather.icon][1], x + w / 2, facts - 1);
        drawText(ctx, weather.name, x + w / 2 + 12, facts, { color: UI.cream });
        drawText(ctx, 'ENDS IN', x + 6, facts + pitch, { color: UI.dim });
        textRight(ctx, endsIn(Date.now()), x + w - 6, facts + pitch, { color: UI.cream });
        this.#lastRun(ctx, { x, right: x + w - 6, y: facts + 2 * pitch, pitch });
    }

    /** The week's standings: place, portrait, Steem name, time; the player's row lit. */
    #standingsPanel(ctx, { x, y, w, h }) {
        const paid = `TOP ${BOARD.paid} WIN`;
        drawText(ctx, 'STANDINGS', x + 6, y + 5, { color: UI.gold });
        ctx.drawImage(this.app.icons.coin[1], x + w - 6 - textWidth(paid) - 11, y + 4);
        textRight(ctx, paid, x + w - 6, y + 5, { color: UI.dim });
        const top = y + BOARD.top;
        if (!this.#board) {
            if (blink(this.time, 0.5)) textCentered(ctx, 'LOADING...', x + w / 2, top + 20, { color: UI.dim });
            return;
        }
        const room = boardRoom(h);
        const rows = boardRows(this.#board, room, this.#scroll);
        if (rows.length === 0) {
            textCentered(ctx, 'NO TIMES YET:', x + w / 2, top + 16, { color: UI.cream });
            textCentered(ctx, 'BE THE FIRST!', x + w / 2, top + 27, { color: UI.gold });
            return;
        }
        // room on the right for the scroll bar when they scroll
        const bar = maxScroll(this.#board, room) > 0 ? 4 : 0;
        rows.forEach((row, i) => {
            const rowY = top + i * BOARD.row;
            this.#row(ctx, row, { x, y: rowY, w: w - bar });
            // the last paid place: a gold line under it, when a row follows
            if (row.rank === BOARD.paid && i < rows.length - 1) paidLine(ctx, x + 4, rowY + BOARD.row - 3, w - 12);
        });
        this.#scrollBar(ctx, { x: x + w - 6, top: top - 2, tall: room * BOARD.row - 1 }, room);
    }

    /** Where the standings are scrolled to: a thumb on a thin track, only when they do not all fit. */
    #scrollBar(ctx, { x, top, tall }, room) {
        const most = maxScroll(this.#board, room);
        if (most === 0) return;
        const thumb = Math.max(6, Math.round((tall * room) / (room + most)));
        ctx.fillStyle = UI.panelLight;
        ctx.fillRect(x, top, 2, tall);
        ctx.fillStyle = UI.gold;
        ctx.fillRect(x, top + Math.round(((tall - thumb) * this.#scroll) / most), 2, thumb);
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
    #lastRun(ctx, { x, right, y, pitch }) {
        const last = this.#last;
        if (!last) {
            drawText(ctx, 'FASTER: MORE POINTS', x + 6, y, { color: UI.dim });
            return;
        }
        drawText(ctx, 'LAST RUN', x + 6, y, { color: UI.gold });
        if (last.time !== undefined) textRight(ctx, formatTime(last.time), right, y, { color: UI.cream });
        if (last.status !== 'scored') {
            const { text, color } = STATUS[last.status];
            drawText(ctx, text, x + 6, y + pitch, { color });
            return;
        }
        const newBest = last.newBest && blink(this.time, 0.6);
        drawText(ctx, newBest ? 'NEW BEST!' : 'POINTS', x + 6, y + pitch, { color: newBest ? UI.green : UI.dim });
        textRight(ctx, String(last.score), right, y + pitch, { color: UI.cream });
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

/** A dashed gold line across the standings: the places above it are paid. */
function paidLine(ctx, x, y, w) {
    ctx.fillStyle = UI.goldDark;
    for (let dx = 0; dx < w; dx += 3) ctx.fillRect(x + dx, y, 2, 1);
}
