import { State } from './State.js';
import { DESIGN_WIDTH, COLORS, COUNTDOWN_SECONDS, TITLE_FONT } from '../config/Constants.js';


/**
 * Countdown state — 3, 2, 1, GO! before match starts.
 */
export class CountdownState extends State {
    #timer = 0;
    #currentCount = 0;
    #matchData = null;
    #scale = 1;
    #lastCount = -1;

    enter(data) {
        this.#matchData = data;
        this.#timer = 0;
        this.#currentCount = COUNTDOWN_SECONDS;
        this.#lastCount = -1;
        this.#scale = 1;
        this._game.sound.stopMusic();
        this._game.setupMatch(data);
        this._game.ui.clearButtons();
    }

    exit() { /* no-op */ }

    update(dt) {
        this.#timer += dt;
        const seconds = COUNTDOWN_SECONDS - Math.floor(this.#timer / 1000);

        if (seconds !== this.#currentCount && seconds >= 0) {
            this.#currentCount = seconds;
            this.#scale = 2;
        }

        // Play tick / go sound
        if (this.#currentCount !== this.#lastCount) {
            this.#lastCount = this.#currentCount;
            if (this.#currentCount > 0) {
                this._game.sound.playCountdownTick();
            } else if (this.#currentCount === 0) {
                this._game.sound.playCountdownGo();
            }
        }

        // Animate scale
        if (this.#scale > 1) {
            this.#scale = Math.max(1, this.#scale - dt / 300);
        }

        // Transition to playing
        if (this.#timer >= (COUNTDOWN_SECONDS + 0.5) * 1000) {
            this._game.fsm.transition('playing', this.#matchData);
        }
    }

    draw(ctx) {
        // Draw the arena preview
        this._game.drawArena(ctx);

        // Overlay
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, DESIGN_WIDTH, 700);

        // Countdown text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const text = this.#currentCount > 0 ? String(this.#currentCount) : 'GO!';
        const color = this.#currentCount > 0 ? COLORS.WHITE : COLORS.NEON_GREEN;
        const fontSize = Math.round(48 * this.#scale);

        ctx.shadowColor = color;
        ctx.shadowBlur = 30;
        ctx.fillStyle = color;
        ctx.font = `900 ${fontSize}px ${TITLE_FONT}`;
        ctx.fillText(text, DESIGN_WIDTH / 2, 350);

        // Bloom pass
        ctx.globalAlpha = 0.3;
        ctx.shadowBlur = 50;
        ctx.fillText(text, DESIGN_WIDTH / 2, 350);

        ctx.restore();
    }
}
