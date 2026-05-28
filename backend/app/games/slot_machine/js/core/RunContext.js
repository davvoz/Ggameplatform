/**
 * Per-session mutable state. Owned by Game. Read/written by states & systems.
 * Keep gameplay numbers — never engine constants.
 */
export class RunContext {
    constructor() {
        this.reset();
    }

    reset() {
        this.balance = 0;
        this.totalWon = 0;            // cumulative payout across the whole session
        this.spinsPlayed = 0;
        this.lastWin = 0;
        this.lastWins = [];           // last N spin amounts (for HUD strip)
        this.betTierIndex = 0;
        this.autoplayRemaining = 0;
        this.freeSpinsRemaining = 0;
        this.freeSpinsMultiplier = 1;
        this.freeSpinsTotalWon = 0;
        this.consecutiveWins = 0;
        this.hotStreakMultiplier = 1;
        this.hotStreakLabel = '';
        this.jackpotPool = 0;         // visible ticker value
        this.jackpotTarget = 0;       // server-truth value (interpolated toward)
        this.lastVisibleGrid = null;  // column-major snapshot of last spin (for ReelLock)
        this.lockCooldown = 0;        // spins remaining before LOCK can be purchased again
    }

    pushLastWin(amount) {
        this.lastWins.push(amount);
        if (this.lastWins.length > 8) this.lastWins.shift();
    }
}
