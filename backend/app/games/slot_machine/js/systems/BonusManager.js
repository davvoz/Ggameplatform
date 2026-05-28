/**
 * Treasure Vault mini-game. Stateless data-driven prize roll.
 * Caller drives the UI (pick-3 from N chests). For each pick we draw a weighted outcome.
 *
 * Outcomes: { type: 'coins'|'multiplier'|'exit', value }
 */
export class BonusManager {
    constructor(dataRegistry) {
        this.cfg = dataRegistry.bonuses.treasureVault;
    }

    get picks() { return this.cfg.picks; }
    get chestCount() { return this.cfg.chests; }

    /** Roll a single chest. Returns the outcome object. */
    rollPick() {
        const outcomes = this.cfg.outcomes;
        const total = outcomes.reduce((a, o) => a + o.weight, 0);
        let r = Math.random() * total;
        for (const o of outcomes) {
            r -= o.weight;
            if (r <= 0) return o;
        }
        return outcomes[outcomes.length - 1];
    }

    /**
     * Resolve a full bonus session: pick up to `picks` chests, applying multipliers
     * to subsequent coin picks, stopping early on `exit`.
     * Returns { totalCoins, picksMade, log: [{outcome, runningCoins}] }
     */
    runSession(betTotal) {
        let coins = 0;
        let pendingMult = 1;
        const log = [];
        let picksMade = 0;
        for (let i = 0; i < this.picks; i++) {
            const out = this.rollPick();
            picksMade++;
            if (out.type === 'exit') {
                log.push({ outcome: out, runningCoins: coins });
                break;
            }
            if (out.type === 'multiplier') {
                pendingMult *= out.value;
            } else if (out.type === 'coins') {
                coins += Math.round(out.value * pendingMult);
            }
            log.push({ outcome: out, runningCoins: coins });
        }
        // Final scaling by bet — encourage betting higher (coins are flat in config).
        const totalCoins = Math.max(coins, 0);
        return { totalCoins, picksMade, log, betTotal };
    }
}
