/**
 * LevelMode — Strategy for campaign levels with a fixed set of screens.
 *
 * Handles level initialisation, time tracking, and level-complete detection.
 */

import { GameMode } from './GameMode.js';
import { TimeBonusCalculator } from '../../systems/TimeBonusCalculator.js';
import { getLevelData } from '../../config/LevelData.js';
import {  DESIGN_HEIGHT, COLORS } from '../../config/Constants.js';

export class LevelMode extends GameMode {
    #levelData  = null;
    #goalY      = 0;
    #totalClimb = 0;
    #timer      = 0;
    #screenCount = 1;
    #complete   = false;
    #completeTimer = 0;

    /**
     * @param {number} levelIndex — zero-based level index
     */
    constructor(levelIndex) {
        super();
        this.#levelData = getLevelData(levelIndex) ?? getLevelData(0);
        this.#screenCount = this.#levelData.screens.length;

        const playerStartY = DESIGN_HEIGHT - 120;
        this.#goalY = -((this.#screenCount - 1) * DESIGN_HEIGHT);
        this.#totalClimb = playerStartY - this.#goalY;
    }

    get isInfinite()     { return false; }
    get levelTotalClimb() { return this.#totalClimb; }
    get levelGoalY()     { return this.#goalY; }
    get parScreenCount() { return this.#screenCount; }
    get levelTimer()     { return this.#timer; }

    init(entities, stats, game) {
        entities.addStartPlatform();
        entities.loadAllScreens(this.#levelData.screens);

        return {
            playerStartY: DESIGN_HEIGHT - 120,
            pendingLives: game.pendingLives,
        };
    }

    updateTimers(dt) {
        if (!this.#complete) {
            this.#timer += dt;
        }
    }

    checkCompletion(dt, player, game, entities, floatingTexts) {
        if (this.#complete) {
            this.#completeTimer -= dt;
            if (this.#completeTimer <= 0) {
                game.endSession();
                game.fsm.transition('levelComplete');
            }
            return true;
        }

        if (player.y < this.#goalY) {
            this.#complete = true;
            this.#completeTimer = 0.6;

            // Persist player lives for next level
            game.pendingLives = player.lives;

            // Time bonus
            const bonus = TimeBonusCalculator.computeLevel(this.#timer, this.#screenCount);
            game.levelTime       = this.#timer;
            game.timeMedal       = bonus.medal;
            game.timeBonusScore  = bonus.score;
            game.timeBonusCoins  = bonus.coins;
            if (bonus.score > 0) game.addScore(bonus.score);
            if (bonus.coins > 0) game.addCoins(bonus.coins);

            game.sound.playUpgrade();
            game.particles.burst(player.x, player.y, {
                color: COLORS.NEON_YELLOW,
                size: 10,
                sizeEnd: 0,
                life: 1.2,
                speed: 250,
                spread: 360,
            }, 40);
        }
        return false;
    }
}
