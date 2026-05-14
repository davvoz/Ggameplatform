/**
 * Win condition: the team whose tower is destroyed loses.
 * (Hero death = respawn, not game-over. Leader is currently mirrored by tower.)
 */
export class WinConditionChecker {
    /** @returns {null|'player'|'enemy'} winning team, or null. */
    check(playerCtl, enemyCtl) {
        if (enemyCtl.tower.isDead()) return 'player';
        if (playerCtl.tower.isDead()) return 'enemy';
        return null;
    }

    /** Time-out outcome: side with higher tower-HP fraction wins. Tie => 'timeout'. */
    timeoutOutcome(playerCtl, enemyCtl) {
        const p = playerCtl.tower.hp / playerCtl.tower.maxHp;
        const e = enemyCtl.tower.hp / enemyCtl.tower.maxHp;
        if (Math.abs(p - e) < 0.01) return 'timeout';
        return p > e ? 'player' : 'enemy';
    }
}
