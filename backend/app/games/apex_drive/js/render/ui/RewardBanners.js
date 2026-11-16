import { drawText, LINE, textWidth } from '../PixelFont.js';
import { ease, progress } from './ease.js';
import { panel, UI } from './widgets.js';

/**
 * What the platform gives after a race, drawn over whatever screen is on:
 * the XP earned, a level up. Each drops from the top in the middle, stays a
 * moment and goes back up; they come one after the other.
 *
 * @typedef {{lines: {text: string, color: string, scale: number}[], icon: string, seconds: number}} Banner
 */
const SLIDE = 0.25;
const TOP = 20;
const PAD = 5;
const GAP = 3;
const SHOW = { xp: 3.5, levelUp: 5 };

/** The XP banner: one line, two decimals as the platform counts it. */
export function xpBanner(xp) {
    return { icon: 'bolt', seconds: SHOW.xp, lines: [{ text: `+${xp.toFixed(2)} XP`, color: UI.gold, scale: 1 }] };
}

/** The level up banner: the level big, the title, the coins (none for a guest). */
export function levelUpBanner({ level, title, coins }) {
    const lines = [{ text: `LEVEL ${level}!`, color: UI.gold, scale: 2 }];
    if (title) lines.push({ text: title.toUpperCase(), color: UI.cream, scale: 1 });
    if (coins > 0) lines.push({ text: `+${coins} COINS`, color: UI.green, scale: 1 });
    return { icon: 'trophy', seconds: SHOW.levelUp, lines };
}

export class RewardBanners {
    /** @type {Banner[]} */
    #queue = [];
    #age = 0;

    /** @param {Banner} banner */
    add(banner) {
        if (this.#queue.length === 0) this.#age = 0;
        this.#queue.push(banner);
    }

    /** The banner on show, if any. */
    get current() {
        return this.#queue[0] ?? null;
    }

    update(dt) {
        const banner = this.current;
        if (!banner) return;
        this.#age += dt;
        if (this.#age < banner.seconds) return;
        this.#queue.shift();
        this.#age = 0;
    }

    /** @param {CanvasRenderingContext2D} ctx */
    draw(ctx, { width }, icons) {
        const banner = this.current;
        if (!banner) return;
        const inside = ease.outBack(progress(this.#age, 0, SLIDE)) - ease.inCubic(progress(this.#age, banner.seconds - SLIDE, SLIDE));
        const icon = icons[banner.icon][2];
        const textHeight = banner.lines.reduce((sum, line) => sum + LINE * line.scale + GAP, -GAP);
        const textMost = Math.max(...banner.lines.map((line) => textWidth(line.text, line.scale)));
        const w = icon.width + PAD * 3 + textMost;
        const h = Math.max(icon.height, textHeight) + PAD * 2;
        const x = Math.round(width / 2 - w / 2);
        const y = Math.round(TOP - (1 - inside) * (TOP + h + 4));
        panel(ctx, x, y, w, h, { fill: UI.panel, edge: UI.gold });
        ctx.drawImage(icon, x + PAD, Math.round(y + h / 2 - icon.height / 2));
        let lineY = Math.round(y + h / 2 - textHeight / 2);
        for (const line of banner.lines) {
            const lineX = x + PAD * 2 + icon.width + Math.round((textMost - textWidth(line.text, line.scale)) / 2);
            drawText(ctx, line.text, lineX, lineY, { color: line.color, outline: UI.ink, scale: line.scale });
            lineY += LINE * line.scale + GAP;
        }
    }
}
