/**
 * HUDRenderer — Draws all HUD overlays for the PlayingState.
 *
 * Single Responsibility: rendering only; no game-logic mutations.
 * Deduplicates the analog-clock timer that was previously copy-pasted
 * for level mode and infinite mode.
 */

import { DESIGN_WIDTH, DESIGN_HEIGHT, COLORS, UPGRADE_CATALOG, TIME_BONUS, QUALITY } from '../config/Constants.js';
import { bitmapFont } from '../graphics/BitmapFont.js';
import { drawUpgradeIcon } from '../graphics/UpgradeIcons.js';
import { TimeBonusCalculator } from '../systems/TimeBonusCalculator.js';

// Category → border colour mapping (mirrors shop category colours)
const CATEGORY_COLORS = Object.freeze({
    mobility:   '#00ffaa',
    combat:     '#ff4466',
    collection: '#ffcc00',
    score:      '#aa88ff',
});

export class HUDRenderer {
    /**
     * Draw the full HUD overlay.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} game           — Game instance (read-only access)
     * @param {object} player         — Player entity
     * @param {object} modeState      — { isInfinite, levelTimer, parScreenCount,
     *                                    levelTotalClimb, levelGoalY,
     *                                    infScreenTimer, infLastCpTime, infScreenCleared,
     *                                    infCheckpointAnim, hudFlash, comboDisplay }
     * @param {import('./FloatingTextManager.js').FloatingTextManager} floatingTexts
     */
    draw(ctx, game, player, modeState, floatingTexts) {
        ctx.save();

        if (modeState.isInfinite) {
            this.#drawInfiniteHeader(ctx, player);
        } else {
            this.#drawLevelHeader(ctx, game, player, modeState);
        }

        // Timer (both modes, positioned at top-center)
        if (modeState.isInfinite) {
            this.#drawTimerClock(ctx, modeState.infScreenTimer - modeState.infLastCpTime, 5);
            this.#drawCheckpointBanner(ctx, modeState.infCheckpointAnim);
            this.#drawScreenChip(ctx, modeState.infScreenCleared);
        } else {
            this.#drawTimerClock(ctx, modeState.levelTimer, modeState.parScreenCount);
        }

        // Coins (right side — both modes)
        this.#drawCoins(ctx, game.coins, modeState.hudFlash);

        // Lives
        this.#drawLives(ctx, player?.lives || 0);

        // Combo
        if (modeState.comboDisplay > 1) {
            bitmapFont.drawText(ctx, `${modeState.comboDisplay}x COMBO!`, DESIGN_WIDTH / 2, 88, 28, {
                align: 'center',
                color: COLORS.NEON_ORANGE,
            });
        }

        // Active power-ups
        this.#drawActivePowerUps(ctx, player);

        // Purchased upgrades column
        this.#drawUpgradeIcons(ctx, game);

        // Floating texts (+❤️ etc.)
        floatingTexts.draw(ctx);

        ctx.restore();
    }

    // ── Infinite mode header ──────────────────────────────────────
    #drawInfiniteHeader(ctx, player) {
        const currentAlt = Math.max(0, Math.floor(-player.y));
        bitmapFont.drawText(ctx, `${currentAlt} m`, 31, 26, 22, {
            color: COLORS.NEON_CYAN,
            alpha: 0.9,
            letterSpacing: 1,
        });
        bitmapFont.drawText(ctx, 'INFINITE', 15, 53, 20, {
            color: COLORS.NEON_ORANGE,
            alpha: 0.9,
            letterSpacing: 1,
        });
    }

    // ── Level mode header ─────────────────────────────────────────
    #drawLevelHeader(ctx, game, player, modeState) {
        // Score
        bitmapFont.drawText(ctx, `${Math.floor(game.score)}`, 15, 26, 24, { color: '#ffffff' });

        // Level label
        bitmapFont.drawText(ctx, `LEVEL ${(game.currentLevel ?? 0) + 1}`, 15, 49, 13, { color: COLORS.NEON_CYAN });

        // Level progress bar (right side, vertical)
        if (modeState.levelTotalClimb > 0) {
            const startY  = DESIGN_HEIGHT - 120;
            const climbed = startY - (player?.y ?? startY);
            const pct     = Math.min(1, Math.max(0, climbed / modeState.levelTotalClimb));
            const barH    = 120;
            const barX    = DESIGN_WIDTH - 8;
            const barY    = 80;

            // Track
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(barX - 3, barY, 6, barH);

            // Fill
            const fillH = barH * pct;
            ctx.fillStyle = COLORS.NEON_CYAN;
            ctx.fillRect(barX - 3, barY + (barH - fillH), 6, fillH);

            // Goal marker
            ctx.fillStyle = COLORS.NEON_YELLOW;
            ctx.fillRect(barX - 5, barY, 10, 3);
        }
    }

    // ── Analog-clock timer (shared by level mode & infinite mode) ─
    #drawTimerClock(ctx, elapsed, screenCount) {
        const { color } = TimeBonusCalculator.currentMedalColor(elapsed, screenCount);

        const gold   = TIME_BONUS.GOLD_PER_SCREEN   * screenCount;
        const silver = TIME_BONUS.SILVER_PER_SCREEN  * screenCount;
        const bronze = TIME_BONUS.BRONZE_PER_SCREEN  * screenCount;

        // Simplified timer for mobile
        if (!QUALITY.FANCY_TIMER) {
            bitmapFont.drawText(ctx, TimeBonusCalculator.formatTime(elapsed), DESIGN_WIDTH / 2, 30, 14, {
                align: 'center',
                color,
            });
            return;
        }

        const cx = DESIGN_WIDTH / 2;
        const cy = 40;
        const OR = 29;   // outer track radius
        const IR = 20;   // inner track radius
        const HR = 25;   // clock-hand tip radius

        const START     = -Math.PI / 2; // 12 o'clock
        const goldAng   = (gold   / bronze) * Math.PI * 2;
        const silverAng = (silver / bronze) * Math.PI * 2;
        const fullAng   = Math.PI * 2;
        const currentAng = Math.min((elapsed / bronze) * Math.PI * 2, fullAng);

        const donutArc = (fromA, toA, fillColor, alpha) => {
            if (toA <= fromA) return;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = fillColor;
            ctx.beginPath();
            ctx.arc(cx, cy, OR, START + fromA, START + toA);
            ctx.arc(cx, cy, IR, START + toA,   START + fromA, true);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        };

        ctx.save();

        // 1. Background disc
        ctx.shadowColor = color;
        ctx.shadowBlur  = 16;
        ctx.fillStyle   = 'rgba(6, 12, 38, 0.90)';
        ctx.beginPath();
        ctx.arc(cx, cy, OR + 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 2. Dim zone arcs
        donutArc(0,         goldAng,   TIME_BONUS.GOLD_COLOR,   0.22);
        donutArc(goldAng,   silverAng, TIME_BONUS.SILVER_COLOR, 0.18);
        donutArc(silverAng, fullAng,   TIME_BONUS.BRONZE_COLOR, 0.14);

        // 3. Glowing progress sweep
        if (elapsed > 0) {
            ctx.shadowColor = color;
            ctx.shadowBlur  = 10;
            donutArc(0, currentAng, color, 0.9);
            ctx.shadowBlur = 0;
        }

        // 4. Inner disc re-fill
        ctx.fillStyle = 'rgba(6, 12, 38, 0.94)';
        ctx.beginPath();
        ctx.arc(cx, cy, IR - 1, 0, Math.PI * 2);
        ctx.fill();

        // 5. Outer rim border
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, OR + 2, 0, Math.PI * 2);
        ctx.stroke();

        // 6. Threshold tick marks
        for (const [ang, col] of [[goldAng, TIME_BONUS.GOLD_COLOR], [silverAng, TIME_BONUS.SILVER_COLOR]]) {
            const a = START + ang;
            ctx.strokeStyle = col;
            ctx.lineWidth   = 2;
            ctx.lineCap     = 'round';
            ctx.shadowColor = col;
            ctx.shadowBlur  = 5;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * (IR - 3), cy + Math.sin(a) * (IR - 3));
            ctx.lineTo(cx + Math.cos(a) * (OR + 4), cy + Math.sin(a) * (OR + 4));
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // 7. Digital time inside clock
        bitmapFont.drawText(ctx, TimeBonusCalculator.formatTime(elapsed), cx, cy + 1, 11, { align: 'center', color });

        // 8. Clock hand
        const handAng = START + currentAng;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth   = 2;
        ctx.lineCap     = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur  = 7;
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(handAng) * 5, cy - Math.sin(handAng) * 5);
        ctx.lineTo(cx + Math.cos(handAng) * HR, cy + Math.sin(handAng) * HR);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 9. Center pivot
        ctx.fillStyle   = '#ffffff';
        ctx.shadowColor = color;
        ctx.shadowBlur  = 5;
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 10. Medal icon below clock (level mode only — infinite uses screen chip)
        const medalIcons = { gold: '\uD83E\uDD47', silver: '\uD83E\uDD48', bronze: '\uD83E\uDD49', none: '\u23F1' };
        const { medal } = TimeBonusCalculator.currentMedalColor(elapsed, screenCount);
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(medalIcons[medal], cx, cy + OR + 5);

        ctx.restore();
    }

    // ── Screen number chip (infinite mode, top-left of clock) ─────
    #drawScreenChip(ctx, infScreenCleared) {
        if (!QUALITY.FANCY_TIMER) return;

        const screenNum = (infScreenCleared + 1) * 5;
        const screenTime = 0; // only used for color
        const { color } = TimeBonusCalculator.currentMedalColor(screenTime, 5);
        const cx = DESIGN_WIDTH / 2;
        const cy = 40;
        const OR = 29;

        ctx.fillStyle   = 'rgba(6,12,38,0.85)';
        ctx.strokeStyle = color;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.roundRect(cx - OR - 3, cy - OR - 3, 24, 14, 4);
        ctx.fill();
        ctx.stroke();
        bitmapFont.drawText(ctx, `F${screenNum}`, cx - OR + 9, cy - OR + 4, 9, { align: 'center', color });
    }

    // ── Checkpoint cleared banner (infinite mode) ─────────────────
    #drawCheckpointBanner(ctx, anim) {
        if (!anim || anim.life <= 0) return;

        if (!QUALITY.FANCY_TIMER) {
            const at = anim.life / anim.maxLife;
            ctx.globalAlpha = at;
            bitmapFont.drawText(ctx, anim.text, DESIGN_WIDTH / 2, 55, 12, { align: 'center', color: anim.color });
            ctx.globalAlpha = 1;
            return;
        }

        const cx = DESIGN_WIDTH / 2;
        const cy = 40;
        const OR = 29;
        const t     = anim.life / anim.maxLife;
        const scale = t > 0.8 ? 1 + (1 - (t - 0.8) / 0.2) * 0.6 : 1;
        const alpha = t < 0.25 ? t / 0.25 : 1;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(cx, cy + OR + 100);
        ctx.scale(scale, scale);
        ctx.shadowColor = anim.color;
        ctx.shadowBlur  = 18;
        ctx.strokeStyle = anim.color;
        ctx.lineWidth   = 1.5;

        const bw = 110, bh = 22;
        ctx.fillStyle = 'rgba(6,12,38,0.92)';
        ctx.beginPath();
        ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 8);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        bitmapFont.drawText(ctx, anim.text, 0, 0, 13, { align: 'center', color: anim.color });
        ctx.restore();
    }

    // ── Coins ─────────────────────────────────────────────────────
    #drawCoins(ctx, coins, hudFlash) {
        ctx.fillStyle = hudFlash > 0 ? '#ffffff' : COLORS.COIN_GOLD;
        ctx.textAlign = 'right';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`\uD83D\uDCB0 ${coins}`, DESIGN_WIDTH - 15, 35);
    }

    // ── Lives ─────────────────────────────────────────────────────
    #drawLives(ctx, totalLives) {
        const perRow   = 5;
        const heartStr = '\u2764\uFE0F';

        ctx.fillStyle  = COLORS.NEON_RED;
        ctx.textAlign  = 'right';
        ctx.font       = '16px monospace';

        const rows = Math.ceil(totalLives / perRow);
        for (let r = 0; r < rows; r++) {
            const count = Math.min(perRow, totalLives - r * perRow);
            ctx.fillText(heartStr.repeat(count), DESIGN_WIDTH - 15, 55 + r * 18);
        }
    }

    // ── Active power-ups strip ────────────────────────────────────
    #drawActivePowerUps(ctx, player) {
        if (!player) return;

        const powerUps = [];
        if (player.hasJetpack)     powerUps.push({ icon: '🚀', color: COLORS.NEON_ORANGE });
        if (player.hasShield)      powerUps.push({ icon: '🛡️', color: COLORS.NEON_CYAN });
        if (player.hasMagnet)      powerUps.push({ icon: '🧲', color: COLORS.NEON_PURPLE });
        if (player.hasSpringBoots) powerUps.push({ icon: '🥾', color: COLORS.NEON_GREEN });
        if (player.hasSlowTime)    powerUps.push({ icon: '⏱️', color: COLORS.NEON_BLUE });
        if (player.hasDoubleCoins) powerUps.push({ icon: '💰', color: COLORS.NEON_YELLOW });

        for (let i = 0; i < powerUps.length; i++) {
            const p = powerUps[i];
            const x = 20 + i * 30;
            const y = 80;

            ctx.fillStyle   = p.color;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(x, y, 14, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha   = 1;
            ctx.font          = '16px sans-serif';
            ctx.textAlign     = 'center';
            ctx.textBaseline  = 'middle';
            ctx.fillText(p.icon, x, y);
        }
    }

    // ── Purchased upgrade icons column ────────────────────────────
    #drawUpgradeIcons(ctx, game) {
        const upgrades = Object.values(UPGRADE_CATALOG);
        const owned    = upgrades.filter(u => (game.getUpgradeLevel(u.id) ?? 0) > 0);
        if (owned.length === 0) return;

        const SIZE = 22;
        const GAP  = 3;
        const X    = 8;
        let Y      = 68;

        ctx.save();

        for (const upg of owned) {
            const lvl   = game.getUpgradeLevel(upg.id);
            const color = CATEGORY_COLORS[upg.category] ?? '#ffffff';

            // Badge background
            ctx.globalAlpha = 0.55;
            ctx.fillStyle   = 'rgba(0,0,0,0.6)';
            ctx.fillRect(X, Y, SIZE, SIZE);

            // Coloured border
            ctx.globalAlpha = 1;
            ctx.strokeStyle = color;
            ctx.lineWidth   = 1.5;
            ctx.strokeRect(X, Y, SIZE, SIZE);

            // Canvas-drawn icon
            drawUpgradeIcon(ctx, upg.id, X, Y, SIZE);

            // Level badge (bottom-right corner)
            if (lvl > 1) {
                ctx.globalAlpha = 1;
                bitmapFont.drawText(ctx, `${lvl}`, X + SIZE - 1, Y + SIZE - 5, 8, { align: 'right', color });
            }

            Y += SIZE + GAP;
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }
}
