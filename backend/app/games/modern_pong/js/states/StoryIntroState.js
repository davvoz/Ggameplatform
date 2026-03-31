import { State } from './State.js';
import {
    DESIGN_WIDTH, DESIGN_HEIGHT,
    COLORS, FONT_FAMILY, TITLE_FONT, UI_FONT,
} from '../config/Constants.js';
import { CHARACTERS } from '../characters/CharacterData.js';
import { SpriteGenerator } from '../characters/SpriteGenerator.js';
import { BackgroundRenderer } from '../rendering/BackgroundRenderer.js';

const FNT = UI_FONT;

/**
 * Story intro state — dramatic reveal of the next opponent before each level.
 * Shows level number, opponent character, title, themed arena preview.
 */
export class StoryIntroState extends State {
    #timer = 0;
    #level = null;     // StoryModeConfig level object
    #portrait = null;
    #phase = 0;

    enter(data) {
        this.#level = data.level;
        this.#timer = 0;
        this.#phase = 0;

        const charData = CHARACTERS.find(c => c.id === this.#level.opponentId);
        this.#portrait = charData
            ? SpriteGenerator.generatePortrait(charData, 100)
            : null;

        this._game.ui.clearButtons();
        this._game.sound.stopMusic();

        // Show "FIGHT" button after reveal animation
        setTimeout(() => {
            if (this._game.fsm.currentName !== 'storyIntro') return;
            this._game.ui.setButtons([{
                x: DESIGN_WIDTH / 2 - 80, y: 580, w: 160, h: 46,
                label: 'FIGHT!', action: 'storyFight',
                color: this.#level.theme.accent, fontSize: 14,
            }]);
            this._game.ui.on('storyFight', () => this.#startFight());
        }, 2000);
    }

    exit() {
        this._game.ui.clearButtons();
    }

    update(dt) {
        this.#timer += dt;
        this.#phase += dt / 1000;
    }

    draw(ctx) {
        const level = this.#level;
        const theme = level.theme;
        const t = this.#timer;
        const w = DESIGN_WIDTH;
        const h = DESIGN_HEIGHT;

        // Themed background (dimmed)
        BackgroundRenderer.drawThemedArena(ctx, theme);
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // -- LEVEL NUMBER (slides in from left) --
        const levelSlide = Math.min(1, t / 600);
        const levelX = -100 + (w / 2 + 100) * this.#easeOutCubic(levelSlide);

        ctx.globalAlpha = levelSlide;
        ctx.fillStyle = theme.accent;
        ctx.shadowColor = theme.accent;
        ctx.shadowBlur = 12;
        ctx.font = `bold 12px ${FONT_FAMILY}`;
        ctx.fillText(`LEVEL ${level.level}`, levelX, 80);

        // -- THEME NAME --
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#aabbcc';
        ctx.font = `bold 9px ${FNT}`;
        ctx.fillText(theme.name, levelX, 105);

        // -- TITLE (fades in) --
        const titleAlpha = Math.max(0, Math.min(1, (t - 400) / 600));
        ctx.globalAlpha = titleAlpha;
        ctx.fillStyle = COLORS.WHITE;
        ctx.shadowColor = theme.accent;
        ctx.shadowBlur = 16;
        ctx.font = `900 18px ${TITLE_FONT}`;
        ctx.fillText(level.title, w / 2, 155);
        ctx.shadowBlur = 0;

        // -- SUBTITLE --
        ctx.fillStyle = '#8899aa';
        ctx.font = `10px ${FNT}`;
        ctx.fillText(level.subtitle, w / 2, 185);

        // -- OPPONENT PORTRAIT (scales in) --
        const portraitScale = Math.max(0, Math.min(1, (t - 800) / 500));
        if (this.#portrait && portraitScale > 0) {
            ctx.globalAlpha = portraitScale;
            const scale = 0.3 + 0.7 * this.#easeOutBack(portraitScale);
            const pw = 100 * scale;
            const ph = 100 * scale;
            ctx.drawImage(
                this.#portrait,
                w / 2 - pw / 2,
                290 - ph / 2,
                pw, ph,
            );
        }

        // -- VS label --
        const vsAlpha = Math.max(0, Math.min(1, (t - 1000) / 400));
        ctx.globalAlpha = vsAlpha;
        ctx.fillStyle = COLORS.NEON_PINK;
        ctx.shadowColor = COLORS.NEON_PINK;
        ctx.shadowBlur = 10;
        ctx.font = `900 28px ${TITLE_FONT}`;
        ctx.fillText('VS', w / 2, 220);
        ctx.shadowBlur = 0;

        // -- Opponent name --
        const charData = CHARACTERS.find(c => c.id === level.opponentId);
        if (charData) {
            ctx.fillStyle = charData.palette.accent;
            ctx.font = `bold 16px ${TITLE_FONT}`;
            ctx.fillText(charData.name.toUpperCase(), w / 2, 370);

            ctx.fillStyle = '#7788aa';
            ctx.font = `9px ${FNT}`;
            ctx.fillText(charData.title, w / 2, 395);
        }

        // -- Difficulty indicator --
        const diffAlpha = Math.max(0, Math.min(1, (t - 1400) / 400));
        ctx.globalAlpha = diffAlpha;
        ctx.fillStyle = this.#difficultyColor(level.aiDifficulty);
        ctx.font = `bold 10px ${FNT}`;
        ctx.fillText(`DIFFICULTY: ${level.aiDifficulty}`, w / 2, 440);

        // -- Obstacle count hint --
        const numObs = level.obstacles.length;
        if (numObs > 0) {
            ctx.fillStyle = '#667788';
            ctx.font = `9px ${FNT}`;
            ctx.fillText(`${numObs} OBSTACLE${numObs > 1 ? 'S' : ''} ON FIELD`, w / 2, 465);
        }

        // -- Level progress dots --
        ctx.globalAlpha = diffAlpha;
        this.#drawProgressDots(ctx, level.level, w / 2, 520, theme.accent);

        ctx.restore();

        // Buttons
        this._game.ui.drawButtons(ctx);

        // Scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        for (let i = 0; i < h; i += 3) ctx.fillRect(0, i, w, 1);
    }

    /* --- Private --- */

    #startFight() {
        const level = this.#level;
        this._game.sound.playConfirm();
        this._game.fsm.transition('countdown', {
            mode: 'story',
            playerCharId: this._game.storyPlayerCharId,
            opponentCharId: level.opponentId,
            aiDifficulty: level.aiDifficulty,
            roundsToWin: level.roundsToWin,
            storyLevel: level.level,
            theme: level.theme,
            obstacles: level.obstacles,
        });
    }

    #difficultyColor(diff) {
        if (diff === 'EASY') return '#4ade80';
        if (diff === 'MEDIUM') return '#fbbf24';
        return '#f87171';
    }

    #drawProgressDots(ctx, current, cx, cy, accent) {
        const total = 6;
        const spacing = 18;
        const startX = cx - (total - 1) * spacing / 2;

        for (let i = 1; i <= total; i++) {
            const dx = startX + (i - 1) * spacing;
            ctx.beginPath();
            if (i < current) {
                ctx.fillStyle = accent;
                ctx.arc(dx, cy, 4, 0, Math.PI * 2);
                ctx.fill();
            } else if (i === current) {
                ctx.fillStyle = accent;
                ctx.shadowColor = accent;
                ctx.shadowBlur = 8;
                ctx.arc(dx, cy, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            } else {
                ctx.strokeStyle = '#445566';
                ctx.lineWidth = 1;
                ctx.arc(dx, cy, 4, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    #easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    #easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
}
