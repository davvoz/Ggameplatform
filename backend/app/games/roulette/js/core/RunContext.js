import { HeatmapTracker } from '../systems/HeatmapTracker.js';
import { ChipManager } from '../systems/ChipManager.js';

/**
 * Mutable per-run state. Owned by Game, observed by every state.
 * Holds nothing static — definitions live in DataRegistry.
 */
export class RunContext {
    constructor(config) {
        this._config = config;
        this.balance = config.startBalance;
        this.heatmap = new HeatmapTracker(config.heatmap);
        this.chips   = new ChipManager(config);
        this.lastSpinNumber = null;
        this.lastResolution = null;     // { totalWin, perBet: [...] }
        this.totalSpins = 0;
        this.totalWon   = 0;
        this.biggestWin = 0;
        this.selectedChipValue = 5;
    }

    addWinnings(amount) {
        const safe = Math.max(0, Math.round(amount));
        this.balance += safe;
        this.totalWon += safe;
        if (safe > this.biggestWin) this.biggestWin = safe;
    }

    chargeWager(amount) {
        if (amount > this.balance) throw new Error('RunContext: insufficient balance');
        this.balance -= amount;
    }

    canAfford(amount) { return amount <= this.balance; }
}
