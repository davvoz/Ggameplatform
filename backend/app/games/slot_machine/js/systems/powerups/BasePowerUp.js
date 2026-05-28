/**
 * Abstract powerup. Subclasses are strategies that mutate spin results
 * and/or win calculations for `duration` spins.
 *
 * Lifecycle (per spin, in this order, invoked by the FSM):
 *   1. SpinningState.enter()
 *      → PowerUpManager.transformSpin(visibleGrid, data, runCtx)
 *        → each active powerup may rewrite cells in the grid
 *   2. EvaluationState.enter()
 *      → PowerUpManager.applyMultiplier(coins, runCtx) before paying
 *      → PowerUpManager.consumeOne(runCtx)  → ticks remaining; drops expired
 *
 * Static contract (must be overridden):
 *   - id, label, icon, color, baseCostMultiplier, baseDuration, description
 *
 * Instance contract (override only what you need):
 *   - transformSpin(grid, data, runCtx)   default: noop
 *   - multiplyWin(coins)                  default: identity
 */
export class BasePowerUp {
    static id = '';
    static label = '';
    static icon = '';
    static color = '#ffffff';
    static description = '';
    /** Cost in coins = ceil(betTotal * baseCostMultiplier). */
    static baseCostMultiplier = 1;
    /** Duration in spins (set to 1 for single-shot). */
    static baseDuration = 1;

    constructor() {
        const ctor = this.constructor;
        if (ctor === BasePowerUp) {
            throw new Error('BasePowerUp is abstract');
        }
        this.id = ctor.id;
        this.remaining = ctor.baseDuration;
    }

    /** Override to mutate the 5×3 grid (column-major: grid[col][row]). */
    transformSpin(_grid, _data, _runCtx) {
        // default: nothing
    }

    /** Override to scale the coin payout for this spin. */
    multiplyWin(coins) {
        return coins;
    }

    tickSpin() {
        this.remaining--;
    }

    isExpired() {
        return this.remaining <= 0;
    }

    static cost(betTotal) {
        return Math.max(1, Math.ceil(betTotal * this.baseCostMultiplier));
    }
}
