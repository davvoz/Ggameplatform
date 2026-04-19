import EnemyBehavior from './EnemyBehavior.js';

const SPLIT_OFFSET = 20;

/**
 * SplitOnDeathBehavior — When the host dies, spawns two 'swarm' enemies.
 * Spawned copies do NOT carry this behavior (prevents infinite recursion).
 */
class SplitOnDeathBehavior extends EnemyBehavior {
    onDeath(enemy, game) {
        if (!game.entityManager) return;

        for (let i = 0; i < 2; i++) {
            const ox = i === 0 ? -SPLIT_OFFSET : SPLIT_OFFSET;
            const spawn = enemy.spawnEnemy(
                enemy.position.x + ox, enemy.position.y,
                'swarm', 'sine', game
            );
            if (spawn) {
                spawn.behaviors = spawn.behaviors.filter(
                    b => !(b instanceof SplitOnDeathBehavior)
                );
            }
        }
    }
}

export default SplitOnDeathBehavior;
