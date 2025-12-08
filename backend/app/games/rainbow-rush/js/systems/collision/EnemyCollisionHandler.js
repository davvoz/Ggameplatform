import { DamageCollisionHandler } from './DamageCollisionHandler.js';

/**
 * EnemyCollisionHandler - Handles enemy and projectile collisions
 * Single Responsibility: Enemy collision, projectile hits, damage
 */
export class EnemyCollisionHandler extends DamageCollisionHandler {
    /**
     * Handle enemy collisions
     * @param {EntityManager} entityManager
     * @param {Object} options - { goalReached: boolean }
     * @returns {null}
     */
    handle(entityManager, options = {}) {
        const enemies = entityManager.getEntities('enemies');
        const { goalReached = false } = options;

        for (const enemy of enemies) {
            if (!enemy.alive) continue;

            // Skip damage processing if goal was reached
            if (goalReached) {
                enemy.hasHitPlayer = false;
                continue;
            }

            // Check enemy body collision
            this._checkEnemyBodyCollision(enemy, entityManager);

            // Check projectile collisions
            this._checkProjectileCollisions(enemy, entityManager);
        }

        return null;
    }

    /**
     * Check enemy body collision with player
     * @private
     */
    _checkEnemyBodyCollision(enemy, entityManager) {
        if (this.context.player.checkObstacleCollision(enemy)) {
            if (!enemy.hasHitPlayer && this.context.player.alive) {
                enemy.hasHitPlayer = true;
                this._handleDamageCollision(enemy, entityManager, enemy.damage || 1);
            }
        } else {
            enemy.hasHitPlayer = false;
        }
    }

    /**
     * Check projectile collisions
     * @private
     */
    _checkProjectileCollisions(enemy, entityManager) {
        if (!enemy.projectiles || enemy.projectiles.length === 0) return;

        const playerCenterX = this.context.player.x + this.context.player.width / 2;
        const playerCenterY = this.context.player.y + this.context.player.height / 2;

        for (let i = enemy.projectiles.length - 1; i >= 0; i--) {
            const proj = enemy.projectiles[i];

            if (this._isProjectileHit(proj, playerCenterX, playerCenterY)) {
                enemy.projectiles.splice(i, 1);
                this._handleProjectileHit(proj, entityManager);
            }
        }
    }

    /**
     * Check if projectile hits player
     * @private
     */
    _isProjectileHit(proj, playerCenterX, playerCenterY) {
        const dx = proj.x - playerCenterX;
        const dy = proj.y - playerCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hitRadius = proj.radius + Math.max(this.context.player.width, this.context.player.height) / 2;
        return dist < hitRadius;
    }

    /**
     * Handle projectile hit on player
     * @private
     */
    _handleProjectileHit(proj, entityManager) {
        if (!this.context.player.alive) return;

        this.playSound('hit');

        this.createFloatingText(
            `💥 -${proj.damage || 1} ❤️`,
            proj.x,
            proj.y,
            [1.0, 0.2, 0.2, 1.0],
            entityManager
        );

        this.addCameraShake(10, 0.3);

        // Apply damage
        this.context.player.takeDamage(proj.damage || 1);
        this.context.achievementSystem.recordDamage();

        // Combo break
        this._handleComboBreak();

        // Projectile hit particles
        this._createProjectileParticles(proj, entityManager);
    }

    /**
     * Create projectile hit particles
     * @private
     */
    _createProjectileParticles(proj, entityManager) {
        for (let j = 0; j < 8; j++) {
            const angle = (Math.PI * 2 * j) / 8;
            const speed = 80 + Math.random() * 60;
            entityManager.addEntity('powerupParticles', {
                x: proj.x,
                y: proj.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.4,
                maxLife: 0.4,
                size: 3 + Math.random() * 2,
                color: [...proj.color],
                gravity: 150,
                type: 'projectile-hit'
            });
        }
    }
}
