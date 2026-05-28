/**
 * Wild substitution helper. star_wild stays as wild — the evaluator treats it
 * as "any non-special" via PaylineEvaluator._matches.
 *
 * Public API:
 *   countWilds(grid) → number of star_wild cells (for spectacle/HUD).
 *   countCash(grid)  → number of coin_cash cells on grid (scatter-pays).
 */
export class WildHandler {
    constructor(dataRegistry) {
        this.data = dataRegistry;
    }

    countWilds(grid) {
        let n = 0;
        for (const col of grid) {
            for (const cell of col) {
                if (this.data.getSymbol(cell).isWild) n++;
            }
        }
        return n;
    }

    countCash(grid) {
        let n = 0;
        for (const col of grid) {
            for (const cell of col) {
                if (this.data.getSymbol(cell).isCash) n++;
            }
        }
        return n;
    }
}

