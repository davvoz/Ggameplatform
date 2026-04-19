import EnemyBehavior from './EnemyBehavior.js';

const INITIAL_DELAY_BASE = 3;
const INITIAL_DELAY_RANDOM = 2;
const RESPAWN_INTERVAL = 3.5;
const SWARM_COUNT = 2;
const MAX_SPAWNS = 2;
const SPREAD = 40;
const PARTICLE_COUNT = 6;

/**
 * SpawnerBehavior — Periodically spawns 'swarm' enemies beneath the host.
 */
class SpawnerBehavior extends EnemyBehavior {
    constructor() {
        super();
        this.timer = INITIAL_DELAY_BASE + Math.random() * INITIAL_DELAY_RANDOM;
        this.remaining = MAX_SPAWNS;
    }

    update(enemy, dt, game) {
        if (this.remaining <= 0) return;
        this.timer -= dt;
        if (this.timer > 0) return;

        this.timer = RESPAWN_INTERVAL + Math.random();
        this.remaining--;
        this._spawnSwarm(enemy, game);
    }

    _spawnSwarm(enemy, game) {
        const cx = enemy.position.x + enemy.width / 2;
        const cy = enemy.position.y + enemy.height / 2;
        const spawnY = enemy.position.y + enemy.height;

        for (let i = 0; i < SWARM_COUNT; i++) {
            const sx = cx + (Math.random() - 0.5) * SPREAD;
            enemy.spawnEnemy(sx, spawnY, 'swarm', 'straight', game);
        }
        game.particles.emit(cx, cy, 'hit', PARTICLE_COUNT);
    }
}

export default SpawnerBehavior;
