import { EntityKind } from '../entities/Entity.js';

/**
 * ThreatEvaluator: stateless utility that reads BattleWorld state to produce
 * battlefield metrics for smarter AI decision-making.
 *
 * Called by ReactiveAIBehavior and StrategicAIBehavior each evaluation tick.
 * No mutable state — safe to share across behavior instances.
 */
export class ThreatEvaluator {

    /**
     * Evaluates the current battlefield from the enemy team's perspective.
     *
     * @param {object} world - BattleWorld instance
     * @returns {{
     *   playerPressure: number,   enemyPressure: number,
     *   playerUnitCount: number,  enemyUnitCount: number,
     *   playerTowerHpRatio: number, enemyTowerHpRatio: number,
     *   hasPlayerAir: boolean,    hasPlayerMass: boolean
     * }}
     */
    evaluate(world) {
        // Approximate centre-line: units past this Y are in "opposing" territory.
        const bridgeY = 400;

        const relevant    = world.entityManager.list().filter(e => this.#isRelevant(e));
        const playerUnits = relevant.filter(e => e.team === 'player');
        const enemyUnits  = relevant.filter(e => e.team !== 'player');

        const playerUnitCount = playerUnits.length;
        const enemyUnitCount  = enemyUnits.length;
        const playerAirCount  = playerUnits.filter(e => this.#isFlying(e)).length;
        const playerPressure  = playerUnits.filter(e => e.y < bridgeY).length;
        const enemyPressure   = enemyUnits.filter(e => e.y > bridgeY).length;

        const playerTower = world.player?.tower;
        const enemyTower  = world.enemy?.tower;

        return {
            playerPressure,
            enemyPressure,
            playerUnitCount,
            enemyUnitCount,
            playerTowerHpRatio: playerTower ? playerTower.hp / playerTower.maxHp : 1,
            enemyTowerHpRatio:  enemyTower  ? enemyTower.hp  / enemyTower.maxHp  : 1,
            hasPlayerAir:  playerAirCount > 0,
            hasPlayerMass: playerUnitCount >= 3,
        };
    }

    // ── private helpers ─────────────────────────────────────────────────────

    #isRelevant(e) {
        return !e.isDead() && (e.kind === EntityKind.UNIT || e.kind === EntityKind.HERO);
    }

    #isFlying(e) {
        return e.def?.tags?.includes('flying') ?? false;
    }
}
