import { RED_NUMBERS } from '../config/GameConfig.js';

/**
 * Config-driven bet resolution. The SELECTORS map is the only place
 * that knows HOW each bet type matches a number. Bets.json references
 * a selector by name — no switch/if on type elsewhere in the codebase.
 *
 * Selector signature: (spinNumber, betInstance, betDef) → bool
 *   - betInstance.numbers: number[]|null (the user's selected numbers)
 *   - betDef.data:         frozen object from bets.json (e.g. { dozen: 1 })
 */
const SELECTORS = Object.freeze({
    matchesNumbers: (n, inst) => Array.isArray(inst.numbers) && inst.numbers.includes(n),
    matchesDozen:   (n, _i, def) => n !== 0 && Math.ceil(n / 12) === def.data.dozen,
    matchesColumn:  (n, _i, def) => {
        if (n === 0) return false;
        // column 1 = 1,4,7..., column 2 = 2,5,8..., column 3 = 3,6,9...
        const col = ((n - 1) % 3) + 1;
        return col === def.data.column;
    },
    matchesLow:   (n) => n >= 1 && n <= 18,
    matchesHigh:  (n) => n >= 19 && n <= 36,
    matchesRed:   (n) => RED_NUMBERS.has(n),
    matchesBlack: (n) => n !== 0 && !RED_NUMBERS.has(n),
    matchesEven:  (n) => n !== 0 && n % 2 === 0,
    matchesOdd:   (n) => n !== 0 && n % 2 === 1,
    matchesZero:  (n) => n === 0,
});

export class BetResolver {
    /**
     * @param {DataRegistry} dataRegistry
     */
    constructor(dataRegistry) {
        this._data = dataRegistry;
    }

    /**
     * Resolve all placed bets against the spin number.
     * @returns { totalWin: number, totalWager: number, perBet: [{bet, win, payout, hit}], net: number }
     */
    resolve(spinNumber, placedBets) {
        let totalWin = 0;
        let totalWager = 0;
        const perBet = [];
        for (const inst of placedBets) {
            const def = this._data.getBet(inst.typeId);
            const selector = SELECTORS[def.selector];
            if (!selector) throw new Error(`BetResolver: unknown selector "${def.selector}"`);
            const hit = selector(spinNumber, inst, def);
            const multiplier = inst.multiplier ?? 1;
            // Payout includes returned stake (standard roulette convention).
            const win = hit ? Math.round(inst.amount * (def.payout + 1) * multiplier) : 0;
            totalWin   += win;
            totalWager += inst.amount;
            perBet.push({ bet: inst, def, hit, win, payout: def.payout });
        }
        return { totalWin, totalWager, perBet, net: totalWin - totalWager };
    }

    /** Expose selector names for tests / debugging. */
    static getSelectorNames() { return Object.keys(SELECTORS); }
}
