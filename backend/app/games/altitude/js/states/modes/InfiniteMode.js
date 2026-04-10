/**
 * InfiniteMode — Strategy for infinite/endless climbing.
 *
 * Handles procedural screen generation, checkpoint timing, and medal awards.
 */

import { GameMode } from './GameMode.js';
import { TimeBonusCalculator } from '../../systems/TimeBonusCalculator.js';
import { generateInfiniteScreen } from '../../config/LevelData.js';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../../config/Constants.js';

/** How many screens per checkpoint interval. */
const CHECKPOINT_INTERVAL = 5;

export class InfiniteMode extends GameMode {
    #screensLoaded   = 0;
    #timer           = 0;
    #lastCpTime      = 0;
    #screenCleared   = 0;
    #checkpointAnim  = null;

    get isInfinite()       { return true; }
    get levelTotalClimb()  { return -1; }
    get levelGoalY()       { return -Infinity; }
    get parScreenCount()   { return 1; }
    get levelTimer()       { return this.#timer; }

    get infScreenTimer()   { return this.#timer; }
    get infLastCpTime()    { return this.#lastCpTime; }
    get infScreenCleared() { return this.#screenCleared; }
    get infCheckpointAnim() { return this.#checkpointAnim; }

    init(entities, stats, game) {
        entities.addStartPlatform();

        // Pre-load first 3 screens
        for (let i = 0; i < 3; i++) {
            this.#appendScreen(entities);
        }

        return {
            playerStartY: DESIGN_HEIGHT - 120,
            pendingLives: null,
        };
    }

    updateTimers(dt) {
        this.#timer += dt;

        // Tick checkpoint animation
        if (this.#checkpointAnim) {
            this.#checkpointAnim.life -= dt;
            if (this.#checkpointAnim.life <= 0) {
                this.#checkpointAnim = null;
            }
        }
    }

    checkCompletion(dt, player, game, entities, floatingTexts) {
        // Expand world as player climbs near the top
        const loadedTop = -(this.#screensLoaded - 1) * DESIGN_HEIGHT;
        if (player.y < loadedTop + DESIGN_HEIGHT * 2) {
            this.#appendScreen(entities);
        }

        // Checkpoint award logic
        this.#checkCheckpoint(player, game, floatingTexts);

        return false; // infinite mode never completes
    }

    /** Number of loaded screens (used by background checkpoint drawing). */
    get screensLoaded() { return this.#screensLoaded; }

    // ── Private ───────────────────────────────────────────────────

    #appendScreen(entities) {
        const screen = generateInfiniteScreen(this.#screensLoaded);
        entities.loadScreen(screen, this.#screensLoaded);
        this.#screensLoaded++;
    }

    #checkCheckpoint(player, game, floatingTexts) {
        const currentScreen = Math.floor(-player.y / (CHECKPOINT_INTERVAL * DESIGN_HEIGHT));
        if (currentScreen <= this.#screenCleared) return;

        const screenTime = this.#timer - this.#lastCpTime;
        this.#lastCpTime     = this.#timer;
        this.#screenCleared  = currentScreen;

        const bonus = TimeBonusCalculator.computeCheckpoint(screenTime, CHECKPOINT_INTERVAL);

        if (bonus.score > 0) game.addScore(bonus.score);
        if (bonus.coins > 0) game.addCoins(bonus.coins);

        // Particle burst
        game.particles.burst(player.x, player.y, {
            color: bonus.color,
            size: 9, sizeEnd: 0, life: 0.9, speed: 180, spread: 360, shape: 'star',
        }, 22);

        // Floating medal popup
        const popLines = bonus.medal !== 'none'
            ? ['CHECKPOINT', `+${bonus.score} pts  +${bonus.coins} `]
            : ['CHECKPOINT', `${TimeBonusCalculator.formatTime(screenTime)}`];

        popLines.forEach((text, i) => {
            floatingTexts.add({
                x: DESIGN_WIDTH / 2,
                screenY: DESIGN_HEIGHT * 0.18 + i * 26,
                text,
                life: 2.0,
                vy: -30,
                color: bonus.color,
                large: i === 0,
            });
        });

        // Banner for HUD
        this.#checkpointAnim = {
            text: bonus.medal.toUpperCase(),
            color: bonus.color,
            life: 1.8,
            maxLife: 1.8,
        };
    }
}
