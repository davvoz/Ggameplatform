/**
 * CollisionHandler - Abstract base class for collision handling
 * Follows Single Responsibility Principle (SRP)
 * Each handler type is responsible for ONE type of collision
 */
export class CollisionHandler {
    /**
     * @param {CollisionContext} context - Shared dependencies
     */
    constructor(context) {
        if (new.target === CollisionHandler) {
            throw new TypeError("Cannot construct CollisionHandler instances directly");
        }
        this.context = context;
    }

    /**
     * Abstract method - must be implemented by subclasses
     * @param {EntityManager} entityManager
     * @param {Object} options - Additional options (e.g., goalReached)
     * @returns {Object|null} - Can return collision result data
     */
    handle(entityManager, options = {}) {
        throw new Error("Method 'handle()' must be implemented");
    }

    /**
     * Helper: Check if player collides with entity
     * @param {Object} entity
     * @returns {boolean}
     */
    checkCollision(entity) {
        return this.context.player.checkCollectibleCollision(entity);
    }

    /**
     * Helper: Play sound effect
     * @param {string} soundName
     */
    playSound(soundName) {
        this.context.audioManager.playSound(soundName);
    }

    /**
     * Helper: Create floating text
     * @param {string} text
     * @param {number} x
     * @param {number} y
     * @param {Array} color
     * @param {EntityManager} entityManager
     */
    createFloatingText(text, x, y, color, entityManager) {
        this.context.animationController.createFloatingText(text, x, y, color, entityManager);
    }

    /**
     * Helper: Create particle explosion
     * @param {number} x
     * @param {number} y
     * @param {Array|string} color
     * @param {number} count
     * @param {EntityManager} entityManager
     */
    createExplosion(x, y, color, count, entityManager) {
        this.context.particleSystem.createBonusExplosion(x, y, color, count, entityManager);
    }

    /**
     * Helper: Add achievement notification
     * @param {string} title
     * @param {string} message
     * @param {string} type
     */
    addNotification(title, message, type = 'info') {
        this.context.achievementSystem.addNotification(title, message, type);
    }

    /**
     * Helper: Add camera shake
     * @param {number} intensity
     * @param {number} duration
     */
    addCameraShake(intensity, duration) {
        this.context.player.addCameraShake(intensity, duration);
    }

    /**
     * Helper: Trigger screen flash
     * @param {number} intensity
     * @param {Array} color
     */
    triggerScreenFlash(intensity, color) {
        this.context.animationController.triggerScreenFlash(intensity, color);
    }
}
