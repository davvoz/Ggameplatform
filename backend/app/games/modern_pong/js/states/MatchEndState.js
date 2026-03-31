import { State } from './State.js';
import {
    DESIGN_WIDTH, DESIGN_HEIGHT,
    COLORS, TITLE_FONT, UI_FONT,
} from '../config/Constants.js';
import { getStoryLevel } from '../story/StoryModeConfig.js';

/**
 * Match end state — winner celebration, final scores, coin payout.
 */
export class MatchEndState extends State {
    #timer = 0;
    #winner = null;  // 'top' | 'bottom'
    #topScore = 0;
    #bottomScore = 0;
    #titleAlpha = 0;
    #resultReported = false;
    #buttonsShown = false;
    #waitingRematch = false;   // true after clicking Play Again, awaiting opponent

    enter(data) {
        this.#winner = data?.winner;      // 'top' | 'bottom'
        this.#topScore = data?.topScore ?? 0;
        this.#bottomScore = data?.bottomScore ?? 0;
        this.#timer = 0;
        this.#titleAlpha = 0;
        this.#resultReported = false;
        this.#buttonsShown = false;
        this.#waitingRematch = false;

        this._game.ui.clearButtons();

        // Wire network events for rematch sync
        if (!this._game.isVsCPU) {
            this.#wireRematchNetwork();
        }

        // Winner celebration
        const winChar = this.#winner === 'bottom'
            ? this._game.bottomPlayer
            : this._game.topPlayer;
        winChar.playCelebrate();

        // Sound — use correct perspective for guest
        const playerWon = this._game.playerIsBottom
            ? (this.#winner === 'bottom')
            : (this.#winner === 'top');
        this._game.sound.stopMusic();
        if (playerWon) {
            this._game.sound.playMatchWin();
        } else {
            this._game.sound.playMatchLose();
        }

        this.#reportResult();
    }

    exit() {
        this._game.ui.clearButtons();
        if (!this._game.isVsCPU) {
            this._game.network?.off('rematchAccepted');
            this._game.network?.off('rematchRequested');
            this._game.network?.off('opponentLeft');
        }
    }

    /* ---------- platform integration ---------- */

    #reportResult() {
        if (this.#resultReported) return;
        this.#resultReported = true;

        const didWin = this._game.playerIsBottom
            ? (this.#winner === 'bottom')
            : (this.#winner === 'top');
        const platform = this._game.platform;

        // Session end
        platform.gameOver(
            didWin ? this.#bottomScore : this.#topScore,
            { winner: didWin, mode: this._game.isVsCPU ? 'cpu' : 'multiplayer' }
        );

        // Multiplayer bet payout
        if (!this._game.isVsCPU && this._game.betAmount > 0) {
            if (didWin) {
                platform.awardCoins(this._game.betAmount * 2, 'Pong bet won');
            }
        }
    }

    /* ---------- buttons ---------- */

    #onPlayAgain() {
        if (this.#waitingRematch) return;   // already requested

        const storyMode = this._game.matchData?.mode === 'story';

        if (storyMode) {
            // Retry current story level
            const level = getStoryLevel(this._game.storyLevel);
            if (level) {
                this._game.fsm.transition('storyIntro', { level });
            } else {
                this._game.fsm.transition('menu');
            }
            return;
        }

        if (this._game.isVsCPU) {
            this._game.fsm.transition('characterSelect', { mode: 'cpu' });
        } else {
            // Multiplayer — send rematch request, wait for opponent
            this.#waitingRematch = true;
            this._game.network?.send({ type: 'rematch' });
        }
    }

    /* ---------- rematch network ---------- */

    #wireRematchNetwork() {
        // Opponent also clicked Play Again — both agreed, go to char select
        this._game.network.on('rematchAccepted', () => {
            const md = this._game.matchData ?? {};
            this._game.fsm.transition('multiCharSelect', {
                roundsToWin: md.roundsToWin ?? this._game.roundsToWin,
                betAmount: md.betAmount ?? this._game.betAmount,
                stage: md.theme ? { theme: md.theme, obstacles: md.obstacles ?? [], name: md.stageName ?? 'STAGE' } : null,
                opponentName: md.opponentName ?? 'Opponent',
            });
        });

        // Opponent wants rematch but we haven't clicked yet — just show visual hint
        this._game.network.on('rematchRequested', () => {
            // No action needed — opponent is waiting, we'll send rematch when we click
        });

        // Opponent disconnected
        this._game.network.on('opponentLeft', () => {
            this._game.network?.disconnect();
            this._game.fsm.transition('menu');
        });
    }

    #onMenu() {
        this._game.storyLevel = 0;
        this._game.storyPlayerCharId = null;
        this._game.arenaTheme = null;
        this._game.obstacles = [];
        if (!this._game.isVsCPU) {
            this._game.network?.disconnect();
        }
        this._game.fsm.transition('menu');
    }

    /* ---------- loop ---------- */

    update(dt) {
        this.#timer += dt;
        this.#titleAlpha = Math.min(1, this.#timer / 800);

        // Winner particles
        if (this.#timer < 3000 && Math.random() < 0.15) {
            const winChar = this.#winner === 'bottom'
                ? this._game.bottomPlayer
                : this._game.topPlayer;
            this._game.particles.sparkle(
                winChar.x, winChar.y - 20, 4,
                winChar.data.palette.accent
            );
        }

        // Confetti across the screen
        if (this.#timer < 2000 && Math.random() < 0.08) {
            const colors = ['#ff0044', '#00ffcc', '#ffcc00', '#ff66ff', '#66ff66'];
            const c = colors[Math.floor(Math.random() * colors.length)];
            this._game.particles.emit(
                Math.random() * DESIGN_WIDTH,
                -10,
                { count: 1, color: c, speed: 40, life: 2500, gravity: 30 }
            );
        }

        if (this._game.topPlayer) this._game.topPlayer.update(dt);
        if (this._game.bottomPlayer) this._game.bottomPlayer.update(dt);
        this._game.particles.update(dt);
        this._game.tweens.update(dt);

        // Show buttons after a delay
        if (!this.#buttonsShown && this.#timer > 1500) {
            this.#buttonsShown = true;
            const isStory = this._game.matchData?.mode === 'story';
            const playLabel = isStory ? 'RETRY LEVEL' : 'PLAY AGAIN';
            this._game.ui.setButtons([
                {
                    x: DESIGN_WIDTH / 2 - 70, y: 480, w: 140, h: 36,
                    label: playLabel, action: 'playAgain',
                    color: COLORS.NEON_GREEN, fontSize: 10,
                },
                {
                    x: DESIGN_WIDTH / 2 - 70, y: 530, w: 140, h: 36,
                    label: 'MENU', action: 'backToMenu',
                    color: COLORS.NEON_PINK, fontSize: 10,
                },
            ]);
            // Wire AFTER setButtons (which clears stateListeners)
            this._game.ui.on('playAgain', () => this.#onPlayAgain());
            this._game.ui.on('backToMenu', () => this.#onMenu());
        }
    }

    draw(ctx) {
        // Dark background
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        // Radial glow behind result
        const didWin = this._game.playerIsBottom
            ? (this.#winner === 'bottom')
            : (this.#winner === 'top');
        const glowColor = didWin ? 'rgba(57,255,20,0.08)' : 'rgba(255,45,120,0.08)';
        const grad = ctx.createRadialGradient(
            DESIGN_WIDTH / 2, 180, 20,
            DESIGN_WIDTH / 2, 180, 200
        );
        grad.addColorStop(0, glowColor);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

        // Scanlines
        ctx.fillStyle = 'rgba(255,255,255,0.012)';
        for (let y = 0; y < DESIGN_HEIGHT; y += 3) {
            ctx.fillRect(0, y, DESIGN_WIDTH, 1);
        }

        // Characters
        if (this._game.topPlayer) this._game.topPlayer.draw(ctx);
        if (this._game.bottomPlayer) this._game.bottomPlayer.draw(ctx);
        this._game.particles.draw(ctx);

        ctx.save();
        ctx.globalAlpha = this.#titleAlpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Result label
        const label = didWin ? 'VICTORY' : 'DEFEAT';
        const labelColor = didWin ? COLORS.NEON_GREEN : COLORS.NEON_PINK;

        ctx.shadowColor = labelColor;
        ctx.shadowBlur = 35;
        ctx.fillStyle = labelColor;
        ctx.font = `900 36px ${TITLE_FONT}`;
        ctx.fillText(label, DESIGN_WIDTH / 2, 160);
        // Bloom
        ctx.globalAlpha = this.#titleAlpha * 0.3;
        ctx.shadowBlur = 60;
        ctx.fillText(label, DESIGN_WIDTH / 2, 160);
        ctx.globalAlpha = this.#titleAlpha;
        ctx.shadowBlur = 0;

        // Final scores
        ctx.font = `bold 22px ${UI_FONT}`;
        ctx.fillStyle = COLORS.NEON_PINK;
        ctx.fillText(String(this.#topScore), DESIGN_WIDTH / 2 - 40, 220);
        ctx.fillStyle = COLORS.WHITE;
        ctx.fillText('-', DESIGN_WIDTH / 2, 220);
        ctx.fillStyle = COLORS.NEON_CYAN;
        ctx.fillText(String(this.#bottomScore), DESIGN_WIDTH / 2 + 40, 220);

        // Character names
        ctx.font = `bold 12px ${UI_FONT}`;
        ctx.fillStyle = COLORS.NEON_PINK;
        const topName = this._game.topPlayer?.data?.name ?? 'CPU';
        ctx.fillText(topName, DESIGN_WIDTH / 2 - 40, 246);
        ctx.fillStyle = COLORS.NEON_CYAN;
        const botName = this._game.bottomPlayer?.data?.name ?? 'YOU';
        ctx.fillText(botName, DESIGN_WIDTH / 2 + 40, 246);

        // Match summary
        ctx.font = `700 10px ${UI_FONT}`;
        ctx.fillStyle = COLORS.TEXT_DIM;
        const modeText = this._game.isVsCPU ? 'VS CPU' : 'MULTIPLAYER';
        ctx.fillText(modeText, DESIGN_WIDTH / 2, 280);

        // Bet info (multiplayer)
        if (!this._game.isVsCPU && this._game.betAmount > 0) {
            const betText = didWin
                ? `+${this._game.betAmount * 2} coins!`
                : `-${this._game.betAmount} coins`;
            const betCol = didWin ? COLORS.NEON_GREEN : COLORS.NEON_PINK;
            ctx.font = `bold 14px ${UI_FONT}`;
            ctx.fillStyle = betCol;
            ctx.fillText(betText, DESIGN_WIDTH / 2, 300);
        }

        ctx.globalAlpha = 1;
        ctx.restore();

        // Draw buttons (already shown via setButtons after delay)
        this._game.ui.drawButtons(ctx);

        // "Waiting for opponent..." overlay when rematch requested
        if (this.#waitingRematch) {
            ctx.save();
            ctx.fillStyle = 'rgba(5,5,16,0.70)';
            ctx.fillRect(DESIGN_WIDTH / 2 - 90, 470, 180, 55);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = COLORS.NEON_CYAN;
            ctx.font = `bold 10px ${UI_FONT}`;
            const dots = '.'.repeat(Math.floor(this.#timer / 500) % 4);
            ctx.fillText('WAITING FOR OPPONENT' + dots, DESIGN_WIDTH / 2, 498);
            ctx.restore();
        }
    }
}
