import { CONFIG } from './config.js';
import { Utils } from './utils.js';

/**
 * Wave Mode Selection Screen
 * Fullscreen challenge selector with polished UI
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

        const buttonWidth = Math.min(320, width * 0.82);
        const modes = Object.entries(CONFIG.WAVE_MODES);
        const modeCount = modes.length;
        const buttonHeight = modeCount > 3 ? 72 : 82;
        const spacing = modeCount > 3 ? 12 : 18;
        const totalHeight = (buttonHeight * modeCount) + (spacing * (modeCount - 1));
        // Account for warning text below EXTREME button
        const hasWarning = modes.some(([, m]) => m.warning);
        const warningSpace = hasWarning ? 22 : 0;
        const startY = (height - totalHeight - warningSpace) / 2 + 30;

        this.buttons = [];

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

        // Full-screen dark background
        ctx.fillStyle = 'rgba(5, 8, 12, 0.98)';
        ctx.fillRect(0, 0, width, height);

        // Subtle diagonal lines pattern
        ctx.save();
        ctx.globalAlpha = 0.03;
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 1;
        for (let i = -height; i < width + height; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + height, height);
            ctx.stroke();
        }
        ctx.restore();

        // Top decorative bar (gold)
        const topBarGrad = ctx.createLinearGradient(0, 0, width, 0);
        topBarGrad.addColorStop(0, 'rgba(255, 221, 0, 0)');
        topBarGrad.addColorStop(0.5, 'rgba(255, 221, 0, 0.4)');
        topBarGrad.addColorStop(1, 'rgba(255, 221, 0, 0)');
        ctx.fillStyle = topBarGrad;
        ctx.fillRect(0, 0, width, 3);

        // Title area
        const titleY = height * 0.06;

        // Title glow
        const titleGlow = ctx.createRadialGradient(width / 2, titleY + 20, 0, width / 2, titleY + 20, 140);
        titleGlow.addColorStop(0, 'rgba(255, 221, 0, 0.10)');
        titleGlow.addColorStop(1, 'rgba(255, 221, 0, 0)');
        ctx.fillStyle = titleGlow;
        ctx.beginPath();
        ctx.arc(width / 2, titleY + 20, 140, 0, Math.PI * 2);
        ctx.fill();

        // Title text
        this.graphics.drawText('⚔️ SELECT CHALLENGE ⚔️', width / 2, titleY + 20, {
            size: 30,
            color: '#ffdd00',
            align: 'center',
            bold: true,
            shadow: true
        });

        // Decorative separator
        const sepY = titleY + 48;
        const sepGrad = ctx.createLinearGradient(width * 0.1, sepY, width * 0.9, sepY);
        sepGrad.addColorStop(0, 'rgba(255, 221, 0, 0)');
        sepGrad.addColorStop(0.3, 'rgba(255, 221, 0, 0.4)');
        sepGrad.addColorStop(0.5, 'rgba(255, 221, 0, 0.7)');
        sepGrad.addColorStop(0.7, 'rgba(255, 221, 0, 0.4)');
        sepGrad.addColorStop(1, 'rgba(255, 221, 0, 0)');
        ctx.strokeStyle = sepGrad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(width * 0.1, sepY);
        ctx.lineTo(width * 0.9, sepY);
        ctx.stroke();

        // Subtitle
        this.graphics.drawText('Win to earn Platform Coins!', width / 2, sepY + 20, {
            size: 13,
            color: 'rgba(255, 255, 255, 0.5)',
            align: 'center'
        });

        // Render buttons
        this.buttons.forEach((btn, index) => {
            const y = btn.y;
            const modeColor = btn.mode.color;

            // Parse the mode color for gradient use
            // Subtle left accent bar glow
            const accentGlow = ctx.createRadialGradient(btn.x - 5, y + btn.height / 2, 0, btn.x - 5, y + btn.height / 2, 60);
            accentGlow.addColorStop(0, modeColor + '20');
            accentGlow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = accentGlow;
            ctx.fillRect(btn.x - 30, y - 10, 60, btn.height + 20);

            // Button background gradient
            const bgGrad = ctx.createLinearGradient(btn.x, y, btn.x + btn.width, y);
            bgGrad.addColorStop(0, 'rgba(15, 20, 30, 0.95)');
            bgGrad.addColorStop(0.05, 'rgba(20, 28, 40, 0.95)');
            bgGrad.addColorStop(1, 'rgba(12, 16, 24, 0.95)');
            ctx.fillStyle = bgGrad;
            Utils.drawRoundRect(ctx, btn.x, y, btn.width, btn.height, 14);
            ctx.fill();

            // Left color accent bar
            ctx.save();
            ctx.beginPath();
            Utils.drawRoundRect(ctx, btn.x, y, btn.width, btn.height, 14);
            ctx.clip();
            ctx.fillStyle = modeColor;
            ctx.fillRect(btn.x, y, 5, btn.height);
            // Top subtle highlight
            const topHL = ctx.createLinearGradient(btn.x, y, btn.x, y + 20);
            topHL.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
            topHL.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = topHL;
            ctx.fillRect(btn.x, y, btn.width, 20);
            ctx.restore();

            // Border
            ctx.strokeStyle = modeColor + '80';
            ctx.lineWidth = 2;
            Utils.drawRoundRect(ctx, btn.x, y, btn.width, btn.height, 14);
            ctx.stroke();

            // Mode label (top-left area)
            this.graphics.drawText(
                btn.mode.label.toUpperCase(),
                btn.x + 22,
                y + 16,
                {
                    size: 13,
                    color: modeColor,
                    align: 'left',
                    bold: true,
                    shadow: true
                }
            );

            // Waves count (large, centered)
            this.graphics.drawText(
                `${btn.mode.waves} Waves`,
                btn.x + btn.width / 2,
                y + btn.height / 2 - 2,
                {
                    size: 24,
                    color: '#ffffff',
                    align: 'center',
                    bold: true,
                    shadow: true
                }
            );

            // Reward (bottom area)
            this.graphics.drawText(
                `🏆 +${btn.mode.reward} Coins`,
                btn.x + btn.width / 2,
                y + btn.height - 14,
                {
                    size: 13,
                    color: '#ffdd00',
                    align: 'center',
                    shadow: true
                }
            );

            // Difficulty dots (top-right corner)
            const dotsCount = index + 1;
            const dotSize = 5;
            const dotSpacing = 12;
            const dotsStartX = btn.x + btn.width - 20 - (dotsCount - 1) * dotSpacing;
            for (let d = 0; d < dotsCount; d++) {
                const dx = dotsStartX + d * dotSpacing;
                const dy = y + 18;
                ctx.fillStyle = modeColor;
                ctx.beginPath();
                ctx.arc(dx, dy, dotSize, 0, Math.PI * 2);
                ctx.fill();
            }

            // Warning text for modes with warnings (e.g., EXTREME)
            if (btn.mode.warning) {
                this.graphics.drawText(
                    btn.mode.warning,
                    width / 2,
                    y + btn.height + 14,
                    {
                        size: 11,
                        color: '#ff8844',
                        align: 'center',
                        shadow: true
                    }
                );
            }
        });

        // Footer
        const footerPulse = 0.4 + Math.sin(this.animTime * 2) * 0.2;
        this.graphics.drawText('Tap a mode to start', width / 2, height - 30, {
            size: 13,
            color: `rgba(255, 255, 255, ${footerPulse})`,
            align: 'center'
        });

        // Bottom decorative bar
        ctx.fillStyle = topBarGrad;
        ctx.fillRect(0, height - 3, width, 3);
    }

    handleTap(screenPos) {
        if (!this.isVisible) return false;

        for (const btn of this.buttons) {
            if (screenPos.x >= btn.x && screenPos.x <= btn.x + btn.width &&
                screenPos.y >= btn.y && screenPos.y <= btn.y + btn.height) {

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
