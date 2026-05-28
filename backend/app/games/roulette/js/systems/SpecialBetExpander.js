/**
 * Resolves user-selected "special" bets into concrete number sets,
 * using the current heatmap / wheel order / config.
 *
 * Strategies (config-driven):
 *   - hot       → top N hot numbers (with multiplier from bet def)
 *   - cold      → bottom N cold numbers (with multiplier from bet def)
 *   - neighbour → anchor ± spread on the wheel order (default anchor = last spin or 0)
 *   - snake     → fixed snake-bet number list
 *   - mirror    → numbers whose digits reverse to another valid number (e.g. 12↔21)
 *   - default   → caller must supply numbers explicitly
 */
export class SpecialBetExpander {
    constructor(dataRegistry, specialsConfig) {
        this._data = dataRegistry;
        this._cfg = specialsConfig;
    }

    /**
     * @param {object} betDef  bets.json entry
     * @param {RunContext} run for heatmap / context
     * @returns {{ numbers:number[]|null, multiplier:number, vfx:string|null }}
     */
    expand(betDef, run) {
        const strategy = betDef.expandStrategy ?? null;
        const baseMul = betDef.multiplier ?? 1;
        if (!strategy) return { numbers: null, multiplier: baseMul, vfx: betDef.vfx ?? null };

        switch (strategy) {
            case 'hot':
                return { numbers: run.heatmap.getHotNumbers(),  multiplier: baseMul, vfx: betDef.vfx };
            case 'cold':
                return { numbers: run.heatmap.getColdNumbers(), multiplier: baseMul, vfx: betDef.vfx };
            case 'neighbour': {
                const anchor = run.lastSpinNumber ?? 0;
                return { numbers: this._neighbours(anchor), multiplier: baseMul, vfx: betDef.vfx };
            }
            case 'snake':
                return { numbers: [...this._cfg.snakeNumbers], multiplier: baseMul, vfx: betDef.vfx };
            case 'mirror':
                return { numbers: this._mirrorNumbers(), multiplier: baseMul, vfx: betDef.vfx };
            default:
                throw new Error(`SpecialBetExpander: unknown strategy "${strategy}"`);
        }
    }

    _neighbours(anchor) {
        const order = this._data.getWheelOrder();
        const idx = this._data.getWheelIndex(anchor);
        const spread = this._cfg.neighborSpread;
        const out = new Set();
        for (let d = -spread; d <= spread; d++) {
            const i = ((idx + d) % order.length + order.length) % order.length;
            out.add(order[i]);
        }
        return [...out];
    }

    _mirrorNumbers() {
        const out = [];
        for (let n = 1; n <= 36; n++) {
            if (n < 10) continue;
            const reversed = Number.parseInt(String(n).split('').reverse().join(''), 10);
            if (reversed >= 1 && reversed <= 36 && reversed !== n) out.push(n);
        }
        return out;
    }
}
