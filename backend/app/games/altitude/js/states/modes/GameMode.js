/**
 * GameMode — Strategy interface for game mode behaviour.
 *
 * Open/Closed Principle: add new modes (boss, time-attack…) by extending
 * this class without modifying PlayingState.
 */

export class GameMode {
    /**
     * Initialise entities/state for this mode.
     *
     * @param {import('../systems/EntityManager.js').EntityManager} entities
     * @param {object} stats — player stats from save
     * @param {object} game  — Game instance
     * @returns {{ playerStartY: number, pendingLives: number|null }}
     */
    init(entities, stats, game) {
        throw new Error('GameMode.init() must be overridden');
    }

    /**
     * @returns {boolean} true if mode is infinite (never completes)
     */
    get isInfinite() { return false; }

    /**
     * Total vertical climb distance (used for progress bar).
     * Negative means "no progress bar".
     */
    get levelTotalClimb() { return -1; }

    /**
     * Goal world-y coordinate the player must climb above to finish.
     */
    get levelGoalY() { return 0; }

    /**
     * Number of screens used for time-bonus calculations.
     */
    get parScreenCount() { return 1; }

    /**
     * Level elapsed timer (seconds).
     */
    get levelTimer() { return 0; }

    // ── Infinite-mode HUD state (defaults for level mode) ─────────
    get infScreenTimer()    { return 0; }
    get infLastCpTime()     { return 0; }
    get infScreenCleared()  { return 0; }
    get infCheckpointAnim() { return null; }

    /**
     * Called every frame to advance timers and mode-specific logic.
     *
     * @param {number} dt
     */
    updateTimers(dt) {}

    /**
     * Check whether the mode's completion condition is met.
     * May trigger transitions on the Game FSM.
     *
     * @param {number} dt
     * @param {object} player
     * @param {object} game
     * @param {import('../systems/EntityManager.js').EntityManager} entities
     * @param {import('../systems/FloatingTextManager.js').FloatingTextManager} floatingTexts
     * @returns {boolean} true if level-complete transition is in progress (skip rest of update)
     */
    checkCompletion(dt, player, game, entities, floatingTexts) {
        return false;
    }
}
