import { LEVELS } from '../config/Sounds.js';
import { drawText } from '../render/PixelFont.js';
import { ease, progress } from '../render/ui/ease.js';
import { panel, segmentBar, textCentered, UI } from '../render/ui/widgets.js';
import { Menu } from './Menu.js';

/**
 * The SOUND panel, over the title or the pause menu: the volume of the
 * effects and of the music (- and +, or a tap on the bar), sound on or off,
 * BACK. Each change is heard at once (a blip at the new effects volume, the
 * music playing on) and remembered by `app.setVolume` / `app.toggleSound`.
 *
 * The screen that shows it hands it its presses and keys while it is open.
 */
const WIDTH = 160;
const HEIGHT = 116;
const ROWS = [
    { kind: 'effects', label: 'EFFECTS', top: 30 },
    { kind: 'music', label: 'MUSIC', top: 50 },
];
const STEP = { w: 14, h: 13, down: 55, up: 140 };
const BAR = { left: 73, width: 60, drop: 4 };
const FADE = 0.2;

export class SoundPanel {
    open = false;
    #app;
    #menu = new Menu();
    #openedAt = 0;
    /** Top left corner of the panel, as last drawn. */
    #origin = { x: 0, y: 0 };

    /** @param {import('./Screen.js').App} app */
    constructor(app) {
        this.#app = app;
    }

    show(time) {
        this.open = true;
        this.#openedAt = time;
        this.#menu.show(time);
        this.#menu.setFocus('effects:up');
    }

    draw(ctx, { width, height }, time) {
        const shade = ease.outCubic(progress(time, this.#openedAt, FADE));
        ctx.fillStyle = `rgba(10, 6, 24, ${0.7 * shade})`;
        ctx.fillRect(0, 0, width, height);
        const x = Math.round(width / 2 - WIDTH / 2);
        const y = Math.round(height / 2 - HEIGHT / 2);
        this.#origin = { x, y };
        panel(ctx, x, y, WIDTH, HEIGHT);
        textCentered(ctx, 'SOUND', width / 2, y + 8, { color: UI.gold, outline: UI.ink, scale: 2 });
        const volumes = this.#app.audio.volumes;
        const color = this.#app.audio.muted ? UI.dim : UI.gold;
        for (const row of ROWS) {
            drawText(ctx, row.label, x + 8, y + row.top + 3, { color: UI.cream });
            segmentBar(ctx, x + BAR.left, y + row.top + BAR.drop, BAR.width, { fill: volumes[row.kind] / LEVELS.steps, count: LEVELS.steps, color });
        }
        this.#menu.set(this.#buttons(x, y));
        this.#menu.draw(ctx, time, this.#app.icons);
    }

    press(px, py, time) {
        const bar = this.#barAt(px, py);
        if (bar) {
            const segment = BAR.width / LEVELS.steps;
            this.#setVolume(bar.kind, Math.floor((px - bar.x) / segment) + 1);
            return;
        }
        const id = this.#menu.press(px, py, time);
        if (id) this.#act(id);
        else if (!this.#inside(px, py)) this.#close();
    }

    key(action, time) {
        if (action === 'back' || action === 'pause') {
            this.#close();
            return;
        }
        const before = this.#menu.focus;
        const id = this.#menu.key(action, time);
        if (id) this.#act(id);
        else if (this.#menu.focus !== before) this.#app.audio.play('move');
    }

    #buttons(x, y) {
        const muted = this.#app.audio.muted;
        const steps = ROWS.flatMap(({ kind, top }) => [
            { id: `${kind}:down`, label: '-', x: x + STEP.down, y: y + top, w: STEP.w, h: STEP.h },
            { id: `${kind}:up`, label: '+', x: x + STEP.up, y: y + top, w: STEP.w, h: STEP.h },
        ]);
        return [
            ...steps,
            { id: 'mute', label: muted ? 'SOUND OFF' : 'SOUND ON', icon: muted ? 'mute' : 'sound', x: x + 8, y: y + 72, w: WIDTH - 16, h: 16 },
            { id: 'close', label: 'BACK', kind: 'primary', x: x + 8, y: y + 92, w: WIDTH - 16, h: 16 },
        ];
    }

    #act(id) {
        if (id === 'close') {
            this.#close();
        } else if (id === 'mute') {
            this.#app.toggleSound();
            this.#app.audio.play('confirm');
        } else {
            const [kind, way] = id.split(':');
            this.#setVolume(kind, this.#app.audio.volumes[kind] + (way === 'up' ? 1 : -1));
        }
    }

    #setVolume(kind, step) {
        this.#app.setVolume(kind, step);
        this.#app.audio.play('move');
    }

    #close() {
        this.open = false;
        this.#app.audio.play('back');
    }

    /** The bar row under a point, with the bar's left edge. */
    #barAt(px, py) {
        const { x, y } = this.#origin;
        const left = x + BAR.left;
        if (px < left || px >= left + BAR.width) return null;
        const row = ROWS.find(({ top }) => py >= y + top && py < y + top + STEP.h);
        return row ? { kind: row.kind, x: left } : null;
    }

    #inside(px, py) {
        const { x, y } = this.#origin;
        return px >= x && px < x + WIDTH && py >= y && py < y + HEIGHT;
    }
}
