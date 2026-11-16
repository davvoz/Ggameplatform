import { WEATHER } from '../config/Weather.js';
import { WORLDS } from '../config/Worlds.js';
import { formatTime, ordinal } from '../render/hud/RaceHud.js';
import { MiniMap } from '../render/hud/MiniMap.js';
import { drawText } from '../render/PixelFont.js';
import { ease, progress } from '../render/ui/ease.js';
import { arrow, panel, textCentered, UI } from '../render/ui/widgets.js';
import { trackOf } from '../sim/setup.js';
import { header, HEADER_HEIGHT, menuBackground } from './backdrop.js';
import { MenuScreen } from './Screen.js';

/**
 * The tracks of a world: a list on the left (locked ones show a lock, raced
 * ones their best place), the chosen track's map and facts on the right,
 * and the way on: to the garage, or straight to the race.
 */
const ROW = { height: 17, gap: 3 };

export class TrackScreen extends MenuScreen {
    #world;
    #worldIndex;
    #selected;
    #maps = new Map();

    enter() {
        this.#worldIndex = this.params.worldIndex ?? 0;
        this.#world = WORLDS[this.#worldIndex];
        const career = this.app.career;
        const asked = this.#world.tracks.indexOf(this.params.trackId);
        const lastOpen = this.#world.tracks.findLastIndex((id) => career.isTrackOpen(id));
        this.#selected = asked >= 0 ? asked : Math.max(0, lastOpen);
        this.menu.setFocus('race');
    }

    get #trackId() {
        return this.#world.tracks[this.#selected];
    }

    #map(trackId, width, height) {
        const key = `${trackId}:${width}x${height}`;
        if (!this.#maps.has(key)) this.#maps.set(key, new MiniMap(trackOf(trackId), { width, height }));
        return this.#maps.get(key);
    }

    #listWidth(width) {
        return Math.round(Math.min(150, width * 0.44));
    }

    layout({ width, height }) {
        const listWidth = this.#listWidth(width);
        const open = this.app.career.isTrackOpen(this.#trackId);
        const rows = this.#world.tracks.map((id, i) => ({
            id: `track:${i}`,
            custom: true,
            x: 8,
            y: HEADER_HEIGHT + 8 + i * (ROW.height + ROW.gap),
            w: listWidth,
            h: ROW.height,
        }));
        const bottom = height - 22;
        return [
            ...rows,
            { id: 'back', label: 'BACK', x: 6, y: bottom, w: 50, h: 16 },
            { id: 'garage', label: 'GARAGE', x: width - 146, y: bottom, w: 64, h: 16, disabled: !open },
            { id: 'race', label: 'RACE!', kind: 'primary', x: width - 76, y: bottom, w: 70, h: 16, disabled: !open },
        ];
    }

    scene(ctx, size) {
        menuBackground(ctx, size, this.time);
        header(ctx, size, this.#world.name, this.app.career.credits, this.app.icons);
        this.menu.buttons.filter((b) => b.custom).forEach((row, i) => this.#row(ctx, row, i));
        this.#details(ctx, size);
    }

    #row(ctx, row, i) {
        const career = this.app.career;
        const trackId = this.#world.tracks[i];
        const track = trackOf(trackId);
        const open = career.isTrackOpen(trackId);
        const focused = this.menu.focus === row.id;
        const chosen = i === this.#selected;
        const slide = (1 - ease.outCubic(progress(this.time, 0.05 + i * 0.05, 0.3))) * -row.w;
        const x = row.x + slide;
        panel(ctx, x, row.y, row.w, row.h, { fill: chosen ? UI.panelLight : UI.panel, edge: focused ? UI.cream : UI.edge });
        drawText(ctx, `${i + 1}`, x + 5, row.y + 5, { color: UI.dim });
        drawText(ctx, track.name, x + 15, row.y + 5, { color: open ? UI.cream : UI.dim });
        const best = career.results[trackId]?.best;
        if (!open) ctx.drawImage(this.app.icons.lock[1], x + row.w - 13, row.y + 4);
        else if (best) drawText(ctx, ordinal(best), x + row.w - 24, row.y + 5, { color: best <= 3 ? UI.gold : UI.cream });
        if (focused && Math.floor(this.time * 3) % 2 === 0) arrow(ctx, x - 6, row.y + 6, UI.cream);
    }

    /** The chosen track: its map, laps, weather, best place and lap record. */
    #details(ctx, { width, height }) {
        const left = this.#listWidth(width) + 16;
        const w = width - left - 8;
        const top = HEADER_HEIGHT + 8;
        const h = height - top - 30;
        const appear = ease.outBack(progress(this.time, 0.1, 0.35));
        const y = top + (1 - appear) * 20;
        panel(ctx, left, y, w, h);

        const trackId = this.#trackId;
        const track = trackOf(trackId);
        const mapHeight = Math.max(30, h - 40);
        const mapWidth = Math.min(w - 8, Math.round(mapHeight * 1.4));
        this.#map(trackId, mapWidth, mapHeight).drawMap(ctx, left + (w - mapWidth) / 2, y + 4);

        const icons = this.app.icons;
        const weather = WEATHER[track.weather];
        const record = this.app.career.results[trackId];
        const line = y + mapHeight + 9;
        ctx.drawImage(icons.flag[1], left + 6, line - 1);
        drawText(ctx, `${track.laps} LAPS`, left + 18, line, { color: UI.cream });
        ctx.drawImage(icons[weather.icon][1], left + w / 2, line - 1);
        drawText(ctx, weather.name, left + w / 2 + 12, line, { color: UI.cream });
        drawText(ctx, `BEST ${record ? ordinal(record.best) : '---'}`, left + 6, line + 12, { color: UI.dim });
        drawText(ctx, `LAP ${formatTime(record?.bestLap)}`, left + w / 2, line + 12, { color: UI.dim });
        if (!this.app.career.isTrackOpen(trackId)) {
            textCentered(ctx, 'PODIUM THE TRACK BEFORE', left + w / 2, y + mapHeight / 2, { color: UI.gold, outline: UI.ink });
        }
    }

    action(id) {
        if (id.startsWith('track:')) {
            this.#selected = Number(id.slice(6));
            return;
        }
        if (id === 'back') this.back();
        else if (id === 'garage') this.app.show('garage', { trackId: this.#trackId, worldIndex: this.#worldIndex });
        else if (id === 'race') this.app.show('race', { trackId: this.#trackId, worldIndex: this.#worldIndex });
    }

    back() {
        this.app.show('worlds', { worldIndex: this.#worldIndex });
    }
}
