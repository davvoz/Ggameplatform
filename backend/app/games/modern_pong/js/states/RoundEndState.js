import { State } from './State.js';
import {
    DESIGN_WIDTH, DESIGN_HEIGHT,
    ARENA_TOP, ARENA_BOTTOM,
    COLORS, ROUND_END_DELAY, TITLE_FONT, UI_FONT,
} from '../config/Constants.js';

/**
 * Round end state — brief celebration after a goal.
 * If the new score puts the match in DEUCE or ADVANTAGE territory,
 * a dramatic animated banner is shown after the "GOAL!" text.
 */
export class RoundEndState extends State {
    #timer = 0;
    #scorerId = null;
    #topScore = 0;
    #bottomScore = 0;
    #textScale = 0;
    /** Tracks if this is the first frame we entered deuce (for a burst effect) */
    #deuceParticlesDone = false;

    enter(data) {
        this.#scorerId = data?.scorerId;
        this.#topScore = data?.topScore ?? 0;
        this.#bottomScore = data?.bottomScore ?? 0;
        this.#timer = 0;
        this.#textScale = 0;
        this.#deuceParticlesDone = false;
        this._game.ui.clearButtons();

        // Handle opponent disconnect between rounds
        if (!this._game.isVsCPU) {
            this._game.network.on('opponentLeft', () => {
                const betAmount = this._game.betAmount ?? 0;
                if (betAmount > 0) {
                    this._game.platform.awardCoins(betAmount * 2, 'Pong bet won - opponent left');
                }
                this._game.network.disconnect();
                this._game.fsm.transition('menu');
            });
        }

        // Celebrate
        const scorer = this.#scorerId === 'bottom'
            ? this._game.bottomPlayer
            : this._game.topPlayer;
        scorer.playCelebrate();
    }

    exit() {
        if (!this._game.isVsCPU) {
            this._game.network?.off('opponentLeft');
        }
    }

    update(dt) {
        this.#timer += dt;
        this.#textScale = Math.min(1, this.#textScale + dt / 200);

        // Particles while celebrating
        if (this.#timer < 1500 && Math.random() < 0.1) {
            const scorer = this.#scorerId === 'bottom'
                ? this._game.bottomPlayer
                : this._game.topPlayer;
            this._game.particles.sparkle(
                scorer.x, scorer.y - 20, 3,
                scorer.data.palette.accent
            );
        }

        // Deuce sparkle burst (one-time at ~800 ms)
        if (!this.#deuceParticlesDone && this.#timer >= 800) {
            if (this._game.isDeuce || this._game.advantage) {
                this.#deuceParticlesDone = true;
                const cy = (ARENA_TOP + ARENA_BOTTOM) / 2;
                const color = this._game.isDeuce ? '#ff5028' : '#ffcc00';
                this._game.particles.emit(DESIGN_WIDTH / 2, cy + 50, 25, {
                    colors: [color, '#ffffff'],
                    speedMin: 40,
                    speedMax: 150,
                });
                this._game.shake.trigger(6, 200);
            }
        }

        this._game.topPlayer.update(dt);
        this._game.bottomPlayer.update(dt);
        this._game.particles.update(dt);
        this._game.tweens.update(dt);

        // Extend delay when deuce/advantage banner is shown
        const delay = (this._game.isDeuce || this._game.advantage)
            ? ROUND_END_DELAY + 1000
            : ROUND_END_DELAY;

        if (this.#timer >= delay) {
            this._game.startNextRound();
        }
    }

    draw(ctx) {
        this._game.drawArena(ctx);

        // Characters
        this._game.topPlayer.draw(ctx);
        this._game.bottomPlayer.draw(ctx);
        this._game.particles.draw(ctx);

        // Overlay
        ctx.save();
        const overlayAlpha = Math.min(0.4, this.#timer / 1000);
        ctx.fillStyle = `rgba(0,0,0,${overlayAlpha})`;
        ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        // Score text
        const text = 'GOAL!';
        const color = this.#scorerId === 'bottom' ? COLORS.NEON_CYAN : COLORS.NEON_PINK;
        const size = Math.round(32 * this.#textScale);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = color;
        ctx.shadowBlur = 25;
        ctx.fillStyle = color;
        ctx.font = `900 ${size}px ${TITLE_FONT}`;

        const wobble = Math.sin(this.#timer / 100) * 3;
        ctx.fillText(text, DESIGN_WIDTH / 2, 350 + wobble);
        // Bloom
        ctx.globalAlpha = 0.3;
        ctx.shadowBlur = 40;
        ctx.fillText(text, DESIGN_WIDTH / 2, 350 + wobble);
        ctx.globalAlpha = 1;

        // Score display
        ctx.shadowBlur = 0;
        ctx.font = `bold 20px ${UI_FONT}`;
        ctx.fillStyle = COLORS.NEON_PINK;
        ctx.fillText(String(this.#topScore), DESIGN_WIDTH / 2 - 40, 310);
        ctx.fillStyle = COLORS.WHITE;
        ctx.fillText('-', DESIGN_WIDTH / 2, 310);
        ctx.fillStyle = COLORS.NEON_CYAN;
        ctx.fillText(String(this.#bottomScore), DESIGN_WIDTH / 2 + 40, 310);

        ctx.restore();

        // Deuce / Advantage banner (appears after 700 ms with scale-in)
        this.#drawDeuceBanner(ctx);
    }

    /* ----------  dramatic deuce / advantage banner  ---------- */
    #drawDeuceBanner(ctx) {
        const game = this._game;
        const isDeuce = game.isDeuce;
        const adv = game.advantage;
        if (!isDeuce && !adv) return;

        const bannerDelay = 700;          // ms before banner starts appearing
        if (this.#timer < bannerDelay) return;

        const progress = Math.min(1, (this.#timer - bannerDelay) / 400); // 400 ms scale-in
        const eased = 1 - Math.pow(1 - progress, 3);                    // ease-out cubic
        const t = performance.now();

        const cx = DESIGN_WIDTH / 2;
        const cy = 415;

        ctx.save();

        // --- background stripe ---
        const stripeH = 42 * eased;
        const stripeColor = isDeuce
            ? `rgba(255,50,0,${0.25 * eased})`
            : `rgba(255,204,0,${0.2 * eased})`;
        ctx.fillStyle = stripeColor;
        ctx.fillRect(0, cy - stripeH / 2, DESIGN_WIDTH, stripeH);

        // --- glowing text ---
        const pulse = 0.9 + 0.1 * Math.sin(t / 150);
        const fontSize = Math.round(22 * eased * pulse);
        const glowSize = 14 + 8 * Math.sin(t / 200);

        let label, primary, secondary;
        if (isDeuce) {
            label = '\u26A1 DEUCE! \u26A1';
            primary = '#ff5028';
            secondary = '#ff3300';
        } else {
            const isPlayerBottom = game.isVsCPU || game.isHost;
            const bottomAdvLabel = isPlayerBottom ? 'YOU' : (game.bottomPlayer?.data?.name ?? 'P2');
            const topAdvLabel = game.isVsCPU ? 'CPU' : (isPlayerBottom ? (game.topPlayer?.data?.name ?? 'P2') : 'YOU');
            const who = adv === 'bottom' ? bottomAdvLabel : topAdvLabel;
            label = '\u25B6 ADVANTAGE ' + who + ' \u25C0';
            primary = adv === 'bottom' ? '#00f0ff' : '#ff00aa';
            secondary = primary;
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${fontSize}px ${TITLE_FONT}`;
        ctx.fillStyle = primary;
        ctx.shadowColor = secondary;
        ctx.shadowBlur = glowSize;
        ctx.fillText(label, cx, cy);

        // bloom pass
        ctx.globalAlpha = 0.3;
        ctx.shadowBlur = glowSize + 10;
        ctx.fillText(label, cx, cy);

        ctx.restore();
    }
}
