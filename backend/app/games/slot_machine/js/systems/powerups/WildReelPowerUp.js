import { BasePowerUp } from './BasePowerUp.js';

/**
 * Converts one entire random central reel (1..reelCount-2) into Wild symbols.
 * One-shot: 1 spin then expires.
 */
export class WildReelPowerUp extends BasePowerUp {
    static id = 'wild_reel';
    static label = 'WILD';
    static icon = '🌟';
    static color = '#cc00ff';
    static description = 'One reel becomes all Wild';
    static baseCostMultiplier = 5;
    static baseDuration = 1;

    transformSpin(grid, data, _runCtx) {
        const wildId = this._findWildId(data);
        if (!wildId) return;
        const min = 1;
        const max = Math.max(min, grid.length - 2);
        const target = min + Math.floor(Math.random() * (max - min + 1));
        const col = grid[target];
        for (let r = 0; r < col.length; r++) col[r] = wildId;
    }

    _findWildId(data) {
        for (const s of data.symbolList) {
            if (s.isWild) return s.id;
        }
        return null;
    }
}
