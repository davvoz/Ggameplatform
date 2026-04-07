/**
 * PrestigeBadgeRenderer — draws the prestige level badge and accumulated
 * bonus chips on any screen (menu, etc.).
 *
 * Single Responsibility: visual rendering of prestige info.
 * Open/Closed: new bonus types just need a BONUS_DISPLAY entry.
 */

import { COLORS } from '../config/Constants.js';
import { bitmapFont } from './BitmapFont.js';

// ── Display metadata for each bonus id ─────────────────────────────────────────
const BONUS_DISPLAY = Object.freeze({
    lives:    { label: 'Lives',    unit: '+',  perStack: 2,   suffix: '',    color: '#ff4466' },
    coins:    { label: 'Coins',    unit: 'x',  perStack: 0.5, suffix: '',    color: COLORS.NEON_ORANGE },
    altitude: { label: 'Altitude', unit: 'x',  perStack: 0.5, suffix: '',    color: COLORS.NEON_CYAN },
});

export class PrestigeBadgeRenderer {
    #animTime = 0;

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    update(dt) {
        this.#animTime += dt;
    }

    /**
     * Draw prestige info centered at (centerX, baseY).
     * Renders nothing when prestigeCount is 0.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number}   prestigeCount   — how many times the player prestiged
     * @param {string[]} prestigeBonuses — list of chosen bonus ids
     * @param {number}   centerX
     * @param {number}   baseY           — top of the badge area
     * @returns {number} total height consumed (0 if nothing drawn)
     */
    draw(ctx, prestigeCount, prestigeBonuses, centerX, baseY) {
        if (prestigeCount <= 0) return 0;

        const badgeH = this.#drawBadge(ctx, prestigeCount, centerX, baseY);
        const chipsH = this.#drawBonusChips(ctx, prestigeBonuses, centerX, baseY + badgeH + 4);

        return badgeH + 4 + chipsH;
    }

    // ── Badge (star + PRESTIGE N) ──────────────────────────────────────────────

    #drawBadge(ctx, count, cx, y) {
        const fontSize = 24;
        const text = `Prestige ${count}`;
        const glowPulse = 0.6 + Math.sin(this.#animTime * 2.4) * 0.3;

        // Glow disc behind badge
        ctx.save();
        const grad = ctx.createRadialGradient(cx, y + fontSize / 2, 2, cx, y + fontSize / 2, 90);
        grad.addColorStop(0, `rgba(250, 255, 43, ${0.12 * glowPulse})`);
        grad.addColorStop(1, 'rgba(250, 255, 43, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(cx - 100, y - 6, 200, fontSize + 12);
        ctx.restore();

        // Shadow
        bitmapFont.drawText(ctx, text, cx + 2, y + 2, fontSize, {
            align: 'center',
            letterSpacing: 0.4,
            alpha: 1,
            color: 'rgba(0,0,0,0.9)',
        });

        // Main text
        bitmapFont.drawText(ctx, text, cx, y, fontSize, {
            align: 'center',
            letterSpacing: 0.4,
            alpha: 1,
            color: COLORS.NEON_YELLOW,
        });

        return fontSize + 2;
    }

    // ── Bonus chips ────────────────────────────────────────────────────────────

    #drawBonusChips(ctx, bonuses, cx, y) {
        const aggregated = PrestigeBadgeRenderer.#aggregateBonuses(bonuses);
        if (aggregated.length === 0) return 0;

        const chipH   = 18;
        const chipPad = 8;
        const chipGap = 6;
        const chips   = aggregated.map(({ id, count }) => this.#buildChipText(id, count));

        // Measure total width so we can center the row
        ctx.save();
        ctx.font = 'bold 10px monospace';
        const chipWidths = chips.map(t => Math.max(ctx.measureText(t).width + chipPad * 2, 70));
        const totalW = chipWidths.reduce((s, w) => s + w, 0) + (chips.length - 1) * chipGap;
        ctx.restore();

        let drawX = cx - totalW / 2;

        ctx.save();
        for (let i = 0; i < chips.length; i++) {
            const w   = chipWidths[i];
            const agg = aggregated[i];
            const display = BONUS_DISPLAY[agg.id];

            // Chip background
            ctx.fillStyle   = 'rgba(5, 10, 30, 0.75)';
            ctx.strokeStyle = display?.color ?? COLORS.UI_BORDER_DIM;
            ctx.lineWidth   = 1.2;
            ctx.beginPath();
            ctx.roundRect(drawX, y, w, chipH, 4);
            ctx.fill();
            ctx.stroke();

            // Chip text
            ctx.fillStyle    = display?.color ?? COLORS.UI_TEXT;
            ctx.font         = 'bold 10px monospace';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(chips[i], drawX + w / 2, y + chipH / 2);

            drawX += w + chipGap;
        }
        ctx.restore();

        return chipH;
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    #buildChipText(bonusId, stackCount) {
        const info = BONUS_DISPLAY[bonusId];
        if (!info) return `${bonusId} x${stackCount}`;

        const value = info.perStack * stackCount;
        if (info.unit === '+') return `${info.label} ${info.unit}${value}${info.suffix}`;
        return `${info.label} ${info.unit}${(1 + value).toFixed(1)}${info.suffix}`;
    }

    /**
     * Collapse the flat bonus array into { id, count } entries.
     * @param {string[]} bonuses
     * @returns {{ id: string, count: number }[]}
     */
    static #aggregateBonuses(bonuses) {
        if (!bonuses || bonuses.length === 0) return [];

        const map = new Map();
        for (const b of bonuses) {
            map.set(b, (map.get(b) ?? 0) + 1);
        }
        return Array.from(map.entries()).map(([id, count]) => ({ id, count }));
    }
}
