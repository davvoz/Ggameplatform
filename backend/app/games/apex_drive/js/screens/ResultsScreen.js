import { formatTime, ordinal } from '../render/hud/RaceHud.js';
import { drawText } from '../render/PixelFont.js';
import { blink, countUp, ease, progress } from '../render/ui/ease.js';
import { panel, textCentered, textRight, UI } from '../render/ui/widgets.js';
import { trackOf } from '../sim/setup.js';
import { header, HEADER_HEIGHT, menuBackground } from './backdrop.js';
import { MenuScreen } from './Screen.js';

/**
 * After the flag: the place lands big (a trophy and confetti on the podium),
 * the standings slide in row by row, the prize and the pickups are counted
 * into the credits, records and newly opened tracks are announced.
 * Then: race again, the garage, or on to the next track.
 */
const TIMES = { place: 0.2, rows: 0.6, rowStagger: 0.1, money: 1.3, count: 1.2, unlock: 2.8 };
const CONFETTI = ['#ffd34a', '#e8303c', '#5ad8ff', '#3ccf6a', '#f2eef6'];

export class ResultsScreen extends MenuScreen {
    enter() {
        this.menu.setFocus(this.#nextTrack() ? 'next' : 'garage');
        this.app.audio.play(this.params.result.position <= 3 ? 'podium' : 'noPodium');
    }

    #nextTrack() {
        return this.app.career.nextTrack(this.params.trackId);
    }

    layout({ width, height }) {
        const bottom = height - 22;
        const next = this.#nextTrack();
        return [
            { id: 'retry', label: 'RETRY', x: 6, y: bottom, w: 56, h: 16 },
            { id: 'garage', label: 'GARAGE', x: Math.round(width / 2 - 34), y: bottom, w: 68, h: 16 },
            { id: next ? 'next' : 'tracks', label: next ? 'NEXT RACE' : 'TRACKS', kind: 'primary', x: width - 82, y: bottom, w: 76, h: 16 },
        ];
    }

    scene(ctx, size) {
        menuBackground(ctx, size, this.time);
        const { result, payout, creditsBefore } = this.params;
        const shown = countUp(this.time, TIMES.money + TIMES.count, TIMES.count, creditsBefore, creditsBefore + payout.total);
        header(ctx, size, `RESULTS  ${trackOf(this.params.trackId).name}`, shown, this.app.icons);
        this.#place(ctx, size, result.position);
        this.#standings(ctx, size, result);
        this.#money(ctx, size, result, payout);
        if (result.position === 1) this.#confetti(ctx, size);
    }

    /** The place, landing from big to its size, with a trophy on the podium. */
    #place(ctx, { width }, position) {
        const t = progress(this.time, TIMES.place, 0.4);
        if (t <= 0) return;
        const scale = Math.max(4, Math.round(8 - 4 * ease.outCubic(t)));
        const podium = position <= 3;
        const x = Math.round(width * 0.27);
        textCentered(ctx, ordinal(position), x, HEADER_HEIGHT + 8, { color: podium ? UI.gold : UI.cream, outline: UI.ink, scale });
        if (podium && t >= 1) ctx.drawImage(this.app.icons.trophy[2], x - 9, HEADER_HEIGHT + 40);
        const line = podium ? 'PODIUM!' : 'KEEP PUSHING';
        if (t >= 1) textCentered(ctx, line, x, HEADER_HEIGHT + 62, { color: podium ? UI.gold : UI.dim, outline: UI.ink });
    }

    #standings(ctx, { width, height }, result) {
        const x = 6;
        const y = HEADER_HEIGHT + 74;
        const w = Math.round(width * 0.54) - 8;
        panel(ctx, x, y, w, height - y - 28);
        result.standings.forEach((row, i) => {
            const t = ease.outCubic(progress(this.time, TIMES.rows + i * TIMES.rowStagger, 0.25));
            if (t <= 0) return;
            const rowY = y + 5 + i * 9;
            const left = x + 5 - Math.round((1 - t) * 40);
            const color = row.isPlayer ? UI.gold : UI.cream;
            drawText(ctx, `${i + 1}`, left, rowY, { color: UI.dim });
            drawText(ctx, row.name, left + 12, rowY, { color });
            textRight(ctx, row.time === null ? '--' : formatTime(row.time), x + w - 5, rowY, { color });
        });
    }

    #money(ctx, { width, height }, result, payout) {
        const x = Math.round(width * 0.54) + 2;
        const w = width - x - 6;
        const y = HEADER_HEIGHT + 4;
        panel(ctx, x, y, w, height - y - 28);
        const lines = [
            ['PRIZE', payout.prize],
            ['PICKUPS', payout.cash],
            ['TOTAL', payout.total],
        ];
        lines.forEach(([label, value], i) => {
            const start = TIMES.money + i * 0.25;
            if (this.time < start) return;
            const rowY = y + 6 + i * 11;
            drawText(ctx, label, x + 6, rowY, { color: i === 2 ? UI.gold : UI.dim });
            textRight(ctx, `+${countUp(this.time, start, 0.6, 0, value)}`, x + w - 6, rowY, { color: i === 2 ? UI.gold : UI.cream });
        });
        const lapY = y + 44;
        drawText(ctx, 'BEST LAP', x + 6, lapY, { color: UI.dim });
        textRight(ctx, formatTime(result.bestLap), x + w - 6, lapY, { color: UI.cream });
        if (payout.newLap && blink(this.time, 0.6)) textCentered(ctx, 'NEW LAP RECORD!', x + w / 2, lapY + 11, { color: UI.green, outline: UI.ink });
        this.#unlocks(ctx, x, w, lapY + 26, payout.unlocked);
    }

    /** Tracks (and worlds) the race opened, announced one after the other. */
    #unlocks(ctx, x, w, y, unlocked) {
        unlocked.forEach((trackId, i) => {
            const t = ease.outBack(progress(this.time, TIMES.unlock + i * 0.5, 0.35));
            if (t <= 0) return;
            const entry = this.app.career.tracks().find((e) => e.trackId === trackId);
            const opensWorld = entry.index === 0;
            const rowY = y + i * 20 + Math.round((1 - t) * 10);
            panel(ctx, x + 4, rowY, w - 8, 18, { fill: UI.panelLight, edge: UI.gold });
            textCentered(ctx, opensWorld ? 'NEW WORLD OPEN!' : 'NEW TRACK OPEN!', x + w / 2, rowY + 2, { color: UI.gold });
            textCentered(ctx, opensWorld ? entry.world.name : trackOf(trackId).name, x + w / 2, rowY + 10, { color: UI.cream });
        });
    }

    /** Pixels of colour tumbling down from the top, for a win. */
    #confetti(ctx, { width, height }) {
        for (let i = 0; i < 40; i++) {
            const speed = 30 + ((i * 37) % 40);
            const y = ((this.time * speed + i * 23) % (height + 20)) - 10;
            const x = (i * 53) % width + Math.sin(this.time * 3 + i) * 4;
            ctx.fillStyle = CONFETTI[i % CONFETTI.length];
            ctx.fillRect(Math.round(x), Math.round(y), 2, i % 3 === 0 ? 1 : 2);
        }
    }

    action(id) {
        const { trackId, worldIndex } = this.params;
        if (id === 'retry') this.app.show('race', { trackId, worldIndex });
        else if (id === 'garage') this.app.show('garage', { trackId, worldIndex });
        else if (id === 'next') this.app.show('tracks', { trackId: this.#nextTrack(), worldIndex: this.#worldOf(this.#nextTrack()) });
        else this.back();
    }

    #worldOf(trackId) {
        return this.app.career.tracks().find((e) => e.trackId === trackId)?.worldIndex ?? 0;
    }

    back() {
        this.app.show('tracks', { trackId: this.params.trackId, worldIndex: this.params.worldIndex });
    }
}
