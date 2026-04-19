import PowerUpEffect from './PowerUpEffect.js';

const DRAIN_RADIUS = 100;
const DRAIN_DPS = 15;

class DataDrainEffect extends PowerUpEffect {
    update(deltaTime, player, game) {
        if (!this.active) return;
        this.time -= deltaTime;
        this.applyDrainDamage(deltaTime, player, game);
        if (this.time <= 0) {
            this.active = false;
        }
    }

    applyDrainDamage(deltaTime, player, game) {
        const pcx = player.position.x + player.width / 2;
        const pcy = player.position.y + player.height / 2;
        const em = game.entityManager;
        const radiusSq = DRAIN_RADIUS * DRAIN_RADIUS;

        for (const enemy of em.enemies) {
            if (!enemy.active || enemy._isAlly) continue;
            const dx = (enemy.position.x + enemy.width / 2) - pcx;
            const dy = (enemy.position.y + enemy.height / 2) - pcy;
            if (dx * dx + dy * dy >= radiusSq) continue;

            enemy.health -= DRAIN_DPS * deltaTime;
            if (enemy.health <= 0) {
                enemy.health = 0;
                enemy.destroy();
                game.waveManager.onEnemyKilled(enemy);
                game.particles.emit(
                    enemy.position.x + enemy.width / 2,
                    enemy.position.y + enemy.height / 2,
                    'explosion', 8
                );
            }
        }
    }
}

export default DataDrainEffect;
