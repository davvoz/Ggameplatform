// ============================================================
//  PeriodicActionAbility — every N seconds, execute an action
//  Used by: spawnShards (B14), teleportBurst (B16)
// ============================================================
import BossAbility from './BossAbility.js';
import Enemy from '../TheEnemy.js';

class PeriodicActionAbility extends BossAbility {
    init(boss) {
        this._cooldownTimer = this.config.initialCooldown ?? this.config.cooldown * 0.7;
    }

    update(dt, game, boss) {
        this._cooldownTimer -= dt;
        if (this._cooldownTimer <= 0) {
            this._cooldownTimer = this.config.cooldown;
            const fn = ACTION_FNS[this.config.action];
            if (fn) fn(boss, game, this.config);
        }
    }
}

// ── Action implementations ──

const ACTION_FNS = {
    spawnShards(boss, game, config) {
        if (!game.entityManager) return;
        const level = game.levelManager ? game.levelManager.currentLevel : 1;
        const count = config.spawnCount || 3;
        for (let i = 0; i < count; i++) {
            const sx = boss.centerX + (i - Math.floor(count / 2)) * 50;
            const sy = boss.centerY + 60;
            const enemyType = config.spawnType || 'fragment_shard';
            const shard = new Enemy(sx, sy, enemyType, 'sine', boss.canvasWidth, game.difficulty, level);
            shard.speed *= config.spawnSpeedMult || 1.5;
            shard._isShard = true;
            shard.config = { ...shard.config, w3behaviour: null };
            game.entityManager.enemies.push(shard);
        }
        game.particles.emit(boss.centerX, boss.centerY + 40, 'hit', 12);
    },

    teleportBurst(boss, game, config) {
        game.particles.emit(boss.centerX, boss.centerY, 'explosion', 10);
        boss.centerX = 100 + Math.random() * (boss.canvasWidth - 200);
        game.particles.emit(boss.centerX, boss.centerY, 'hit', 8);

        const core = boss.parts.find(p => p.role === 'core' && p.active);
        if (!core) return;
        const bulletCount = config.burstCount || 8;
        const burstSpeed = config.burstSpeed || 120;
        const bx = core.worldX + core.width / 2;
        const by = core.worldY + core.height / 2;
        for (let i = 0; i < bulletCount; i++) {
            const angle = (i / bulletCount) * Math.PI * 2;
            game.spawnBullet(bx, by, Math.cos(angle) * burstSpeed, Math.sin(angle) * burstSpeed, 'enemy');
        }
    }
};

export default PeriodicActionAbility;
