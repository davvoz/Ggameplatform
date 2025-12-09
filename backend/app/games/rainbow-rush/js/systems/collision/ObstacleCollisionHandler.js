import { DamageCollisionHandler } from './DamageCollisionHandler.js';

/**
 * ObstacleCollisionHandler - Handles obstacle collisions
 * Single Responsibility: Obstacle collision, near-miss detection, damage
 */
export class ObstacleCollisionHandler extends DamageCollisionHandler {
    /**
     * Handle obstacle collisions
     * @param {EntityManager} entityManager
     * @param {Object} options - { goalReached: boolean }
     * @returns {null}
     */
    handle(entityManager, options = {}) {
        const obstacles = entityManager.getEntities('obstacles');
        const { goalReached = false } = options;

        for (const obstacle of obstacles) {
            // Early rejection - skip if too far horizontally
            if (!this._isObstacleNearPlayer(obstacle)) continue;

            // Near miss detection
            this._checkNearMiss(obstacle, entityManager);

            // Collision detection
            if (this.context.player.checkObstacleCollision(obstacle)) {
                // Skip damage if goal reached
                if (!goalReached && !obstacle.hasHitPlayer && this.context.player.alive) {
                    obstacle.hasHitPlayer = true;
                    this._handleDamageCollision(obstacle, entityManager, obstacle.damage || 1);
                }
            } else {
                // Reset flag when no collision
                obstacle.hasHitPlayer = false;
            }
        }

        return null;
    }

    /**
     * Check if obstacle is near player (early rejection)
     * @private
     */
    _isObstacleNearPlayer(obstacle) {
        const playerRight = this.context.player.x + this.context.player.width;
        return !(obstacle.x > playerRight + 100 || 
                 obstacle.x + obstacle.width < this.context.player.x - 50);
    }

    /**
     * Check and handle near-miss detection
     * @private
     */
    _checkNearMiss(obstacle, entityManager) {
        const playerRight = this.context.player.x + this.context.player.width;
        const playerBottom = this.context.player.y + this.context.player.height;
        const obstacleLeft = obstacle.x;
        const obstacleTop = obstacle.y;
        const obstacleBottom = obstacle.y + obstacle.height;

        // Near miss if passes within 15px of obstacle
        if (playerRight > obstacleLeft - 15 &&
            playerRight < obstacleLeft + 5 &&
            this.context.player.y < obstacleBottom &&
            playerBottom > obstacleTop) {
            
            if (!obstacle.nearMissTriggered) {
                obstacle.nearMissTriggered = true;
                this.playSound('near_miss');
                this.context.achievementSystem.recordNearMiss();
                this.createFloatingText(
                    '😎 +5',
                    obstacle.x,
                    obstacle.y - 20,
                    [0.0, 1.0, 1.0, 1.0],
                    entityManager
                );
                this.context.scoreSystem.addPoints(5);
                this.context.achievementSystem.checkAchievements();

                // Near miss sparkles
                this.context.particleSystem.createSparkles(
                    playerRight,
                    this.context.player.y + this.context.player.height / 2,
                    [0.0, 1.0, 1.0],
                    10,
                    entityManager
                );
            }
        }
    }
}
