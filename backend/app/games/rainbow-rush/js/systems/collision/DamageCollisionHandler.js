import { CollisionHandler } from './CollisionHandler.js';

/**
 * DamageCollisionHandler - Base class for damage-dealing collisions
 * Handles common damage logic with protection checks
 * Follows DRY principle - shared damage logic in one place
 */
export class DamageCollisionHandler extends CollisionHandler {
    /**
     * Handle damage collision with protection checks
     * @param {Object} entity - The damaging entity
     * @param {EntityManager} entityManager
     * @param {number} damage - Damage amount
     * @protected
     */
    _handleDamageCollision(entity, entityManager, damage = 1) {
        const isProtected = this._isPlayerProtected();

        // SUONO SEMPRE - prima di qualsiasi altra cosa
        this.playSound('hit');

        if (isProtected) {
            this._handleProtectedHit(entity, entityManager);
        } else {
            this._handleNormalDamage(entity, entityManager, damage);
        }
    }

    /**
     * Check if player is protected
     * @private
     */
    _isPlayerProtected() {
        return this.context.player.powerups.immortality || 
               this.context.player.invulnerable ||
               this.context.player.shieldActive || 
               this.context.player.isTurboActive;
    }

    /**
     * Handle hit when player is protected
     * @private
     */
    _handleProtectedHit(entity, entityManager) {
        // Bounce entity if it's mobile
        if (entity.velocityX !== undefined || entity.velocityY !== undefined) {
            this._bounceEntity(entity);
        }

        // Floating text PROTETTO
        this.createFloatingText(
            '⭐ PROTETTO!',
            this.context.player.x + this.context.player.width / 2,
            this.context.player.y - 20,
            [1.0, 0.9, 0.2, 1.0],
            entityManager
        );

        // Gold protection particles
        this._createProtectionParticles(entity, entityManager);

        // Light camera shake
        this.addCameraShake(8, 0.3);
    }

    /**
     * Handle normal damage (no protection)
     * @private
     */
    _handleNormalDamage(entity, entityManager, damage) {
        // Floating text for damage
        this.createFloatingText(
            `💥 -${damage} ❤️`,
            this.context.player.x + this.context.player.width / 2,
            this.context.player.y - 20,
            [1.0, 0.2, 0.2, 1.0],
            entityManager
        );

        // Intense camera shake
        this.addCameraShake(15, 0.5);

        // Red screen flash
        this.triggerScreenFlash(0.4, [1.0, 0.2, 0.2]);

        // Red damage particles
        this._createDamageParticles(entityManager);

        // Apply damage to player
        this.context.player.takeDamage(damage);
        this.context.achievementSystem.recordDamage();

        // Combo break notification
        this._handleComboBreak();
    }

    /**
     * Bounce entity away from player
     * @private
     */
    _bounceEntity(entity) {
        const bounceForce = 400;
        const dx = entity.x - (this.context.player.x + this.context.player.width / 2);
        const dy = entity.y - (this.context.player.y + this.context.player.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        entity.velocityX = (dx / distance) * bounceForce;
        entity.velocityY = (dy / distance) * bounceForce - 100;
    }

    /**
     * Create gold protection particles
     * @private
     */
    _createProtectionParticles(entity, entityManager) {
        const impactX = entity.x + (entity.width || 0) / 2;
        const impactY = entity.y + (entity.height || 0) / 2;

        for (let j = 0; j < 12; j++) {
            const angle = (Math.PI * 2 * j) / 12;
            const speed = 100 + Math.random() * 80;
            entityManager.addEntity('powerupParticles', {
                x: impactX,
                y: impactY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.5,
                maxLife: 0.5,
                size: 4 + Math.random() * 2,
                color: [1.0, 0.9, 0.2, 1.0],
                gravity: 100,
                type: 'shield-particle'
            });
        }
    }

    /**
     * Create red damage particles
     * @private
     */
    _createDamageParticles(entityManager) {
        for (let j = 0; j < 12; j++) {
            const angle = (Math.PI * 2 * j) / 12;
            const speed = 100 + Math.random() * 80;
            entityManager.addEntity('powerupParticles', {
                x: this.context.player.x + this.context.player.width / 2,
                y: this.context.player.y + this.context.player.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 50,
                life: 0.6,
                maxLife: 0.6,
                size: 4 + Math.random() * 3,
                color: [1.0, 0.2, 0.2, 1.0],
                gravity: 200,
                type: 'damage-particle'
            });
        }
    }

    /**
     * Handle combo break
     * @private
     */
    _handleComboBreak() {
        if (this.context.scoreSystem.combo > 3) {
            this.playSound('combo_break');
            this.addNotification(
                '💔 Combo Perso!',
                `Hai perso la combo x${this.context.scoreSystem.combo}`,
                'warning'
            );
        }
    }
}
