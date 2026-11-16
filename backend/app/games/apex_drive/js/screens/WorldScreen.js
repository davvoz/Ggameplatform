import { THEMES } from '../config/Themes.js';
import { WORLDS } from '../config/Worlds.js';
import { drawText, textWidth } from '../render/PixelFont.js';
import { paintChallengeCard } from '../render/ui/ChallengeCard.js';
import { ease, progress } from '../render/ui/ease.js';
import { paintWorldCard } from '../render/ui/WorldCard.js';
import { arrow, drawButton, hits, panel, textCentered, UI } from '../render/ui/widgets.js';
import { endsIn } from './ChallengeScreen.js';
import { header, menuBackground } from './backdrop.js';
import { MenuScreen } from './Screen.js';

/**
 * Where a race starts: two cards as big as each other, half the screen
 * each. On the left the career, one postcard per world (the arrows on it,
 * or left and right, browse them; they slide), its podiums so far, a lock
 * on the worlds still closed. On the right the weekly challenge, the
 * ranked mode: the card says it is for the weekly leaderboard, what it
 * pays and when the week ends (to a guest, that only Steem players rank).
 */
const CARD = { top: 26, height: 108, art: 66, margin: 6, gap: 8, strip: 11 };
const NAV = { w: 12, h: 16, inset: 5 };
/** The card's button: gold, lighter when focused; dark on a closed world. */
const STRIP = { lit: '#ffe27a', closed: { fill: '#2a2440', edge: '#3a3258' } };
const SLIDE = 0.3;

export class WorldScreen extends MenuScreen {
    #index = 0;
    #slideFrom = 0;
    #slideAt = -1;
    #cards = new Map();
    /** The arrows on the career card, laid out with the buttons: {x, y, w, h, label, step, disabled}. */
    #nav = [];

    enter() {
        this.#index = this.params.worldIndex ?? 0;
        this.menu.setFocus('enter');
    }

    /** A card's art, painted once per size: a world's postcard, or the challenge's ('challenge'). */
    #art(key, width, paint) {
        const id = `${key}:${width}`;
        if (!this.#cards.has(id)) this.#cards.set(id, paint());
        return this.#cards.get(id);
    }

    layout({ width, height }) {
        const w = Math.floor((width - CARD.margin * 2 - CARD.gap) / 2);
        const career = { id: 'enter', custom: true, x: CARD.margin, y: CARD.top, w, h: CARD.height };
        const middle = CARD.top + 3 + CARD.art / 2 - NAV.h / 2;
        this.#nav = WORLDS.length > 1 ? [
            { id: 'prev', label: '<', step: -1, x: career.x + NAV.inset, y: middle, w: NAV.w, h: NAV.h, disabled: this.#index === 0 },
            { id: 'next', label: '>', step: 1, x: career.x + w - NAV.inset - NAV.w, y: middle, w: NAV.w, h: NAV.h, disabled: this.#index === WORLDS.length - 1 },
        ] : [];
        return [
            career,
            { id: 'challenge', custom: true, x: width - CARD.margin - w, y: CARD.top, w, h: CARD.height },
            { id: 'back', label: 'BACK', x: 6, y: height - 22, w: 52, h: 16 },
        ];
    }

    scene(ctx, size) {
        menuBackground(ctx, size, this.time);
        header(ctx, size, 'SELECT RACE', this.app.career.credits, this.app.icons);
        const [career, challenge] = this.menu.buttons;
        const rise = (index) => (1 - ease.outBack(progress(this.time, 0.05 + index * 0.06, 0.35))) * 30;
        this.#careerCard(ctx, { ...career, y: career.y + rise(0) });
        this.#challengeCard(ctx, { ...challenge, y: challenge.y + rise(1) });
        this.#dots(ctx, career);
    }

    /** The career card: the world shown sliding in, clipped to the card. */
    #careerCard(ctx, box) {
        const slide = ease.outCubic(progress(this.time, this.#slideAt, SLIDE));
        const shift = this.#slideAt < 0 ? 0 : (1 - slide) * (this.#slideFrom - this.#index) * -box.w * 0.6;
        ctx.save();
        ctx.beginPath();
        ctx.rect(box.x - 6, box.y - 2, box.w + 8, box.h + 4);
        ctx.clip();
        this.#worldCard(ctx, this.#index, { ...box, x: box.x + shift });
        ctx.restore();
        for (const nav of this.#nav) {
            if (!nav.disabled) drawButton(ctx, { ...nav, y: nav.y + box.y - CARD.top }, { focused: false, pressed: false, appear: 1, time: this.time });
        }
    }

    #worldCard(ctx, index, box) {
        const world = WORLDS[index];
        const focused = this.#frame(ctx, 'enter', box);
        ctx.drawImage(this.#art(world.id, box.w - 6, () => paintWorldCard(THEMES[world.theme], box.w - 6, CARD.art)), Math.round(box.x + 3), Math.round(box.y + 3));
        const line = box.y + CARD.art + 7;
        textCentered(ctx, world.name, box.x + box.w / 2, line, { color: UI.gold, outline: UI.ink });
        const career = this.app.career;
        const open = career.isWorldOpen(index);
        if (open) {
            const won = world.tracks.filter((id) => career.podium(id)).length;
            this.#iconLine(ctx, 'trophy', `${won}/${world.tracks.length} PODIUMS`, box, line + 11, UI.cream);
        } else {
            this.#locked(ctx, box, WORLDS[index - 1]);
        }
        this.#strip(ctx, open ? 'CAREER' : 'LOCKED', box, { focused, open });
    }

    #locked(ctx, box, before) {
        ctx.fillStyle = 'rgba(10, 6, 24, 0.7)';
        ctx.fillRect(box.x + 3, box.y + 3, box.w - 6, CARD.art);
        ctx.drawImage(this.app.icons.lock[2], Math.round(box.x + box.w / 2 - 9), box.y + 10);
        textCentered(ctx, 'PODIUM ALL OF', box.x + box.w / 2, box.y + 36, { color: UI.dim, outline: UI.ink });
        textCentered(ctx, before.name, box.x + box.w / 2, box.y + 47, { color: UI.cream, outline: UI.ink });
        textCentered(ctx, 'TO OPEN', box.x + box.w / 2, box.y + CARD.art + 18, { color: UI.dim, outline: UI.ink });
    }

    /** The challenge card: for the weekly leaderboard, what it pays, when the week ends. */
    #challengeCard(ctx, box) {
        const focused = this.#frame(ctx, 'challenge', box);
        const { canvas, top } = this.#art('challenge', box.w - 6, () => paintChallengeCard(box.w - 6, CARD.art));
        const x = Math.round(box.x + 3);
        const y = Math.round(box.y + 3);
        ctx.drawImage(canvas, x, y);
        const trophy = this.app.icons.trophy[2];
        const bob = Math.round(Math.sin(this.time * 3) * 1.5);
        ctx.drawImage(trophy, Math.round(x + top.x - trophy.width / 2), y + top.y - trophy.height - 2 + bob);
        ctx.fillStyle = UI.shade;
        ctx.fillRect(x, y, box.w - 6, 11);
        const title = textWidth('WEEKLY LEADERBOARD') <= box.w - 10 ? 'WEEKLY LEADERBOARD' : 'LEADERBOARD';
        textCentered(ctx, title, box.x + box.w / 2, y + 2, { color: UI.gold });

        const line = box.y + CARD.art + 7;
        this.#iconLine(ctx, 'coin', 'TOP 10 WIN', box, line - 1, UI.gold);
        if (this.app.player.ranked) {
            textCentered(ctx, `ENDS IN ${endsIn(Date.now())}`, box.x + box.w / 2, line + 11, { color: UI.cream, outline: UI.ink });
        } else {
            textCentered(ctx, 'SIGN IN TO RANK', box.x + box.w / 2, line + 11, { color: UI.red, outline: UI.ink });
        }
        this.#strip(ctx, 'CHALLENGE', box, { focused, open: true });
    }

    /** The card's frame, lit when focused (with the blinking arrow); @returns whether focused. */
    #frame(ctx, id, box) {
        const focused = this.menu.focus === id;
        panel(ctx, box.x, box.y, box.w, box.h, { fill: UI.panel, edge: focused ? UI.cream : UI.edge });
        if (focused && Math.floor(this.time * 3) % 2 === 0) arrow(ctx, box.x - 5, box.y + box.h / 2 - 3, UI.cream);
        return focused;
    }

    /** An icon and a line of text, centred together. */
    #iconLine(ctx, icon, text, box, y, color) {
        const left = Math.round(box.x + box.w / 2 - (textWidth(text) + 11) / 2);
        ctx.drawImage(this.app.icons[icon][1], left, y - 1);
        drawText(ctx, text, left + 12, y, { color, outline: UI.ink });
    }

    /** The card's own button along its foot: gold, lighter when focused. */
    #strip(ctx, label, box, { focused, open }) {
        const y = box.y + box.h - CARD.strip - 4;
        const colors = open ? { fill: focused ? STRIP.lit : UI.gold, edge: UI.goldDark } : STRIP.closed;
        panel(ctx, box.x + 4, y, box.w - 8, CARD.strip, colors);
        textCentered(ctx, label, box.x + box.w / 2, y + 2, { color: open ? UI.ink : UI.dim });
    }

    /** One dot per world under the career card, the shown one lit. */
    #dots(ctx, card) {
        if (WORLDS.length < 2) return;
        const y = card.y + card.h + 5;
        const left = Math.round(card.x + card.w / 2 - (WORLDS.length * 6) / 2);
        WORLDS.forEach((_, i) => {
            ctx.fillStyle = i === this.#index ? UI.gold : UI.edge;
            ctx.fillRect(left + i * 6, y, 4, 4);
        });
    }

    /** @returns {boolean} whether there was a world that way */
    #browse(step) {
        const next = this.#index + step;
        if (next < 0 || next >= WORLDS.length) return false;
        this.#slideFrom = this.#index;
        this.#slideAt = this.time;
        this.#index = next;
        this.app.audio.play('move');
        return true;
    }

    press(x, y) {
        const nav = this.#nav.find((b) => !b.disabled && hits(b, x, y));
        if (!nav) return super.press(x, y);
        this.#browse(nav.step);
        return false;
    }

    key(action) {
        // on the career card left and right browse the worlds; past the last one, right goes to the challenge
        const sideways = action === 'left' || action === 'right';
        if (sideways && this.menu.focus === 'enter' && this.#browse(action === 'left' ? -1 : 1)) return;
        super.key(action);
    }

    action(id) {
        if (id === 'back') this.back();
        else if (id === 'challenge') this.app.show('challenge');
        else if (this.app.career.isWorldOpen(this.#index)) this.app.show('tracks', { worldIndex: this.#index });
    }

    back() {
        this.app.show('title');
    }
}
