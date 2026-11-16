import { THEMES } from '../config/Themes.js';
import { WORLDS } from '../config/Worlds.js';
import { drawText } from '../render/PixelFont.js';
import { ease, progress } from '../render/ui/ease.js';
import { paintWorldCard } from '../render/ui/WorldCard.js';
import { arrow, panel, textCentered, UI } from '../render/ui/widgets.js';
import { header, menuBackground } from './backdrop.js';
import { MenuScreen } from './Screen.js';

/**
 * The world select: one postcard per world, left and right to browse
 * (they slide), its tracks won so far, a lock on the ones still closed.
 * The weekly challenge opens from here too.
 */
const CARD = { maxWidth: 190, height: 108, top: 26, art: 66 };
const SLIDE = 0.3;

export class WorldScreen extends MenuScreen {
    #index = 0;
    #slideFrom = 0;
    #slideAt = -1;
    #cards = new Map();

    enter() {
        this.#index = this.params.worldIndex ?? 0;
        this.menu.setFocus('enter');
    }

    #card(world, width) {
        const key = `${world.id}:${width}`;
        if (!this.#cards.has(key)) this.#cards.set(key, paintWorldCard(THEMES[world.theme], width, CARD.art));
        return this.#cards.get(key);
    }

    layout({ width, height }) {
        const w = Math.min(CARD.maxWidth, width - 64);
        const x = Math.round(width / 2 - w / 2);
        const many = WORLDS.length > 1;
        const open = this.app.career.isWorldOpen(this.#index);
        return [
            { id: 'enter', custom: true, x, y: CARD.top, w, h: CARD.height, disabled: !open },
            ...(many ? [
                { id: 'prev', label: '<', x: x - 26, y: CARD.top + CARD.height / 2 - 9, w: 18, h: 18, disabled: this.#index === 0 },
                { id: 'next', label: '>', x: x + w + 8, y: CARD.top + CARD.height / 2 - 9, w: 18, h: 18, disabled: this.#index === WORLDS.length - 1 },
            ] : []),
            { id: 'back', label: 'BACK', x: 6, y: height - 22, w: 52, h: 16 },
            { id: 'challenge', label: 'CHALLENGE', icon: 'trophy', x: Math.round(width / 2 - 46), y: height - 22, w: 92, h: 16 },
            { id: 'go', label: 'SELECT', kind: 'primary', x: width - 76, y: height - 22, w: 70, h: 16, disabled: !open },
        ];
    }

    scene(ctx, size) {
        menuBackground(ctx, size, this.time);
        header(ctx, size, 'SELECT WORLD', this.app.career.credits, this.app.icons);
        const card = this.menu.buttons[0];
        const slide = ease.outCubic(progress(this.time, this.#slideAt, SLIDE));
        const shift = this.#slideAt < 0 ? 0 : (1 - slide) * (this.#slideFrom - this.#index) * -card.w * 0.6;
        const rise = (1 - ease.outBack(progress(this.time, 0.05, 0.35))) * 30;
        this.#drawCard(ctx, WORLDS[this.#index], this.#index, { ...card, x: card.x + shift, y: card.y + rise });
        this.#dots(ctx, size);
    }

    #drawCard(ctx, world, index, box) {
        const focused = this.menu.focus === 'enter';
        panel(ctx, box.x, box.y, box.w, box.h, { fill: UI.panel, edge: focused ? UI.cream : UI.edge });
        ctx.drawImage(this.#card(world, box.w - 6), Math.round(box.x + 3), Math.round(box.y + 3));
        textCentered(ctx, world.name, box.x + box.w / 2, box.y + CARD.art + 8, { color: UI.gold, outline: UI.ink });

        const career = this.app.career;
        if (!career.isWorldOpen(index)) {
            this.#locked(ctx, box, WORLDS[index - 1]);
            return;
        }
        const won = world.tracks.filter((id) => career.podium(id)).length;
        const line = `${won}/${world.tracks.length} PODIUMS`;
        const icons = this.app.icons;
        const left = Math.round(box.x + box.w / 2 - (line.length * 6 + 11) / 2);
        ctx.drawImage(icons.trophy[1], left, box.y + CARD.art + 19);
        drawText(ctx, line, left + 12, box.y + CARD.art + 20, { color: UI.cream, outline: UI.ink });
        if (focused && Math.floor(this.time * 3) % 2 === 0) arrow(ctx, box.x - 6, box.y + box.h / 2 - 3, UI.cream);
    }

    #locked(ctx, box, before) {
        ctx.fillStyle = 'rgba(10, 6, 24, 0.7)';
        ctx.fillRect(box.x + 3, box.y + 3, box.w - 6, CARD.art);
        ctx.drawImage(this.app.icons.lock[2], Math.round(box.x + box.w / 2 - 9), box.y + 3 + CARD.art / 2 - 9);
        textCentered(ctx, `PODIUM ALL OF ${before.name}`, box.x + box.w / 2, box.y + CARD.art + 20, { color: UI.dim, outline: UI.ink });
    }

    /** One dot per world under the card, the shown one lit. */
    #dots(ctx, { width }) {
        if (WORLDS.length < 2) return;
        const y = CARD.top + CARD.height + 6;
        const left = Math.round(width / 2 - (WORLDS.length * 6) / 2);
        WORLDS.forEach((_, i) => {
            ctx.fillStyle = i === this.#index ? UI.gold : UI.edge;
            ctx.fillRect(left + i * 6, y, 4, 4);
        });
    }

    #browse(step) {
        const next = this.#index + step;
        if (next < 0 || next >= WORLDS.length) return;
        this.#slideFrom = this.#index;
        this.#slideAt = this.time;
        this.#index = next;
        this.app.audio.play('move');
    }

    key(action) {
        // left and right browse the worlds wherever the focus is
        if (action === 'left' || action === 'right') {
            this.#browse(action === 'left' ? -1 : 1);
            return;
        }
        super.key(action);
    }

    action(id) {
        if (id === 'prev') this.#browse(-1);
        else if (id === 'next') this.#browse(1);
        else if (id === 'back') this.back();
        else if (id === 'challenge') this.app.show('challenge');
        else if (this.app.career.isWorldOpen(this.#index)) this.app.show('tracks', { worldIndex: this.#index });
    }

    back() {
        this.app.show('title');
    }
}
