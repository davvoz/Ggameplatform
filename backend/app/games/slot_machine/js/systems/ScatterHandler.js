/**
 * Counts scatter symbols anywhere on the grid (not bound to paylines).
 */
export class ScatterHandler {
    constructor(dataRegistry) {
        this.data = dataRegistry;
        this.scatterId = dataRegistry.bonuses.freeSpins.trigger;
        this.bonusId   = dataRegistry.bonuses.treasureVault.trigger;
    }

    countScatter(grid) { return this._count(grid, this.scatterId); }
    countBonus(grid)   { return this._count(grid, this.bonusId); }

    _count(grid, id) {
        let n = 0;
        for (const col of grid) {
            for (const cell of col) {
                if (cell === id) n++;
            }
        }
        return n;
    }
}
