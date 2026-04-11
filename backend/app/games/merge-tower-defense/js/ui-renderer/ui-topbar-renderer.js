/**
 * TopBarRenderer
 * Renders the HUD top bar: coins, energy, wave, score, settings button, info button.
 * Owns hit-test logic for the settings gear and the encyclopedia (info) button.
 */

import { CONFIG, UI_CONFIG } from '../config.js';
import { Utils } from '../utils.js';

export class TopBarRenderer {
    constructor(graphics, canvas, audio = null) {
        this.graphics = graphics;
        this.canvas = canvas;
        this.audio = audio;

        /** Populated on every render() call, used for hit-testing. */
        this.settingsButton = null;
        this.infoButton = null;
    }

    /**
     * @param {object} gameState
     * @param {boolean} flashCoins  - pass UIManager.flashCoins
     */
    render(gameState, flashCoins = false) {
        const ctx = this.graphics.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);

        // Background - full canvas width
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, width, UI_CONFIG.TOP_BAR_HEIGHT);

        // Border
        ctx.strokeStyle = CONFIG.COLORS.BUTTON_BORDER;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, width, UI_CONFIG.TOP_BAR_HEIGHT);

        // ── Settings gear icon (top-right) ──────────────────────────────────
        const gearSize = 32;
        const gearX = width - gearSize - 10;
        const gearY = 10;

        this.settingsButton = { x: gearX, y: gearY, width: gearSize, height: gearSize };

        ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
        ctx.beginPath();
        ctx.arc(gearX + gearSize / 2, gearY + gearSize / 2, gearSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = `${gearSize * 0.7}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = CONFIG.COLORS.TEXT_PRIMARY;
        ctx.fillText('⚙️', gearX + gearSize / 2, gearY + gearSize / 2);

        // ── Info / Encyclopedia button (below gear) ──────────────────────────
        const infoSize = 28;
        const infoX = width - infoSize - 12;
        const infoY = gearY + gearSize + 5;

        this.infoButton = { x: infoX, y: infoY, width: infoSize, height: infoSize };

        const time = Date.now() * 0.003;
        const pulse = 0.15 + Math.sin(time) * 0.05;

        ctx.fillStyle = `rgba(100, 150, 255, ${pulse})`;
        ctx.beginPath();
        ctx.arc(infoX + infoSize / 2, infoY + infoSize / 2, infoSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(100, 150, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(infoX + infoSize / 2, infoY + infoSize / 2, infoSize / 2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = `${infoSize * 0.6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#88aaff';
        ctx.fillText('📖', infoX + infoSize / 2, infoY + infoSize / 2);

        // ── Stats ────────────────────────────────────────────────────────────
        const waveDisplay = gameState.targetWaves > 0
            ? `${gameState.wave}/${gameState.targetWaves}`
            : gameState.wave;

        const stats = [
            {
                label: '💰 COINS',
                value: Utils.formatNumber(gameState.coins),
                color: CONFIG.COLORS.TEXT_PRIMARY,
                flash: flashCoins
            },
            {
                label: '⚡ ENERGY',
                value: Math.floor(gameState.energy),
                color: gameState.energy > 50 ? CONFIG.COLORS.TEXT_PRIMARY : CONFIG.COLORS.TEXT_DANGER
            },
            {
                label: '🌊 WAVE',
                value: waveDisplay,
                color: CONFIG.COLORS.TEXT_WARNING
            },
            {
                label: '⭐ SCORE',
                value: Utils.formatNumber(gameState.score),
                color: CONFIG.COLORS.TEXT_SECONDARY
            }
        ];

        const statsAreaWidth = width - gearSize - 20;
        const statWidth = statsAreaWidth / stats.length;

        stats.forEach((stat, index) => {
            const x = statWidth * index + statWidth / 2;
            const y = UI_CONFIG.TOP_BAR_HEIGHT / 2;

            if (stat.flash) {
                ctx.save();
                ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
                ctx.beginPath();
                ctx.arc(x, y, 30, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            this.graphics.drawText(stat.label, x, y - 18, {
                size: 12,
                color: CONFIG.COLORS.TEXT_SECONDARY,
                align: 'center',
                baseline: 'middle',
                shadow: true
            });

            const valueColor = stat.flash ? '#ffff00' : stat.color;
            const valueSize  = stat.flash ? 24 : 20;

            this.graphics.drawText(String(stat.value), x, y + 8, {
                size: valueSize,
                color: valueColor,
                align: 'center',
                baseline: 'middle',
                bold: true,
                shadow: true
            });
        });

        // ── Wave progress bar ────────────────────────────────────────────────
        if (gameState.waveInProgress) {
            const barWidth  = statsAreaWidth * 0.8;
            const barHeight = 4;
            const barX      = (statsAreaWidth - barWidth) / 2;
            const barY      = UI_CONFIG.TOP_BAR_HEIGHT - 10;
            const progress  = gameState.waveZombiesSpawned / gameState.waveZombiesTotal;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            ctx.fillStyle = CONFIG.COLORS.TEXT_WARNING;
            ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        }
    }

    // ── Hit-testing ──────────────────────────────────────────────────────────

    checkSettingsClick(screenX, screenY) {
        if (!this.settingsButton) return false;
        return screenX >= this.settingsButton.x &&
               screenX <= this.settingsButton.x + this.settingsButton.width &&
               screenY >= this.settingsButton.y &&
               screenY <= this.settingsButton.y + this.settingsButton.height;
    }

    checkInfoButtonClick(screenX, screenY) {
        if (!this.infoButton) return false;
        return screenX >= this.infoButton.x &&
               screenX <= this.infoButton.x + this.infoButton.width &&
               screenY >= this.infoButton.y &&
               screenY <= this.infoButton.y + this.infoButton.height;
    }
}
