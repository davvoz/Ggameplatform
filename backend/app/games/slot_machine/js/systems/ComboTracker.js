/**
 * Tracks consecutive wins; computes hot streak multiplier from thresholds.
 */
export class ComboTracker {
    constructor(dataRegistry) {
        this.thresholds = dataRegistry.bonuses.hotStreak.thresholds;
    }

    /** Returns {multiplier, label} for the given consecutive-win count. */
    resolve(consecutiveWins) {
        let best = { multiplier: 1, label: '' };
        for (const t of this.thresholds) {
            if (consecutiveWins >= t.wins) best = { multiplier: t.multiplier, label: t.label };
        }
        return best;
    }
}
