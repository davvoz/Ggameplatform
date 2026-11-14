import { COMBO, PICKUPS } from '../config/Tuning.js';
import { STRINGS } from '../config/Strings.js';
import { drawStormButton, paintCloud } from './StormArt.js';

/** Clear of the platform's back button, which sits over the top left corner. */
const LEFT = 118;
const BUFF_COLORS = Object.freeze({ chain: '#44aaff', frost: '#9be7ff', power: '#ff4444' });
/** The storm button: on the right, under the platform's round buttons. */
const STORM_BUTTON = Object.freeze({ x: 900, dy: 172 });
const HEART = ['01100110', '11111111', '11111111', '11111111', '01111110', '00111100', '00011000'];

function heart(ctx, x, y, size, full) {
    const px = size / 8;
    ctx.fillStyle = full ? '#ff3b5c' : 'rgba(40,20,40,0.85)';
    HEART.forEach((row, r) => {
        [...row].forEach((cell, c) => {
            if (cell === '1') ctx.fillRect(x + c * px, y + r * px, px, px);
        });
    });
    if (full) {
        ctx.fillStyle = '#ffd0da';
        ctx.fillRect(x + px, y + px, px, px);
    }
}

/**
 * Hearts, score, multiplier and wave, laid out inside the visible part of
 * the arena (`area`), so a cropped phone screen still shows all of it.
 */
export class Hud {
    #font;
    #icons;
    #keyboard;
    #boonIcons;
    #cloud;
    #time = 0;
    #shownScore = 0;

    /**
     * @param {boolean} keyboard name the keys (E on the storm button, Space for the shield)
     * @param {Record<string, HTMLCanvasElement>} boonIcons one icon per power, for the row of those taken
     */
    constructor(font, icons, keyboard = false, boonIcons = {}) {
        this.#font = font;
        this.#icons = icons;
        this.#keyboard = keyboard;
        this.#boonIcons = boonIcons;
        this.#cloud = paintCloud();
    }

    reset() {
        this.#shownScore = 0;
    }

    update(dt, sim) {
        this.#time += dt;
        const target = sim.score.score;
        this.#shownScore += Math.ceil((target - this.#shownScore) * Math.min(1, dt * 12));
        if (this.#shownScore > target) this.#shownScore = target;
    }

    /** @returns {{id: string, x: number, y: number, w: number, h: number}[]} the storm button */
    draw(ctx, sim, area) {
        const top = area.top + 12;
        const { mage } = sim;
        for (let i = 0; i < mage.maxHp; i++) heart(ctx, LEFT + i * 30, top + 4, 24, i < mage.hp);
        this.#font.draw(ctx, String(this.#shownScore), 480, top, { size: 30, align: 'center', color: '#ffffff' });
        this.#multiplier(ctx, sim.score, top + 38);
        this.#font.draw(ctx, `${STRINGS.wave} ${Math.max(1, sim.wave)}`, 944, top + 2, { size: 20, align: 'right' });
        this.#buffs(ctx, mage, top + 40);
        if (this.#keyboard) this.#font.draw(ctx, STRINGS.shieldKey, 16, area.bottom - 26, { size: 14, color: '#9be7ff', alpha: 0.8 });
        this.#boonRow(ctx, sim.boons, area.bottom - (this.#keyboard ? 62 : 36));
        return [this.#stormButton(ctx, sim.storm, area.top + STORM_BUTTON.dy)];
    }

    /** The powers taken, small, in the bottom left corner (with their level when above 1). */
    #boonRow(ctx, boons, y) {
        let x = 16;
        for (const [id, level] of Object.entries(boons.levels)) {
            ctx.drawImage(this.#boonIcons[id], x, y, 26, 26);
            if (level > 1) this.#font.draw(ctx, String(level), x + 28, y + 6, { size: 13, color: '#ffd27a' });
            x += level > 1 ? 44 : 32;
        }
    }

    /** The storm button; with a keyboard it always names its key, on a phone it says TAP! when full. */
    #stormButton(ctx, storm, y) {
        const ready = storm.ready && !storm.active;
        let label = null;
        if (this.#keyboard) label = STRINGS.stormKey;
        else if (ready) label = STRINGS.stormTap;
        const look = { cloud: this.#cloud, font: this.#font, fill: storm.fill, ready, time: this.#time, label };
        return { id: 'storm', ...drawStormButton(ctx, STORM_BUTTON.x, y, look) };
    }

    #multiplier(ctx, score, y) {
        if (score.combo === 0) return;
        const m = score.multiplier;
        this.#font.draw(ctx, `X${m}  ${score.combo}`, 480, y, { size: 18, align: 'center', color: m > 1 ? '#ff9ad5' : '#ffd27a' });
        const width = 90 * Math.max(0, score.comboTimer / COMBO.window);
        ctx.fillStyle = 'rgba(255,154,213,0.8)';
        ctx.fillRect(480 - width / 2, y + 22, width, 3);
    }

    #buffs(ctx, mage, y) {
        let x = LEFT;
        for (const [name, color] of Object.entries(BUFF_COLORS)) {
            const left = mage.buffs[name];
            if (left <= 0) continue;
            ctx.drawImage(this.#icons[name], x, y, 28, 28);
            const total = PICKUPS[`${name}Time`];
            ctx.fillStyle = color;
            ctx.fillRect(x, y + 31, 28 * Math.min(1, left / total), 3);
            x += 36;
        }
    }
}
