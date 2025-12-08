import { CollisionContext } from './collision/CollisionContext.js';
import { PlatformCollisionHandler } from './collision/PlatformCollisionHandler.js';
import { ObstacleCollisionHandler } from './collision/ObstacleCollisionHandler.js';
import { CollectibleCollisionHandler } from './collision/CollectibleCollisionHandler.js';
import { EnemyCollisionHandler } from './collision/EnemyCollisionHandler.js';
import { HeartCollisionHandler, ShieldCollisionHandler, MagnetCollisionHandler, BoostCollisionHandler } from './collision/BasicPowerupHandlers.js';
import { AdvancedBonusHandler } from './collision/AdvancedBonusHandler.js';

/**
 * CollisionDetector - Orchestrator for collision detection
 * Follows SOLID principles:
 * - Single Responsibility: Orchestrates collision handlers
 * - Open/Closed: Open for extension (new handlers), closed for modification
 * - Liskov Substitution: All handlers extend CollisionHandler
 * - Interface Segregation: Handlers implement only what they need
 * - Dependency Inversion: Depends on abstractions (CollisionHandler), not concrete classes
 */
export class CollisionDetector {
    constructor(player, audioManager, achievementSystem, scoreSystem, particleSystem, animationController) {
        // Create dependency injection context
        this.context = new CollisionContext({
            player,
            audioManager,
            achievementSystem,
            scoreSystem,
            particleSystem,
            animationController
        });

        // Initialize collision handlers (Strategy Pattern)
        this.handlers = {
            platform: new PlatformCollisionHandler(this.context),
            obstacle: new ObstacleCollisionHandler(this.context),
            collectible: new CollectibleCollisionHandler(this.context),
            enemy: new EnemyCollisionHandler(this.context),
            heart: new HeartCollisionHandler(this.context),
            shield: new ShieldCollisionHandler(this.context),
            magnet: new MagnetCollisionHandler(this.context),
            boost: new BoostCollisionHandler(this.context),
            advancedBonus: new AdvancedBonusHandler(this.context)
        };

        // Legacy compatibility
        this.player = player;
        this.audioManager = audioManager;
        this.achievementSystem = achievementSystem;
        this.scoreSystem = scoreSystem;
        this.particleSystem = particleSystem;
        this.animationController = animationController;
        this.levelManager = null;
    }

    /**
     * Set level manager reference (for backward compatibility)
     * @param {Object} levelManager
     */
    setLevelManager(levelManager) {
        this.levelManager = levelManager;
        this.context.setLevelManager(levelManager);
    }

    /**
     * Check goal collision - player touches/crosses goal flag
     * @param {Object} goalEntity - The goal flag entity
     * @returns {boolean} - True if player has reached the goal
     */
    checkGoalCollision(goalEntity) {
        if (!goalEntity || goalEntity.reached) return false;

        // Don't allow goal completion if player is dead
        if (!this.player.alive) return false;

        // Check if player's right edge has crossed the goal's left edge
        const playerRightEdge = this.player.x + this.player.width;
        const goalLeftEdge = goalEntity.x;

        if (playerRightEdge >= goalLeftEdge) {
            console.log(`🏁 GOAL REACHED! Player X: ${playerRightEdge.toFixed(0)} >= Goal X: ${goalLeftEdge.toFixed(0)}`);
            goalEntity.reached = true;
            return true;
        }

        return false;
    }

    /**
     * Check all collisions (Main orchestration method)
     * @param {EntityManager} entityManager
     * @param {SafetyPlatformSystem} safetyPlatformSystem
     * @param {PowerupSystem} powerupSystem
     * @param {boolean} goalReached - If true, skip damage/bonus processing
     * @returns {boolean} - True if player is on safety platform
     */
    checkAll(entityManager, safetyPlatformSystem, powerupSystem, goalReached = false) {
        // Reset grounded state
        this.player.isGrounded = false;
        let playerOnSafetyPlatform = false;

        // Store safety platform system reference for handlers
        this.context.safetyPlatformSystem = safetyPlatformSystem;

        // Safety platform collision (check first with high tolerance)
        playerOnSafetyPlatform = this._checkSafetyPlatform(safetyPlatformSystem);

        // Delegate to specialized handlers (Strategy Pattern)
        const options = { goalReached, powerupSystem };

        this.handlers.platform.handle(entityManager, options);
        this.handlers.obstacle.handle(entityManager, options);
        this.handlers.enemy.handle(entityManager, options);
        this.handlers.collectible.handle(entityManager, options);

        if (!goalReached) {
            this.handlers.heart.handle(entityManager, options);
            this.handlers.shield.handle(entityManager, options);
            this.handlers.magnet.handle(entityManager, options);
            this.handlers.boost.handle(entityManager, options);

            // Powerup collisions
            this.checkPowerupCollisions(entityManager, powerupSystem);
        }

        return playerOnSafetyPlatform;
    }

    /**
     * Check safety platform collision (legacy logic)
     * @private
     */
    _checkSafetyPlatform(safetyPlatformSystem) {
        if (!safetyPlatformSystem.isActive()) return false;

        const safetyPlatform = safetyPlatformSystem.getPlatform();
        const onSafety = this.player.checkPlatformCollision(safetyPlatform, 80);

        if (onSafety) {
            // Suono negativo quando atterriamo
            if (this.player.previousVelocityY > 50 && !this.player.wasOnSafetyPlatform) {
                this.audioManager.playSound('safety_land');
                this.player.wasOnSafetyPlatform = true;
            }

            // Force position above platform
            if (this.player.velocityY > 0) {
                this.player.y = safetyPlatform.y - this.player.height;
                this.player.velocityY = 0;
                this.player.isGrounded = true;
            }
            return true;
        } else {
            this.player.wasOnSafetyPlatform = false;
            return false;
        }
    }

    /**
     * Check bonus collisions (delegates to AdvancedBonusHandler)
     * @param {EntityManager} entityManager
     * @returns {Object|null} - Activation data for special effects
     */
    checkBonusCollisions(entityManager) {
        return this.handlers.advancedBonus.handle(entityManager);
    }

    /**
     * Legacy methods - kept for backward compatibility
     * These now delegate to the new handler system
     */
    checkPlatformCollisions(entityManager) {
        return this.handlers.platform.handle(entityManager);
    }

    checkObstacleCollisions(entityManager, goalReached = false) {
        return this.handlers.obstacle.handle(entityManager, { goalReached });
    }

    checkCollectibleCollisions(entityManager) {
        return this.handlers.collectible.handle(entityManager);
    }

    checkEnemyCollisions(entityManager, goalReached = false) {
        return this.handlers.enemy.handle(entityManager, { goalReached });
    }

    checkHeartCollisions(entityManager) {
        return this.handlers.heart.handle(entityManager);
    }

    checkShieldCollisions(entityManager) {
        return this.handlers.shield.handle(entityManager);
    }

    checkMagnetCollisions(entityManager) {
        return this.handlers.magnet.handle(entityManager);
    }

    checkBoostCollisions(entityManager) {
        return this.handlers.boost.handle(entityManager);
    }


    /**
     * Check powerup collisions (legacy compatibility)
     * Kept as separate method for integration with PowerupSystem
     */
    checkPowerupCollisions(entityManager, powerupSystem) {
        const powerups = entityManager.getEntities('powerups');

        for (let i = powerups.length - 1; i >= 0; i--) {
            if (this.player.checkPowerupCollision(powerups[i])) {
                const powerup = powerups[i];
                powerup.collected = true;

                this.particleSystem.createPowerupExplosion(
                    powerup.x,
                    powerup.y,
                    powerup.powerupType || powerup.type,
                    entityManager
                );

                const powerupType = powerup.powerupType || powerup.type;
                const activated = powerupSystem.activatePowerup(
                    powerupType,
                    powerup.duration,
                    powerup.cooldown
                );

                if (activated) {
                    powerups.splice(i, 1);
                    this.achievementSystem.recordPowerup();
                    this.achievementSystem.checkAchievements();
                }
            }
        }
    }

    /**
     * Check goal collision - player touches/crosses goal flag
     * @param {Object} goalEntity - The goal flag entity
     * @returns {boolean} - True if player has reached the goal
     */
    checkGoalCollision(goalEntity) {
        if (!goalEntity || goalEntity.reached) return false;

        // Don't allow goal completion if player is dead
        if (!this.player.alive) return false;

        // Check if player's right edge has crossed the goal's left edge
        const playerRightEdge = this.player.x + this.player.width;
        const goalLeftEdge = goalEntity.x;

        if (playerRightEdge >= goalLeftEdge) {
            console.log(`🏁 GOAL REACHED! Player X: ${playerRightEdge.toFixed(0)} >= Goal X: ${goalLeftEdge.toFixed(0)}`);
            goalEntity.reached = true;
            return true;
        }

        return false;
    }
}
