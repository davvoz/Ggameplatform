/**
 * CollisionContext - Dependency Injection Container
 * Holds all shared dependencies for collision handlers
 * Follows Dependency Inversion Principle (DIP)
 */
export class CollisionContext {
    constructor({
        player,
        audioManager,
        achievementSystem,
        scoreSystem,
        particleSystem,
        animationController,
        levelManager = null
    }) {
        this.player = player;
        this.audioManager = audioManager;
        this.achievementSystem = achievementSystem;
        this.scoreSystem = scoreSystem;
        this.particleSystem = particleSystem;
        this.animationController = animationController;
        this.levelManager = levelManager;
    }

    /**
     * Set level manager reference
     * @param {Object} levelManager
     */
    setLevelManager(levelManager) {
        this.levelManager = levelManager;
    }
}
