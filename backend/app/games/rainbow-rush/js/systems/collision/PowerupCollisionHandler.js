import { CollisionHandler } from './CollisionHandler.js';

/**
 * PowerupCollisionHandler - Base class for all powerup/bonus handlers
 * Provides common powerup collection logic
 */
export class PowerupCollisionHandler extends CollisionHandler {
    /**
     * Handle basic powerup collection with standard effects
     * @param {Object} powerup
     * @param {Array} powerups
     * @param {number} index
     * @param {EntityManager} entityManager
     * @param {Object} config - { text, color, points, sound }
     * @protected
     */
    _handlePowerupCollection(powerup, powerups, index, entityManager, config) {
        powerups.splice(index, 1);

        // Create explosion
        this.createExplosion(powerup.x, powerup.y, config.color || powerup.color, 80, entityManager);

        // Create floating text
        this.createFloatingText(
            config.text,
            powerup.x,
            powerup.y,
            config.color || powerup.color,
            entityManager
        );

        // Add points if specified
        if (config.points) {
            this.context.scoreSystem.addPoints(config.points);
        }

        // Play sound
        this.playSound(config.sound || 'powerup');
    }

    /**
     * Create particle ring for powerup effects
     * @protected
     */
    _createParticleRing(x, y, color, count, entityManager, speed = 150, life = 0.8) {
        for (let j = 0; j < count; j++) {
            const angle = (Math.PI * 2 * j) / count;
            const particleSpeed = speed + Math.random() * 100;
            entityManager.addEntity('powerupParticles', {
                x: x,
                y: y,
                vx: Math.cos(angle) * particleSpeed,
                vy: Math.sin(angle) * particleSpeed,
                life: life,
                maxLife: life,
                size: 4 + Math.random() * 3,
                color: color,
                gravity: 0,
                rotationSpeed: (Math.random() - 0.5) * 10,
                rotation: 0,
                type: 'powerup-particle'
            });
        }
    }
}
