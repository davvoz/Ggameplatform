import { Utils } from '../utils.js';

export class SettingsRenderer {
    constructor(graphics, canvas, audio = null) {
        this.graphics = graphics;
        this.canvas = canvas;
        this.audio = audio;

        this.showSettingsPopup = false;
        this.settingsPopupButtons = [];
        this.settingsCheckboxes = [];
    }

    toggle() {
        this.showSettingsPopup = !this.showSettingsPopup;
    }

    close() {
        this.showSettingsPopup = false;
    }

    /**
     * Handle a click inside the settings popup.
     * Returns the action string or null.
     */
    handleClick(screenX, screenY) {
        if (!this.showSettingsPopup) return null;

        for (const checkbox of this.settingsCheckboxes) {
            if (screenX >= checkbox.x && screenX <= checkbox.x + checkbox.width &&
                screenY >= checkbox.y && screenY <= checkbox.y + checkbox.height) {
                if (this.audio) {
                    if (checkbox.action === 'music') {
                        this.audio.toggle();
                    } else if (checkbox.action === 'sound') {
                        this.audio.toggleSounds();
                    }
                }
                return 'checkbox';
            }
        }

        for (const button of this.settingsPopupButtons) {
            if (button.disabled) continue;
            if (screenX >= button.x && screenX <= button.x + button.width &&
                screenY >= button.y && screenY <= button.y + button.height) {
                return button.action;
            }
        }

        return null;
    }

    render() {
        const ctx = this.graphics.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        // Full-screen dark background
        ctx.fillStyle = 'rgba(5, 10, 8, 0.97)';
        ctx.fillRect(0, 0, width, height);

        // Subtle grid pattern overlay
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.04)';
        ctx.lineWidth = 1;
        const gridSize = 30;
        for (let gx = 0; gx < width; gx += gridSize) {
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, height);
            ctx.stroke();
        }
        for (let gy = 0; gy < height; gy += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(width, gy);
            ctx.stroke();
        }

        // Top decorative bar
        const barGrad = ctx.createLinearGradient(0, 0, width, 0);
        barGrad.addColorStop(0, 'rgba(0, 255, 136, 0)');
        barGrad.addColorStop(0.5, 'rgba(0, 255, 136, 0.3)');
        barGrad.addColorStop(1, 'rgba(0, 255, 136, 0)');
        ctx.fillStyle = barGrad;
        ctx.fillRect(0, 0, width, 3);

        // Bottom decorative bar
        ctx.fillStyle = barGrad;
        ctx.fillRect(0, height - 3, width, 3);

        // Title area
        const titleY = height * 0.08;

        const titleGlow = ctx.createRadialGradient(width / 2, titleY + 10, 0, width / 2, titleY + 10, 120);
        titleGlow.addColorStop(0, 'rgba(0, 255, 136, 0.12)');
        titleGlow.addColorStop(1, 'rgba(0, 255, 136, 0)');
        ctx.fillStyle = titleGlow;
        ctx.beginPath();
        ctx.arc(width / 2, titleY + 10, 120, 0, Math.PI * 2);
        ctx.fill();

        this.graphics.drawText('⚙️ SETTINGS', width / 2, titleY + 15, {
            size: 36, color: '#ffffff', align: 'center', bold: true, shadow: true
        });

        const lineY = titleY + 45;
        const lineGrad = ctx.createLinearGradient(width * 0.15, lineY, width * 0.85, lineY);
        lineGrad.addColorStop(0, 'rgba(0, 255, 136, 0)');
        lineGrad.addColorStop(0.3, 'rgba(0, 255, 136, 0.6)');
        lineGrad.addColorStop(0.5, 'rgba(0, 255, 136, 1)');
        lineGrad.addColorStop(0.7, 'rgba(0, 255, 136, 0.6)');
        lineGrad.addColorStop(1, 'rgba(0, 255, 136, 0)');
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width * 0.15, lineY);
        ctx.lineTo(width * 0.85, lineY);
        ctx.stroke();

        // Content area
        const contentWidth = Math.min(340, width * 0.85);
        const contentX = (width - contentWidth) / 2;
        let contentY = lineY + 35;

        this.settingsPopupButtons = [];
        this.settingsCheckboxes = [];

        // --- AUDIO SECTION ---
        this.graphics.drawText('AUDIO', contentX + 5, contentY, {
            size: 13, color: 'rgba(0, 255, 136, 0.5)', align: 'left', bold: true
        });
        contentY += 22;

        const audioCardHeight = 110;
        ctx.fillStyle = 'rgba(0, 255, 136, 0.04)';
        Utils.drawRoundRect(ctx, contentX, contentY, contentWidth, audioCardHeight, 12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.15)';
        ctx.lineWidth = 1;
        Utils.drawRoundRect(ctx, contentX, contentY, contentWidth, audioCardHeight, 12);
        ctx.stroke();

        const musicEnabled = this.audio ? this.audio.enabled : true;
        this._renderToggle(contentX + 15, contentY + 15, contentWidth - 30, '🎵 Background Music', 'music', musicEnabled);

        const soundEnabled = this.audio ? this.audio.soundEnabled : true;
        this._renderToggle(contentX + 15, contentY + 65, contentWidth - 30, '🔊 Sound Effects', 'sound', soundEnabled);

        contentY += audioCardHeight + 20;

        // --- DISPLAY SECTION ---
        this.graphics.drawText('DISPLAY', contentX + 5, contentY, {
            size: 13, color: 'rgba(0, 255, 136, 0.5)', align: 'left', bold: true
        });
        contentY += 22;

        const displayCardHeight = 60;
        ctx.fillStyle = 'rgba(0, 255, 136, 0.04)';
        Utils.drawRoundRect(ctx, contentX, contentY, contentWidth, displayCardHeight, 12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.15)';
        ctx.lineWidth = 1;
        Utils.drawRoundRect(ctx, contentX, contentY, contentWidth, displayCardHeight, 12);
        ctx.stroke();

        const isFullscreen = window._gameFullscreenState === true ||
            ((window.PlatformSDK && typeof window.PlatformSDK.isFullscreen === 'function')
                ? window.PlatformSDK.isFullscreen()
                : (document.body.classList.contains('game-fullscreen') || document.body.classList.contains('ios-game-fullscreen')));
        const fullscreenText = isFullscreen ? '🔲 Exit Fullscreen' : '⛶ Enter Fullscreen';
        this._renderButton(contentX + 15, contentY + 10, contentWidth - 30, 40, fullscreenText, 'fullscreen');

        contentY += displayCardHeight + 30;

        // --- ACTION BUTTONS ---
        const buttonHeight = 54;
        this._renderButton(contentX, contentY, contentWidth, buttonHeight, '🚪 Quit Game', 'quit');
        contentY += buttonHeight + 14;
        this._renderButton(contentX, contentY, contentWidth, buttonHeight, '▶ Resume Game', 'close');
    }

    _renderToggle(x, y, toggleWidth, text, action, checked) {
        const ctx = this.graphics.ctx;

        const switchWidth = 52;
        const switchHeight = 28;
        const switchX = x + toggleWidth - switchWidth;
        const switchY = y + 4;

        this.settingsCheckboxes.push({
            x: switchX - 10,
            y: switchY - 5,
            width: switchWidth + 20,
            height: switchHeight + 10,
            action,
            checked
        });

        this.graphics.drawText(text, x, y + switchHeight / 2 + 2, {
            size: 18, color: '#ffffff', align: 'left', baseline: 'middle', bold: false, shadow: true
        });

        const trackColor = checked ? 'rgba(0, 255, 136, 0.4)' : 'rgba(60, 60, 60, 0.8)';
        ctx.fillStyle = trackColor;
        Utils.drawRoundRect(ctx, switchX, switchY, switchWidth, switchHeight, switchHeight / 2);
        ctx.fill();

        ctx.strokeStyle = checked ? 'rgba(0, 255, 136, 0.7)' : 'rgba(100, 100, 100, 0.5)';
        ctx.lineWidth = 1.5;
        Utils.drawRoundRect(ctx, switchX, switchY, switchWidth, switchHeight, switchHeight / 2);
        ctx.stroke();

        const knobRadius = (switchHeight - 6) / 2;
        const knobX = checked ? switchX + switchWidth - knobRadius - 4 : switchX + knobRadius + 4;
        const knobY = switchY + switchHeight / 2;

        if (checked) {
            const knobGlow = ctx.createRadialGradient(knobX, knobY, 0, knobX, knobY, knobRadius + 6);
            knobGlow.addColorStop(0, 'rgba(0, 255, 136, 0.3)');
            knobGlow.addColorStop(1, 'rgba(0, 255, 136, 0)');
            ctx.fillStyle = knobGlow;
            ctx.beginPath();
            ctx.arc(knobX, knobY, knobRadius + 6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = checked ? '#00ff88' : '#888888';
        ctx.beginPath();
        ctx.arc(knobX, knobY, knobRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    _renderButton(x, y, width, height, text, action, disabled = false) {
        const ctx = this.graphics.ctx;

        this.settingsPopupButtons.push({ x, y, width, height, action, disabled });

        if (disabled) {
            ctx.fillStyle = 'rgba(50, 50, 50, 0.5)';
        } else if (action === 'close') {
            const grad = ctx.createLinearGradient(x, y, x, y + height);
            grad.addColorStop(0, 'rgba(0, 200, 100, 0.35)');
            grad.addColorStop(1, 'rgba(0, 150, 75, 0.25)');
            ctx.fillStyle = grad;
        } else if (action === 'quit') {
            const grad = ctx.createLinearGradient(x, y, x, y + height);
            grad.addColorStop(0, 'rgba(220, 100, 0, 0.35)');
            grad.addColorStop(1, 'rgba(180, 60, 0, 0.25)');
            ctx.fillStyle = grad;
        } else {
            const grad = ctx.createLinearGradient(x, y, x, y + height);
            grad.addColorStop(0, 'rgba(30, 40, 50, 0.9)');
            grad.addColorStop(1, 'rgba(20, 30, 40, 0.9)');
            ctx.fillStyle = grad;
        }

        Utils.drawRoundRect(ctx, x, y, width, height, 12);
        ctx.fill();

        let borderColor;
        if (disabled) borderColor = 'rgba(80, 80, 80, 0.5)';
        else if (action === 'close') borderColor = 'rgba(0, 255, 136, 0.6)';
        else if (action === 'quit') borderColor = 'rgba(255, 150, 0, 0.6)';
        else borderColor = 'rgba(0, 255, 136, 0.3)';

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        Utils.drawRoundRect(ctx, x, y, width, height, 12);
        ctx.stroke();

        let textColor;
        if (disabled) textColor = '#666666';
        else if (action === 'close') textColor = '#00ff88';
        else if (action === 'quit') textColor = '#ffaa44';
        else textColor = '#ffffff';

        this.graphics.drawText(text, x + width / 2, y + height / 2, {
            size: action === 'close' ? 20 : 18,
            color: textColor,
            align: 'center',
            baseline: 'middle',
            bold: true,
            shadow: !disabled
        });
    }
}
