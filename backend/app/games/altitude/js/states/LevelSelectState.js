/**
 * LevelSelectState - Campaign level selection screen.
 *
 * Displays all levels as a scrollable card grid.
 * Level 0 is always unlocked; subsequent levels unlock when the preceding
 * level is beaten (handled in LevelCompleteState).
 *
 * Navigation:
 *  - Tap a card  → play if unlocked
 *  - Arrow keys  → move focus, Enter/jump → activate
 *  - "← BACK" top-left  → main menu
 *  - "🛒 SHOP"  footer   → shop (returns here on close)
 */

import { State }                      from './State.js';
import { DESIGN_WIDTH, DESIGN_HEIGHT, COLORS, FONTS } from '../config/Constants.js';
import { bitmapFont }                 from '../graphics/BitmapFont.js';
import { TOTAL_LEVELS, getLevelData } from '../config/LevelData.js';

// ─── Layout ──────────────────────────────────────────────────────────────────
const COLS          = 3;
const CARD_W        = 116;
const CARD_H        = 100;
const GAP_X         = 8;
const GAP_Y         = 10;
// Horizontal padding so the grid is centred on a 400-px canvas
const GRID_PADDING_X = (DESIGN_WIDTH - COLS * CARD_W - (COLS - 1) * GAP_X) / 2; // ≈ 18
const GRID_TOP      = 108;   // y where the first row starts
const FOOTER_H      = 56;    // height reserved below the grid for the footer bar

export class LevelSelectState extends State {
    static #BACK_BTN = { x: 10, y: 10, w: 70, h: 36 };

    /** Smooth-scroll position (px, positive = scrolled down) */
    #scrollY       = 0;
    /** Lerp target for smooth scrolling */
    #targetScrollY = 0;
    /** Maximum scroll value; 0 when the whole grid fits on screen */
    #maxScroll     = 0;

    /** @type {Array<{x:number,y:number,size:number,speed:number,alpha:number}>} */
    #bgStars = [];
    /** Cooldown to prevent double-activation on card tap */
    #tapCooldown = 0;

    constructor(game) {
        super(game);
        this.#bgStars = this.#generateStars();
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    enter() {
        this.#tapCooldown   = 0.12;   // prevent immediate activation on transition
        this.#scrollY       = 0;
        this.#targetScrollY = 0;
        this.#maxScroll     = this.#computeMaxScroll();
    }

    exit() { /* nothing to clean up */ }

    // ── Update ────────────────────────────────────────────────────────────────

    update(dt) {
        this.#scrollStars(dt);
        this.#applyScrollLerp(dt);
        if (this.#tapCooldown > 0) {
            this.#tapCooldown -= dt;
            return;
        }
        this.#handleTap();
    }

    // ── Draw ──────────────────────────────────────────────────────────────────

    draw(ctx) {
        this.#drawBackground(ctx);
        this.#drawTitle(ctx);
        this.#drawBackButton(ctx);
        this.#drawGrid(ctx);
        this.#drawFooter(ctx);
    }

    // ── Init helpers ─────────────────────────────────────────────────────────

    #generateStars() {
        return Array.from({ length: 40 }, () => ({
            x:     Math.random() * DESIGN_WIDTH,
            y:     Math.random() * DESIGN_HEIGHT,
            size:  1 + Math.random() * 1.5,
            speed: 15 + Math.random() * 20,
            alpha: 0.2 + Math.random() * 0.5,
        }));
    }

    /** Total grid height minus the visible window; 0 when no scroll is needed. */
    #computeMaxScroll() {
        const rows    = Math.ceil(TOTAL_LEVELS / COLS);
        const totalH  = rows * CARD_H + (rows - 1) * GAP_Y;
        const visible = DESIGN_HEIGHT - GRID_TOP - FOOTER_H;
        return Math.max(0, totalH - visible);
    }

    /**
     * Screen-space top-left corner of the card at `index`, accounting for
     * the current scroll position.
     * @param {number} index
     * @returns {{ x: number, y: number }}
     */
    #cardRect(index) {
        const col = index % COLS;
        const row = Math.floor(index / COLS);
        return {
            x: GRID_PADDING_X + col * (CARD_W + GAP_X),
            y: GRID_TOP + row * (CARD_H + GAP_Y) - Math.round(this.#scrollY),
        };
    }

    // ── Scroll helpers ───────────────────────────────────────────────────────

    #scrollStars(dt) {
        for (const star of this.#bgStars) {
            star.y += star.speed * dt;
            if (star.y > DESIGN_HEIGHT) {
                star.y = 0;
                star.x = Math.random() * DESIGN_WIDTH;
            }
        }
    }

    #applyScrollLerp(dt) {
        const diff = this.#targetScrollY - this.#scrollY;
        this.#scrollY += diff * Math.min(1, 12 * dt);
    }

    // ── Input ────────────────────────────────────────────────────────────────

    #handleTap() {
        const input = this._game.input;
        if (!input.justTapped) return;

        const tx = input.tapX;
        const ty = input.tapY;
        input.consumeTap();

        // Back button zone (top-left)
        const btn = LevelSelectState.#BACK_BTN;
        if (tx >= btn.x && tx < btn.x + btn.w && ty >= btn.y && ty < btn.y + btn.h) {
            this.#exitToMenu();
            return;
        }

        // Shop button zone (footer)
        if (ty > DESIGN_HEIGHT - FOOTER_H) {
            this._game.openShop('levelSelect');
            return;
        }

        // Card hit-test
        for (let i = 0; i < TOTAL_LEVELS; i++) {
            const { x, y } = this.#cardRect(i);
            if (tx >= x && tx < x + CARD_W && ty >= y && ty < y + CARD_H) {
                this.#activateCard(i);
                return;
            }
        }
    }

    #activateCard(index) {
        if (!this._game.isLevelUnlocked(index)) return;  // locked — silently ignore
        this._game.sound.playMenuSelect();
        this._game.startLevel(index);
    }

    #exitToMenu() {
        this._game.sound.playMenuSelect();
        this._game.fsm.transition('menu');
    }

    // ── Rendering ────────────────────────────────────────────────────────────

    #drawBackground(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
        g.addColorStop(0, COLORS.BG_GRADIENT_TOP);
        g.addColorStop(1, COLORS.BG_GRADIENT_BOTTOM);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        for (const star of this.#bgStars) {
            ctx.fillStyle = `rgba(255,255,255,${star.alpha.toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    #drawTitle(ctx) {
        ctx.save();
        ctx.shadowColor = COLORS.NEON_GREEN;
        ctx.shadowBlur  = 20;
        //shadow
        bitmapFont.drawText(ctx, 'SELECT LEVEL', DESIGN_WIDTH / 2 + 2, 52, 26, { align: 'center', color: 'rgba(0,0,0,1)' });
        bitmapFont.drawText(ctx, 'SELECT LEVEL', DESIGN_WIDTH / 2, 50, 26, { align: 'center', color: COLORS.NEON_GREEN });
        ctx.restore();
    }

    #drawBackButton(ctx) {
        const btn = LevelSelectState.#BACK_BTN;
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
        ctx.fill();
        ctx.stroke();
        bitmapFont.drawText(ctx, 'BACK', btn.x + btn.w / 2, btn.y + btn.h / 2, 15, { align: 'center', color: '#ffffff' });
        ctx.restore();
    }

    #drawGrid(ctx) {
        ctx.save();
        // Clip so cards don't bleed into the header or footer
        ctx.beginPath();
        ctx.rect(0, GRID_TOP, DESIGN_WIDTH, DESIGN_HEIGHT - GRID_TOP - FOOTER_H);
        ctx.clip();

        for (let i = 0; i < TOTAL_LEVELS; i++) {
            this.#drawCard(ctx, i);
        }

        ctx.restore();

        // Scroll-fade overlays (rendered outside the clip region)
        this.#drawScrollFades(ctx);
    }

    #drawCard(ctx, index) {
        const { x, y }   = this.#cardRect(index);
        const unlocked    = this._game.isLevelUnlocked(index);
        const ld          = getLevelData(index);
        const levelName   = ld?.name ?? `Level ${index + 1}`;
        const shortName   = `${levelName.slice(0, 12)}`.toUpperCase(); // truncate and uppercase for display;
        const cardAlpha   = unlocked ? 1.0 : 0.45;

        ctx.save();
        ctx.globalAlpha = cardAlpha;

        // Background fill
        ctx.fillStyle = COLORS.UI_PANEL;
        ctx.beginPath();
        ctx.roundRect(x, y, CARD_W, CARD_H, 8);
        ctx.fill();

        // Border
        ctx.strokeStyle = unlocked ? COLORS.NEON_GREEN : 'rgba(120,120,170,0.4)';
        ctx.lineWidth   = unlocked ? 1.5 : 1.2;
        ctx.stroke();

        ctx.restore();

        // Card text
        ctx.save();
        ctx.globalAlpha  = cardAlpha;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';

        if (unlocked) {
             //shadow
            bitmapFont.drawText(ctx, String(index + 1), x + CARD_W / 2 + 2, y + 28, 20, 
            { align: 'center', color: 'rgba(0,0,0,0.8)' });
            // Level number
            bitmapFont.drawText(ctx, String(index + 1), x + CARD_W / 2, y + 26, 20, 
            { align: 'center', color: COLORS.NEON_GREEN });

           //shadow
           
            bitmapFont.drawText(ctx, shortName, x + CARD_W / 2 + 2, y + 56, 17, 
                { align: 'center', color: 'rgba(0,0,0,0.8)' });
            // Level name
            bitmapFont.drawText(ctx, shortName, x + CARD_W / 2, y + 54, 17, 
                { align: 'center', color: COLORS.UI_TEXT });

        } else {
            // Lock icon
            ctx.font      = `500 22px ${FONTS.UI}`;
            ctx.fillText('\uD83D\uDD12', x + CARD_W / 2, y + 38);

            bitmapFont.drawText(ctx, `LEVEL ${index + 1}`, x + CARD_W / 2, y + 74, 10, { align: 'center', color: COLORS.UI_TEXT_DIM });
        }

        ctx.restore();
    }

    #drawScrollFades(ctx) {
        if (this.#maxScroll <= 0) return;

        // Top fade (appears when user has scrolled down)
        if (this.#scrollY > 5) {
            const g = ctx.createLinearGradient(0, GRID_TOP, 0, GRID_TOP + 28);
            g.addColorStop(0, COLORS.BG_GRADIENT_TOP);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, GRID_TOP, DESIGN_WIDTH, 28);
        }

        // Bottom fade (appears when more content below)
        if (this.#scrollY < this.#maxScroll - 5) {
            const by = DESIGN_HEIGHT - FOOTER_H - 28;
            const g  = ctx.createLinearGradient(0, by, 0, by + 28);
            g.addColorStop(0, 'rgba(0,0,0,0)');
            g.addColorStop(1, COLORS.BG_GRADIENT_BOTTOM);
            ctx.fillStyle = g;
            ctx.fillRect(0, by, DESIGN_WIDTH, 28);
        }
    }

    #drawFooter(ctx) {
        const fy = DESIGN_HEIGHT - FOOTER_H;

        // Separator
        ctx.strokeStyle = 'rgba(100,100,150,0.4)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(0, fy);
        ctx.lineTo(DESIGN_WIDTH, fy);
        ctx.stroke();

        // Coin balance
        ctx.save();
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = COLORS.COIN_GOLD;
        ctx.font         = `600 14px ${FONTS.UI}`;
        ctx.fillText(`\uD83D\uDCB0 ${this._game.save.totalCoins.toLocaleString()}`, 16, fy + FOOTER_H / 2);
        ctx.restore();

        // Shop button
        const btnW = 84;
        const btnH = 34;
        const bx   = DESIGN_WIDTH - btnW - 14;
        const by   = fy + (FOOTER_H - btnH) / 2;

        ctx.save();
        ctx.fillStyle   = 'rgba(255,140,0,0.15)';
        ctx.strokeStyle = COLORS.NEON_ORANGE;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, by, btnW, btnH, 8);
        ctx.fill();
        ctx.stroke();

        bitmapFont.drawText(ctx, 'SHOP', bx + btnW / 2, by + btnH / 2, 13, { align: 'center', color: COLORS.NEON_ORANGE });
        ctx.restore();
    }
}
