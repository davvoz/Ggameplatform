import { BasePowerUp } from './BasePowerUp.js';

/**
 * Forces one scatter symbol into a random cell of the grid each spin.
 * Helps trigger bonus rounds. Only writes cells that aren't already scatter.
 */
export class ScatterMagnetPowerUp extends BasePowerUp {
    static id = 'scatter_magnet';
    static label = 'MAG';
    static icon = '✨';
    static color = '#ffcc00';
    static description = '+1 scatter per spin';
    static baseCostMultiplier = 4;
    static baseDuration = 5;

    transformSpin(grid, data, _runCtx) {
        const scatterId = this._findScatterId(data);
        if (!scatterId) return;
        const cols = grid.length;
        const rows = grid[0].length;
        // pick a random cell that isn't already this scatter
        const candidates = [];
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                if (grid[c][r] !== scatterId) candidates.push([c, r]);
            }
        }
        if (candidates.length === 0) return;
        const [c, r] = candidates[Math.floor(Math.random() * candidates.length)];
        grid[c][r] = scatterId;
    }

    _findScatterId(data) {
        for (const s of data.symbolList) {
            if (s.isScatter) return s.id;
        }
        return null;
    }
}
