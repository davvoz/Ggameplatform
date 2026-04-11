import {
    ARENA_LEFT, ARENA_RIGHT, ARENA_TOP, ARENA_BOTTOM, ARENA_MID_Y,
    AI_DIFFICULTY, 
} from '../config/Constants.js';

/**
 * AI controller for CPU opponent.
 *
 * EASY   — slow reactions (250 ms), imprecise (±50 px), stays at home Y,
 *          never collects power-ups. Beatable by any player.
 *
 * MEDIUM — moderate reactions (90 ms), good prediction (±12 px),
 *          pushes forward to intercept the disc earlier (aggressive play).
 *          No power-up collection.
 *
 * HARD   — fast reactions (35 ms), precise (±4 px), advances aggressively,
 *          actively collects desirable power-ups (shield, grow, freeze, etc.).
 */
export class AIController {
    #level;          // 'EASY' | 'MEDIUM' | 'HARD'
    #difficulty;     // numeric 0-1
    #reactionTimer = 0;
    #reactionDelay;
    #targetX = 0;
    #targetY = 0;
    #powerUps = [];

    /** Power-up ids the HARD AI considers worth grabbing */
    static #DESIRED_POWERUPS = new Set([
        'shield', 'grow', 'speed', 'fireball', 'freeze', 'magnet',
    ]);

    constructor(difficulty = 'MEDIUM') {
        this.#level = (difficulty in AI_DIFFICULTY) ? difficulty : 'MEDIUM';
        this.#difficulty = AI_DIFFICULTY[this.#level];
        switch (this.#level) {
            case 'EASY':   this.#reactionDelay = 250; break;
            case 'MEDIUM': this.#reactionDelay = 90;  break;
            case 'HARD':   this.#reactionDelay = 35;  break;
        }
    }

    get difficultyLevel() { return this.#difficulty; }

    /**
     * Compute directional input for the AI character.
     * @returns {{ dx: number, dy: number }}
     */
    computeInput(character, ball, powerUps, dt) {
        this.#powerUps = powerUps;
        this.#reactionTimer += dt;

        if (this.#reactionTimer >= this.#reactionDelay) {
            this.#reactionTimer = 0;
            this.#decideTarget(character, ball);
        }

        const dx = this.#targetX - character.x;
        const dy = this.#targetY - character.y;
        const threshold = 3;

        return {
            dx: Math.abs(dx) > threshold ? Math.sign(dx) : 0,
            dy: Math.abs(dy) > threshold ? Math.sign(dy) : 0,
        };
    }

    /* ================================================================
       Decision tree — per-level behaviour
       ================================================================ */

    #decideTarget(character, ball) {
        switch (this.#level) {
            case 'EASY':   this.#decideEasy(character, ball); break;
            case 'MEDIUM': this.#decideMedium(character, ball); break;
            case 'HARD':   this.#decideHard(character, ball); break;
        }
    }

    /* ---- EASY: lazy tracking, big error, stays back ---- */
    #decideEasy(character, ball) {
        const ballComing = this.#isBallApproaching(ball, character);

        if (ballComing) {
            // Predict where ball crosses our home Y — with large error
            const px = this.#predictBallXAtY(ball, character.y);
            this.#targetX = px + (Math.random() - 0.5) * 50;
        } else {
            // Drift back toward center lazily
            const cx = (ARENA_LEFT + ARENA_RIGHT) / 2;
            this.#targetX += (cx - this.#targetX) * 0.08;
        }
        // Never move vertically — stay at current Y
        this.#targetY = character.y;
        this.#clampTargetX();
    }

    /* ---- MEDIUM: better tracking + advance to intercept earlier ---- */
    #decideMedium(character, ball) {
        const isTop = character.isTopPlayer;
        const ballComing = this.#isBallApproaching(ball, character);
        const homeY = this.#homeY(isTop);

        if (ballComing) {
            // Advance toward midfield to intercept ball earlier
            const forwardY = isTop
                ? Math.min(homeY + 80, ARENA_MID_Y - 40)   // push down, cap before mid
                : Math.max(homeY - 80, ARENA_MID_Y + 40);   // push up, cap after mid
            this.#targetY = forwardY;

            // Predict ball X at the Y we're actually heading to
            const px = this.#predictBallXAtY(ball, this.#targetY);
            this.#targetX = px + (Math.random() - 0.5) * 12;
        } else {
            // Ball going away — retreat to home, drift X to center
            this.#targetY = homeY;
            const cx = (ARENA_LEFT + ARENA_RIGHT) / 2;
            this.#targetX += (cx - this.#targetX) * 0.12;
        }
        this.#clampTargetX();
    }

    /* ---- HARD: precise interception + active power-up collection ---- */
    #decideHard(character, ball) {
        const isTop = character.isTopPlayer;
        const ballComing = this.#isBallApproaching(ball, character);
        const homeY = this.#homeY(isTop);

        // 1) Try to grab a desirable power-up if safe to do so
        const pu = this.#findDesiredPowerUp(character, ball, ballComing);
        if (pu) {
            this.#targetX = pu.x;
            this.#targetY = pu.y;
            return;
        }

        if (ballComing) {
            // Aggressive advance — close to midfield
            const forwardY = isTop
                ? Math.min(homeY + 120, ARENA_MID_Y - 25)
                : Math.max(homeY - 120, ARENA_MID_Y + 25);
            this.#targetY = forwardY;

            // Near-perfect prediction at intercept Y
            const px = this.#predictBallXAtY(ball, this.#targetY);
            this.#targetX = px + (Math.random() - 0.5) * 4;
        } else {
            // Ball going away — advance past home to be ready for return
            const readyY = isTop
                ? Math.min(homeY + 50, ARENA_MID_Y - 50)
                : Math.max(homeY - 50, ARENA_MID_Y + 50);
            this.#targetY = readyY;
            const cx = (ARENA_LEFT + ARENA_RIGHT) / 2;
            this.#targetX += (cx - this.#targetX) * 0.15;
        }
        this.#clampTargetX();
    }

    /* ================================================================
       Helpers
       ================================================================ */

    /** Default resting Y for each side (matches Character.resetPosition). */
    #homeY(isTop) {
        return isTop
            ? ARENA_TOP + (ARENA_MID_Y - ARENA_TOP) * 0.4     // ≈ 176
            : ARENA_MID_Y + (ARENA_BOTTOM - ARENA_MID_Y) * 0.6; // ≈ 524
    }

    /** Is the ball heading toward the character's goal? */
    #isBallApproaching(ball, character) {
        if (character.isTopPlayer) return ball.vy < 0;   // ball moving up
        return ball.vy > 0;                               // ball moving down
    }

    /**
     * Predict the X position where the ball will reach a given Y,
     * accounting for wall bounces. Returns ball.x fallback if ball
     * is heading the wrong way.
     */
    #predictBallXAtY(ball, targetY) {
        if (ball.vy === 0) return ball.x;

        const dy = targetY - ball.y;
        // Check the ball is actually heading toward targetY
        const headingThere = (ball.vy > 0 && dy > 0) || (ball.vy < 0 && dy < 0);
        if (!headingThere) return ball.x;   // ball going opposite way — rough fallback

        const timeToReach = Math.abs(dy / ball.vy);
        let x = ball.x + ball.vx * timeToReach;

        // Wall-bounce wrapping
        const fieldWidth = ARENA_RIGHT - ARENA_LEFT;
        x -= ARENA_LEFT;
        x = Math.abs(x);
        const bounces = Math.floor(x / fieldWidth);
        x = x % fieldWidth;
        if (bounces % 2 === 1) x = fieldWidth - x;
        x += ARENA_LEFT;

        return x;
    }

    #clampTargetX() {
        this.#targetX = Math.max(ARENA_LEFT + 20, Math.min(ARENA_RIGHT - 20, this.#targetX));
    }

    /* ================================================================
       Power-up targeting (HARD only)
       ================================================================ */

    /**
     * Find the best desirable power-up in our half, scoring by
     * distance and type priority. Avoids chasing when ball is close.
     */
    #findDesiredPowerUp(character, ball, ballComing) {
        let best = null;
        let bestScore = -Infinity;

        for (const pu of this.#powerUps) {
            if (!pu.alive) continue;
            if (!this.#isPowerUpEligible(pu, character, ballComing)) continue;

            const dx = pu.x - character.x;
            const dy = pu.y - character.y;
            const dist = Math.hypot(dx, dy);

            const score = this.#scorePowerUp(pu.type?.id, dist);

            if (score > bestScore) {
                bestScore = score;
                best = pu;
            }
        }

        return best;
    }

    /**
     * Check if a power-up is eligible for targeting.
     */
    #isPowerUpEligible(pu, character, ballComing) {
        // Only consider power-ups in our half (+ small buffer past mid)
        if (character.isTopPlayer && pu.y > ARENA_MID_Y + 30) return false;
        if (!character.isTopPlayer && pu.y < ARENA_MID_Y - 30) return false;

        // Must be a desirable type
        const puId = pu.type?.id;
        if (!puId || !AIController.#DESIRED_POWERUPS.has(puId)) return false;

        const dx = pu.x - character.x;
        const dy = pu.y - character.y;
        const dist = Math.hypot(dx, dy);

        // When ball is coming, only grab very nearby power-ups
        if (ballComing && dist > 70) return false;
        // When ball is away, reach further
        if (!ballComing && dist > 160) return false;

        return true;
    }

    /**
     * Score a power-up by type priority and distance.
     */
    #scorePowerUp(puId, dist) {
        let priority = 1;
        if (puId === 'shield' || puId === 'grow') priority = 1.5;
        if (puId === 'freeze') priority = 1.3;
        return priority * (200 - dist);
    }
}
