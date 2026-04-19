/**
 * EnemyBehavior — Base class for enemy behavior strategies.
 *
 * Each behavior encapsulates a single responsibility: update logic,
 * rendering, death handling, and damage modification for a specific
 * enemy archetype (stealth, spawner, W3 blinker, W4 triplet, etc.).
 *
 * Subclasses override only the methods they need.
 */
class EnemyBehavior {
    /** Called once after construction to initialise behavior-specific state. */
    onConstruct(enemy) { /* override */ }

    /** Per-frame logic — called from Enemy.update(). */
    update(enemy, dt, game) { /* override */ }

    /** Draw behavior-specific visual effects — called from EnemyRenderer. */
    render(ctx, enemy, cx, cy) { /* override */ }

    /** Called when the enemy dies (health ≤ 0). */
    onDeath(enemy, game) { /* override */ }

    /**
     * Modify incoming damage amount. Return the (possibly altered) value.
     * Default: no modification.
     */
    modifyDamage(amount, enemy) { return amount; }

    /**
     * Return a state object for the W4 procedural sprite renderer.
     * Only W4 behaviors override this.
     */
    getSpriteState() { return null; }

    /** True for W4-specific behaviors (used by renderer for sprite delegation). */
    get isW4() { return false; }
}

export default EnemyBehavior;
