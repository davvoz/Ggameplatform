import { CONFIG } from './config.js';
import { Utils } from './utils.js';

/**
 * Wave Mode Selection Screen
 * Allows player to choose difficulty (20, 50, or 70 waves)
 */

export class WaveModeSelector {
    constructor(graphics, onModeSelected) {
        this.graphics = graphics;
        this.onModeSelected = onModeSelected;
        this.isVisible = false;
        this.buttons = [];
        this.animTime = 0;
    }

    show() {
        this.isVisible = true;
        this.animTime = 0;
        this.setupButtons();
    }

    hide() {
        this.isVisible = false;
        this.buttons = [];
    }

    setupButtons() {
        const canvas = this.graphics.canvas;
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);

        const buttonWidth = Math.min(280, width * 0.7);
        const buttonHeight = 80;
        const spacing = 20;
        const totalHeight = (buttonHeight * 3) + (spacing * 2);
        const startY = (height - totalHeight) / 2 + 60;

        this.buttons = [];
        const modes = Object.entries(CONFIG.WAVE_MODES);

        modes.forEach(([key, mode], index) => {
            this.buttons.push({
                key: key,
                x: (width - buttonWidth) / 2,
                y: startY + (buttonHeight + spacing) * index,
                width: buttonWidth,
                height: buttonHeight,
                mode: mode
            });
        });
    }

    update(dt) {
        if (!this.isVisible) return;
        this.animTime += dt;
    }

    render() {
        if (!this.isVisible) return;

        const ctx = this.graphics.ctx;
        const canvas = this.graphics.canvas;
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);

        // Background overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
        ctx.fillRect(0, 0, width, height);

        // Title with animation
        const titleY = height * 0.15;
        // const pulseScale = 1 + Math.sin(this.animTime * 3) * 0.03;

        ctx.save();
        ctx.translate(width / 2, titleY);
        //ctx.scale(pulseScale, pulseScale);
        ctx.translate(-width / 2, -titleY);

        this.graphics.drawText('⚔️ SELECT CHALLENGE ⚔️', width / 2, titleY, {
            size: 32,
            color: '#ffdd00',
            align: 'center',
            bold: true,
            shadow: true
        });
        ctx.restore();

        // Subtitle
        this.graphics.drawText('Choose your waves - Win to earn Platform Coins!', width / 2, titleY + 40, {
            size: 14,
            color: CONFIG.COLORS.TEXT_SECONDARY,
            align: 'center',
            shadow: true
        });

        // Render buttons
        this.buttons.forEach((btn) => {
            const y = btn.y; // ← niente hover / sin / animTime

            // Button background
            const gradient = ctx.createLinearGradient(
                btn.x, y,
                btn.x + btn.width, y + btn.height
            );
            gradient.addColorStop(0, 'rgba(20, 25, 30, 0.95)');
            gradient.addColorStop(1, 'rgba(30, 35, 40, 0.95)');

            ctx.fillStyle = gradient;
            Utils.drawRoundRect(ctx, btn.x, y, btn.width, btn.height, 12);
            ctx.fill();

            // Button border
            ctx.strokeStyle = btn.mode.color;
            ctx.lineWidth = 3;
            Utils.drawRoundRect(ctx, btn.x, y, btn.width, btn.height, 12);
            ctx.stroke();

            // Inner glow (static)
            ctx.strokeStyle = btn.mode.color + '40';
            ctx.lineWidth = 6;
            Utils.drawRoundRect(
                ctx,
                btn.x + 3, y + 3,
                btn.width - 6, btn.height - 6,
                10
            );
            ctx.stroke();

            // Mode label
            this.graphics.drawText(
                btn.mode.label.toUpperCase(),
                btn.x + btn.width / 2,
                y + 15,
                {
                    size: 16,
                    color: btn.mode.color,
                    align: 'center',
                    bold: true,
                    shadow: true
                }
            );

            // Waves info
            this.graphics.drawText(
                `${btn.mode.waves} Waves`,
                btn.x + btn.width / 2,
                y + 38,
                {
                    size: 20,
                    color: '#ffffff',
                    align: 'center',
                    bold: true,
                    shadow: true
                }
            );

            // Reward
            this.graphics.drawText(
                `🏆 ${btn.mode.reward} Coins Reward`,
                btn.x + btn.width / 2,
                y + 58,
                {
                    size: 14,
                    color: '#ffdd00',
                    align: 'center',
                    shadow: true
                }
            );
        });

        // Footer hint
        this.graphics.drawText('Tap a mode to start!', width / 2, height - 40, {
            size: 12,
            color: 'rgba(255, 255, 255, 0.5)',
            align: 'center'
        });
    }

    handleTap(screenPos) {
        if (!this.isVisible) return false;

        for (const btn of this.buttons) {
            const hoverOffset = Math.sin(this.animTime * 2 + this.buttons.indexOf(btn) * 0.5) * 2;
            const y = btn.y + hoverOffset;

            if (screenPos.x >= btn.x && screenPos.x <= btn.x + btn.width &&
                screenPos.y >= y && screenPos.y <= y + btn.height) {

                this.hide();
                if (this.onModeSelected) {
                    this.onModeSelected(btn.key);
                }
                return true;
            }
        }
        return false;
    }
}
