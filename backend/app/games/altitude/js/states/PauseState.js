/**
 * PauseState - Simple pause overlay
 * Allows resuming or returning to menu.
 */

import { State } from './State.js';
import { DESIGN_WIDTH, DESIGN_HEIGHT, COLORS, FONTS } from '../config/Constants.js';

export class PauseState extends State {
    #selectedOption = 0;
    #options = ['RESUME', 'SHOP', 'MENU'];
    #animTime = 0;
    #backgroundAlpha = 0;

    enter() {
        this.#selectedOption = 0;
        this.#animTime = 0;
        this.#backgroundAlpha = 0;
    }

    exit() {
        // Nothing to clean up
    }

    update(dt) {
        this.#animTime += dt;

        // Fade in background
        this.#backgroundAlpha = Math.min(0.8, this.#backgroundAlpha + dt * 3);

        const input = this._game.input;

        // Navigation
        if (input.upJustPressed || input.leftJustPressed) {
            this.#selectedOption = (this.#selectedOption - 1 + this.#options.length) % this.#options.length;
            this._game.sound.playSelect();
            input.consumeUp();
            input.consumeLeft();
        }
        if (input.downJustPressed || input.rightJustPressed) {
            this.#selectedOption = (this.#selectedOption + 1) % this.#options.length;
            this._game.sound.playSelect();
            input.consumeDown();
            input.consumeRight();
        }

        // Selection
        if (input.jumpJustPressed) {
            this.#selectOption();
            input.consumeJump();
        }

        // Quick resume with pause button
        if (input.pauseJustPressed) {
            input.consumePause();
            this._game.fsm.transition('playing');
        }
    }

    #selectOption() {
        this._game.sound.playConfirm();

        switch (this.#options[this.#selectedOption]) {
            case 'RESUME':
                this._game.fsm.transition('playing');
                break;
            case 'SHOP':
                this._game.openShop('playing');
                break;
            case 'MENU':
                this._game.endSession();
                this._game.fsm.transition('menu');
                break;
        }
    }

    draw(ctx) {
        // Semi-transparent overlay
        ctx.fillStyle = `rgba(0, 0, 0, ${this.#backgroundAlpha})`;
        ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        // Pause panel
        this.#drawPausePanel(ctx);

        // Options
        this.#drawOptions(ctx);

        // Current stats
        this.#drawStats(ctx);
    }

    #drawPausePanel(ctx) {
        ctx.save();

        const panelWidth = 250;
        const panelHeight = 250;
        const x = (DESIGN_WIDTH - panelWidth) / 2;
        const y = (DESIGN_HEIGHT - panelHeight) / 2 - 20;

        // Panel background
        ctx.fillStyle = COLORS.PANEL_BG;
        ctx.fillRect(x, y, panelWidth, panelHeight);

        // Border
        ctx.strokeStyle = COLORS.NEON_CYAN;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, panelWidth, panelHeight);

        // Title
        const bounce = Math.sin(this.#animTime * 3) * 3;
        ctx.fillStyle = COLORS.NEON_CYAN;
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', DESIGN_WIDTH / 2, y + 50 + bounce);

        // Decorative line
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 30, y + 70);
        ctx.lineTo(x + panelWidth - 30, y + 70);
        ctx.stroke();

        ctx.restore();
    }

    #drawOptions(ctx) {
        ctx.save();

        const centerX = DESIGN_WIDTH / 2;
        const startY = DESIGN_HEIGHT / 2 + 10;
        const buttonWidth = 160;
        const buttonHeight = 40;
        const spacing = 15;

        this.#options.forEach((option, i) => {
            const y = startY + i * (buttonHeight + spacing);
            const x = centerX - buttonWidth / 2;
            const isSelected = i === this.#selectedOption;

            // Button background
            if (isSelected) {
                ctx.fillStyle = COLORS.NEON_CYAN;
                ctx.fillRect(x, y, buttonWidth, buttonHeight);

                // Glow effect
                ctx.shadowColor = COLORS.NEON_CYAN;
                ctx.shadowBlur = 15;
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(x, y, buttonWidth, buttonHeight);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, buttonWidth, buttonHeight);
            }

            // Button text
            ctx.shadowBlur = 0;
            ctx.fillStyle = isSelected ? COLORS.BG_PRIMARY : COLORS.UI_TEXT;
            ctx.font = isSelected ? 'bold 16px monospace' : '16px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(option, centerX, y + buttonHeight / 2);
        });

        ctx.restore();
    }

    #drawStats(ctx) {
        ctx.save();

        const y = DESIGN_HEIGHT / 2 + 195;

        ctx.fillStyle = COLORS.UI_TEXT_DIM;
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';

        // Current score
        ctx.fillText(`Score: ${Math.floor(this._game.score).toLocaleString()}`, DESIGN_WIDTH / 2 - 70, y);

        // Current altitude
        ctx.fillText(`Altitude: ${Math.floor(this._game.altitude)}m`, DESIGN_WIDTH / 2 + 70, y);

        // Instructions
        ctx.fillStyle = COLORS.UI_TEXT_DIM;
        ctx.fillText('↑ ↓ Select  |  SPACE Confirm  |  ESC Resume', DESIGN_WIDTH / 2, y + 25);

        ctx.restore();
    }
}
