import { PowerUpCatalog } from './powerups/PowerUpCatalog.js';

/**
 * Owns the list of active powerups and orchestrates their lifecycle.
 * Stateless w.r.t. UI — the HUD reads `active()` and `catalog.all()`.
 *
 * Spin flow (called from FSM):
 *   - SpinningState.enter()  → transformSpin(grid, data, runCtx)
 *   - EvaluationState.enter()→ multiplyWin(coins)  →  consumeOne()
 *
 * Purchase flow (from IdleState button handler):
 *   - canPurchase(id, runCtx) → boolean
 *   - purchase(id, runCtx)    → throws if not affordable / already active
 */
export class PowerUpManager {
    constructor() {
        this.catalog = new PowerUpCatalog();
        this._active = [];
    }

    active() {
        return this._active;
    }

    catalogList() {
        return this.catalog.all();
    }

    hasActive(id) {
        return this._active.some(p => p.id === id);
    }

    getActive(id) {
        return this._active.find(p => p.id === id) ?? null;
    }

    costFor(id, betTotal) {
        const cls = this.catalog.classOf(id);
        return cls.cost(betTotal);
    }

    canPurchase(id, betTotal, runCtx) {
        if (this.hasActive(id)) return false;
        const cost = this.costFor(id, betTotal);
        return runCtx.balance >= cost;
    }

    purchase(id, betTotal, runCtx) {
        if (this.hasActive(id)) {
            throw new Error(`PowerUpManager: "${id}" already active`);
        }
        const cost = this.costFor(id, betTotal);
        if (runCtx.balance < cost) {
            throw new Error(`PowerUpManager: insufficient balance for "${id}"`);
        }
        runCtx.balance -= cost;
        const pu = this.catalog.create(id);
        pu.purchaseCost = cost;
        this._active.push(pu);
        return pu;
    }

    /**
     * Cancels an active powerup, refunding coins proportional to the unused
     * spins. Returns the refunded amount (0 if not active).
     */
    cancel(id, runCtx) {
        const idx = this._active.findIndex(p => p.id === id);
        if (idx < 0) return 0;
        const pu = this._active[idx];
        const cls = this.catalog.classOf(id);
        const duration = Math.max(1, cls.baseDuration);
        const remaining = Math.max(0, Math.min(duration, pu.remaining));
        const cost = pu.purchaseCost ?? 0;
        const refund = Math.floor(cost * remaining / duration);
        runCtx.balance += refund;
        this._active.splice(idx, 1);
        return refund;
    }

    /**
     * Removes an active powerup immediately without refunding. Used when the
     * engine forcibly cancels a powerup (e.g. LOCK auto-disabled after a win).
     * Returns true if a powerup was removed.
     */
    forceExpire(id) {
        const idx = this._active.findIndex(p => p.id === id);
        if (idx < 0) return false;
        this._active.splice(idx, 1);
        return true;
    }

    /** Mutates grid (column-major) in place. */
    transformSpin(grid, data, runCtx) {
        for (const pu of this._active) {
            pu.transformSpin(grid, data, runCtx);
        }
    }

    /** Applies the product of all active multipliers to coins. */
    multiplyWin(coins) {
        let out = coins;
        for (const pu of this._active) {
            out = pu.multiplyWin(out);
        }
        return out;
    }

    /** Decrements every active powerup by one spin and drops expired ones. */
    consumeOne() {
        for (const pu of this._active) pu.tickSpin();
        this._active = this._active.filter(pu => !pu.isExpired());
    }
}
