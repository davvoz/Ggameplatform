/**
 * PrestigeState — shown when every upgrade is maxed out.
 *
 * The player picks ONE permanent bonus, then all upgrades reset to 0.
 * Coins are kept. Bonuses stack with every consecutive prestige.
 *
 * Bonuses:
 *   ❤️  +2 Extra Lives   — permanent extra lives every run
 *   💰  +0.5× Coin Value — all coin pickups are worth 50% more
 *   📡  +0.5× Altitude   — altitude counts 50% higher towards score
 */

import { State } from './State.js';
import { DESIGN_WIDTH, DESIGN_HEIGHT, COLORS, PRESTIGE_BONUSES } from '../config/Constants.js';

export class PrestigeState extends State {

    // ── Hit regions (canvas coords) ────────────────────────────────────────
    static #BACK_BTN    = { x: 10,  y: 10,  w: 90,  h: 36 };
    static #CONFIRM_BTN = { x: 20,  y: 486, w: 360, h: 58 };
    static #KEEP_BTN    = { x: 60,  y: 556, w: 280, h: 36 };

    // ── Card layout ────────────────────────────────────────────────────────
    static #CARD_X  = 18;
    static #CARD_W  = 364;
    static #CARD_H  = 86;
    static #CARD_GAP = 10;
    static #FIRST_CARD_Y = 192;

    // ── State ──────────────────────────────────────────────────────────────
    #selectedBonus = 0;
    #animTime = 0;

    // ── Lifecycle ──────────────────────────────────────────────────────────

    enter() {
        this.#selectedBonus = 0;
        this.#animTime = 0;
    }

    update(dt) {
        this.#animTime += dt;
        const input = this._game.input;
        if (input.justTapped) {
            this.#handleTap(input.tapX, input.tapY);
            input.consumeTap();
        }
    }

    // ── Input ──────────────────────────────────────────────────────────────

    #handleTap(tx, ty) {
        // ── Back button (top-left) ─────────────────────────────────────────
        const back = PrestigeState.#BACK_BTN;
        if (tx >= back.x && tx <= back.x + back.w &&
            ty >= back.y && ty <= back.y + back.h) {
            this._game.closePrestige();
            return;
        }

        // ── "Keep Playing" link (bottom) ───────────────────────────────────
        const keep = PrestigeState.#KEEP_BTN;
        if (tx >= keep.x && tx <= keep.x + keep.w &&
            ty >= keep.y && ty <= keep.y + keep.h) {
            this._game.closePrestige();
            return;
        }

        // ── Confirm prestige button ────────────────────────────────────────
        const conf = PrestigeState.#CONFIRM_BTN;
        if (tx >= conf.x && tx <= conf.x + conf.w &&
            ty >= conf.y && ty <= conf.y + conf.h) {
            this._game.applyPrestige(PRESTIGE_BONUSES[this.#selectedBonus].id);
            this._game.closePrestige();
            return;
        }

        // ── Bonus option cards ─────────────────────────────────────────────
        const cardX = PrestigeState.#CARD_X;
        const cardW = PrestigeState.#CARD_W;
        const cardH = PrestigeState.#CARD_H;
        const cardGap = PrestigeState.#CARD_GAP;
        const firstY = PrestigeState.#FIRST_CARD_Y;

        for (let i = 0; i < PRESTIGE_BONUSES.length; i++) {
            const cy = firstY + i * (cardH + cardGap);
            if (tx >= cardX && tx <= cardX + cardW &&
                ty >= cy     && ty <= cy + cardH) {
                this.#selectedBonus = i;
                this._game.sound.playSelect();
                return;
            }
        }
    }

    // ── Draw ───────────────────────────────────────────────────────────────

    draw(ctx) {
        this.#drawBackground(ctx);
        this.#drawBackButton(ctx);
        this.#drawHeader(ctx);
        this.#drawCurrentBonuses(ctx);
        this.#drawOptionCards(ctx);
        this.#drawConfirmButton(ctx);
        this.#drawKeepPlayingLink(ctx);
        this.#drawHints(ctx);
    }

    #drawBackground(ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
        grad.addColorStop(0, COLORS.BG_PRIMARY);
        grad.addColorStop(1, COLORS.BG_SECONDARY);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        // Subtle yellow star-dust particles
        ctx.fillStyle = 'rgba(250, 255, 0, 0.07)';
        for (let i = 0; i < 22; i++) {
            const x = (i * 57 + this.#animTime * 18) % (DESIGN_WIDTH + 60) - 30;
            const y = (i * 71 + this.#animTime * 9) % DESIGN_HEIGHT;
            ctx.beginPath();
            ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    #drawBackButton(ctx) {
        const btn = PrestigeState.#BACK_BTN;
        ctx.save();
        ctx.fillStyle   = 'rgba(255,255,255,0.10)';
        ctx.strokeStyle = 'rgba(255,255,255,0.30)';
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle     = COLORS.UI_TEXT;
        ctx.font          = 'bold 13px monospace';
        ctx.textAlign     = 'center';
        ctx.textBaseline  = 'middle';
        ctx.fillText('← BACK', btn.x + btn.w / 2, btn.y + btn.h / 2);
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    }

    #drawHeader(ctx) {
        ctx.save();

        const t = this.#animTime;
        const glowAlpha = 0.5 + Math.sin(t * 2.8) * 0.3;

        // ── "PRESTIGE" title ──────────────────────────────────────────────
        ctx.shadowColor = COLORS.NEON_YELLOW;
        ctx.shadowBlur  = Math.floor(20 * glowAlpha);
        ctx.fillStyle   = COLORS.NEON_YELLOW;
        ctx.font        = 'bold 34px monospace';
        ctx.textAlign   = 'center';
        ctx.fillText('⭐  PRESTIGE  ⭐', DESIGN_WIDTH / 2, 68);
        ctx.shadowBlur  = 0;

        // ── Prestige count ────────────────────────────────────────────────
        const n = this._game.getPrestigeCount();
        if (n === 0) {
            ctx.fillStyle = COLORS.UI_TEXT_DIM;
            ctx.font      = '13px monospace';
            ctx.fillText('First Prestige', DESIGN_WIDTH / 2, 94);
        } else {
            ctx.fillStyle = COLORS.NEON_YELLOW;
            ctx.font      = 'bold 13px monospace';
            ctx.fillText(`Prestige  #${n + 1}`, DESIGN_WIDTH / 2, 94);
        }

        // ── Subtitle ──────────────────────────────────────────────────────
        ctx.shadowColor = COLORS.NEON_CYAN;
        ctx.shadowBlur  = 5;
        ctx.fillStyle   = COLORS.UI_TEXT;
        ctx.font        = '14px monospace';
        ctx.fillText('★  ALL UPGRADES MAXED  ★', DESIGN_WIDTH / 2, 120);
        ctx.shadowBlur  = 0;

        ctx.fillStyle = COLORS.UI_TEXT_DIM;
        ctx.font      = '12px monospace';
        ctx.fillText('Pick one permanent bonus, then restart from scratch:', DESIGN_WIDTH / 2, 142);

        ctx.restore();
    }

    #drawCurrentBonuses(ctx) {
        const bonuses = this._game.getPrestigeBonuses();
        if (bonuses.length === 0) return;

        ctx.save();

        ctx.fillStyle = COLORS.UI_TEXT_DIM;
        ctx.font      = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('YOUR ACCUMULATED BONUSES', DESIGN_WIDTH / 2, 162);

        // Compute chip summary
        const counts = { lives: 0, coins: 0, altitude: 0 };
        bonuses.forEach(b => { if (b in counts) counts[b]++; });

        const chips = [];
        if (counts.lives)    chips.push(`❤️ +${counts.lives * 2} lives`);
        if (counts.coins)    chips.push(`💰 ×${(1 + counts.coins * 0.5).toFixed(1)} coins`);
        if (counts.altitude) chips.push(`📡 ×${(1 + counts.altitude * 0.5).toFixed(1)} altitude`);

        const CHIP_W = 112;
        const CHIP_H = 22;
        const CHIP_GAP = 8;
        const totalW = chips.length * CHIP_W + (chips.length - 1) * CHIP_GAP;
        let cx = (DESIGN_WIDTH - totalW) / 2;

        chips.forEach(text => {
            ctx.fillStyle   = COLORS.UI_PANEL;
            ctx.strokeStyle = COLORS.UI_BORDER_DIM;
            ctx.lineWidth   = 1;
            ctx.beginPath();
            ctx.roundRect(cx, 168, CHIP_W, CHIP_H, 4);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = COLORS.NEON_YELLOW;
            ctx.font      = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(text, cx + CHIP_W / 2, 183);
            cx += CHIP_W + CHIP_GAP;
        });

        ctx.restore();
    }

    #drawOptionCards(ctx) {
        const cardX   = PrestigeState.#CARD_X;
        const cardW   = PrestigeState.#CARD_W;
        const cardH   = PrestigeState.#CARD_H;
        const cardGap = PrestigeState.#CARD_GAP;
        const firstY  = PrestigeState.#FIRST_CARD_Y;

        PRESTIGE_BONUSES.forEach((bonus, i) => {
            const selected = i === this.#selectedBonus;
            const cy = firstY + i * (cardH + cardGap);

            ctx.save();

            // Card background
            ctx.fillStyle = selected ? 'rgba(250, 255, 0, 0.10)' : COLORS.UI_PANEL;
            ctx.strokeStyle = selected ? COLORS.NEON_YELLOW : COLORS.UI_BORDER;
            ctx.lineWidth   = selected ? 2.5 : 1;
            if (selected) {
                ctx.shadowColor = COLORS.NEON_YELLOW;
                ctx.shadowBlur  = 14;
            }
            ctx.beginPath();
            ctx.roundRect(cardX, cy, cardW, cardH, 8);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Selection arrow
            if (selected) {
                ctx.fillStyle    = COLORS.NEON_YELLOW;
                ctx.font         = 'bold 16px monospace';
                ctx.textAlign    = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText('▶', cardX + 10, cy + cardH / 2);
            }

            // Icon
            ctx.font         = '28px monospace';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(bonus.icon, cardX + 52, cy + cardH / 2 - 4);

            // Label
            ctx.fillStyle    = selected ? COLORS.NEON_YELLOW : COLORS.UI_TEXT;
            ctx.font         = `bold ${selected ? 15 : 14}px monospace`;
            ctx.textAlign    = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(bonus.label, cardX + 80, cy + 30);

            // Description
            ctx.fillStyle = COLORS.UI_TEXT_DIM;
            ctx.font      = '11px monospace';
            ctx.fillText(bonus.desc, cardX + 80, cy + 48);

            // Per-stack note (bottom-right)
            ctx.fillStyle = selected ? COLORS.NEON_YELLOW : COLORS.UI_TEXT_DIM;
            ctx.font      = '10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(bonus.perStack, cardX + cardW - 10, cy + cardH - 10);

            ctx.restore();
        });
    }

    #drawConfirmButton(ctx) {
        const btn   = PrestigeState.#CONFIRM_BTN;
        const pulse = 0.8 + Math.sin(this.#animTime * 2.5) * 0.15;

        ctx.save();
        ctx.shadowColor = COLORS.NEON_YELLOW;
        ctx.shadowBlur  = Math.floor(22 * pulse);
        ctx.fillStyle   = COLORS.NEON_YELLOW;
        ctx.strokeStyle = COLORS.NEON_YELLOW;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle    = COLORS.BG_PRIMARY;
        ctx.font         = 'bold 17px monospace';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐  PRESTIGE & RESTART  ⭐', btn.x + btn.w / 2, btn.y + btn.h / 2);
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    }

    #drawKeepPlayingLink(ctx) {
        const btn = PrestigeState.#KEEP_BTN;
        ctx.save();

        // Subtle pill outline so it is tappable
        ctx.fillStyle   = 'rgba(255,255,255,0.05)';
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle    = COLORS.UI_TEXT_DIM;
        ctx.font         = '13px monospace';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('← Keep Playing  (no prestige)', btn.x + btn.w / 2, btn.y + btn.h / 2);
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    }

    #drawHints(ctx) {
        ctx.save();
        ctx.fillStyle = COLORS.UI_TEXT_DIM;
        ctx.font      = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('All upgrades reset on prestige  ·  your coins are kept', DESIGN_WIDTH / 2, 610);
        ctx.fillText('Bonuses are permanent and stack with every prestige', DESIGN_WIDTH / 2, 626);
        ctx.restore();
    }
}
