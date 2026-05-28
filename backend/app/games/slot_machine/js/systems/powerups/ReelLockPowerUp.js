import { BasePowerUp } from './BasePowerUp.js';

/**
 * Player-driven reel freezer. While active the player taps reels to toggle
 * which columns get frozen; a snapshot of the column at the moment of
 * selection is preserved and re-applied on every spin until the powerup
 * expires (or is cancelled).
 */
export class ReelLockPowerUp extends BasePowerUp {
    static id = 'reel_lock';
    static label = 'LOCK';
    static icon = '🔒';
    static color = '#00ffff';
    static description = 'Tap reels to lock them for 3 spins';
    static baseCostMultiplier = 2;
    static baseDuration = 3;

    constructor() {
        super();
        this._snapshots = new Map();   // reelIndex → string[] (column)
    }

    /**
     * Toggles a reel's lock. `currentColumn` is the visible[] of that reel at
     * the moment of selection — it becomes the frozen value.
     * Returns true if the reel is now locked, false if it was unlocked.
     */
    toggleReel(reelIndex, currentColumn) {
        if (this._snapshots.has(reelIndex)) {
            this._snapshots.delete(reelIndex);
            return false;
        }
        this._snapshots.set(reelIndex, currentColumn.slice());
        return true;
    }

    isReelLocked(reelIndex) {
        return this._snapshots.has(reelIndex);
    }

    lockedIndices() {
        return Array.from(this._snapshots.keys());
    }

    transformSpin(grid) {
        for (const [i, snap] of this._snapshots) {
            if (i >= 0 && i < grid.length) grid[i] = snap.slice();
        }
    }
}
