// ============================================================
//  HPThresholdAbility — triggers effects at health % thresholds
//  Used by: phaseShift (B18)
// ============================================================
import BossAbility from './BossAbility.js';
import Enemy from '../TheEnemy.js';

class HPThresholdAbility extends BossAbility {
    init(boss) {
        this._triggeredPhases = new Set();
    }

    update(dt, game, boss) {
        const ratio = boss.health / boss.maxHealth;
        for (const phase of this.config.phases) {
            if (ratio < phase.threshold && !this._triggeredPhases.has(phase.threshold)) {
                this._triggeredPhases.add(phase.threshold);
                this._triggerPhase(phase, boss, game);
            }
        }
    }

    _triggerPhase(phase, boss, game) {
        if (phase.movePattern) {
            boss.def = { ...boss.def, movePattern: phase.movePattern };
        }
        if (phase.speedMult) {
            boss.speed *= phase.speedMult;
        }
        if (phase.shootRateMult) {
            for (const p of boss.parts) {
                if (p.canShoot && p.active) p.shootRate *= phase.shootRateMult;
            }
        }
        this.spawnEnemies(phase, game, boss);
        game.particles.emit(boss.centerX, boss.centerY, 'explosion', phase.particleCount || 15);
    }

    spawnEnemies(phase, game, boss) {
        if (phase.spawnType && game.entityManager) {
            const level = game.levelManager ? game.levelManager.currentLevel : 1;
            const count = phase.spawnCount || 2;
            for (let i = 0; i < count; i++) {
                const sx = boss.centerX + (i === 0 ? -80 : 80);
                const drone = new Enemy(sx, boss.centerY + 80, phase.spawnType, 'glitch_blink', boss.canvasWidth, game.difficulty, level);
                game.entityManager.enemies.push(drone);
            }
        }
    }
}

export default HPThresholdAbility;
