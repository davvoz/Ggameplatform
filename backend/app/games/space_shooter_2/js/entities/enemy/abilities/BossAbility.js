// ============================================================
//  BossAbility — Base class for all boss ability strategies
//  Subclasses implement update(), render(), and optionally
//  onDamage() for damage-modifying abilities.
// ============================================================

class BossAbility {
    constructor(config) {
        this.config = config;
    }

    init(boss) { /* override */ }

    update(dt, game, boss) { /* override */ }

    render(ctx, boss, barY) { /* override */ }

    /**
     * Hook called when boss takes damage. Can modify the amount.
     * @returns {number} modified damage amount
     */
    onDamage(amount, partIndex, boss, game) {
        return amount;
    }
}

export default BossAbility;
