import { State } from './State.js';
import {
    DESIGN_WIDTH, DESIGN_HEIGHT,
    COLORS,  TITLE_FONT, UI_FONT,
} from '../config/Constants.js';

const FNT = UI_FONT;

/**
 * Story complete state — the player has defeated all 6 opponents.
 * Celebratory screen with champion title.
 */
export class StoryCompleteState extends State {
    #timer = 0;
    #titleAlpha = 0;
    #buttonsShown = false;

    enter() {
        this.#timer = 0;
        this.#titleAlpha = 0;
        this.#buttonsShown = false;
        this._game.ui.clearButtons();
        this._game.sound.stopMusic();
        this._game.sound.playMatchWin();

        // Report story completion to platform
        this._game.platform.gameOver(6, {
            won: true,
            mode: 'story',
            powerups_collected: this._game.powerupsCollected ?? 0,
        });
    }

    exit() {
        this._game.ui.clearButtons();
    }

    update(dt) {
        this.#timer += dt;
        this.#titleAlpha = Math.min(1, this.#timer / 1000);

        // Confetti
        if (this.#timer < 4000 && Math.random() < 0.12) {
            const colors = ['#ff0044', '#00ffcc', '#ffcc00', '#ff66ff', '#66ff66', '#44aaff'];
            const c = colors[Math.floor(Math.random() * colors.length)];
            this._game.particles.emit(
                Math.random() * DESIGN_WIDTH, -10,
                { count: 1, color: c, speed: 50, life: 3000, gravity: 30 }
            );
        }

        // Champion sparkle
        if (this.#timer < 5000 && Math.random() < 0.1) {
            this._game.particles.sparkle(
                DESIGN_WIDTH / 2 + (Math.random() - 0.5) * 120,
                200 + (Math.random() - 0.5) * 60, 3,
                COLORS.GOLD
            );
        }

        this._game.particles.update(dt);
        this._game.tweens.update(dt);

        if (!this.#buttonsShown && this.#timer > 2500) {
            this.#buttonsShown = true;
            this._game.ui.setButtons([{
                x: DESIGN_WIDTH / 2 - 80, y: 520, w: 160, h: 44,
                label: 'MAIN MENU', action: 'storyMenu',
                color: COLORS.NEON_CYAN, fontSize: 11,
            }]);
            // Wire AFTER setButtons (which clears stateListeners)
            this._game.ui.on('storyMenu', () => {
                this._game.storyLevel = 0;
                this._game.storyPlayerCharId = null;
                this._game.arenaTheme = null;
                this._game.obstacles = [];
                this._game.fsm.transition('menu');
            });
        }
    }

    draw(ctx) {
        const w = DESIGN_WIDTH;
        const h = DESIGN_HEIGHT;

        // Dark background
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, w, h);

        // Subtle radial glow
        const grad = ctx.createRadialGradient(w / 2, 200, 20, w / 2, 200, 200);
        grad.addColorStop(0, 'rgba(255,215,0,0.12)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        this._game.particles.draw(ctx);

        ctx.save();
        ctx.globalAlpha = this.#titleAlpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // CHAMPION
        const wobble = Math.sin(this.#timer / 200) * 3;
        ctx.shadowColor = COLORS.GOLD;
        ctx.shadowBlur = 35;
        ctx.fillStyle = COLORS.GOLD;
        ctx.font = `900 32px ${TITLE_FONT}`;
        ctx.fillText('CHAMPION!', w / 2, 130 + wobble);
        // Bloom
        ctx.globalAlpha = this.#titleAlpha * 0.3;
        ctx.shadowBlur = 60;
        ctx.fillText('CHAMPION!', w / 2, 130 + wobble);
        ctx.globalAlpha = this.#titleAlpha;
        ctx.shadowBlur = 0;

        // Subtitle
        ctx.fillStyle = '#dddddd';
        ctx.font = `bold 14px ${UI_FONT}`;
        ctx.fillText('STORY COMPLETE', w / 2, 180);

        // Summary
        ctx.fillStyle = '#8899aa';
        ctx.font = `600 11px ${FNT}`;
        ctx.fillText('You defeated all 6 opponents!', w / 2, 230);

        // Level trophies
        const trophyY = 300;
        const spacing = 40;
        const startX = w / 2 - 2.5 * spacing;
        ctx.font = `bold 20px ${FNT}`;
        for (let i = 0; i < 6; i++) {
            const alpha = Math.max(0, Math.min(1, (this.#timer - 1000 - i * 200) / 400));
            ctx.globalAlpha = alpha;
            ctx.fillStyle = COLORS.GOLD;
            ctx.fillText('\u2605', startX + i * spacing, trophyY);
        }

        ctx.restore();

        // Buttons
        this._game.ui.drawButtons(ctx);

        // Scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        for (let i = 0; i < h; i += 3) ctx.fillRect(0, i, w, 1);
    }
}
