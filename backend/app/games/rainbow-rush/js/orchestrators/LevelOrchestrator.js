/**
 * LevelOrchestrator - Orchestrates level progression and related features
 * Extracts level loading, completion, ability unlocking logic from GameController
 * Single Responsibility: Manage level lifecycle and progression
 */

export class LevelOrchestrator {
    constructor(levelManager, scoreSystem, entityManager, player, audioManager, animationController) {
        this.levelManager = levelManager;
        this.scoreSystem = scoreSystem;
        this.entityManager = entityManager;
        this.player = player;
        this.audioManager = audioManager;
        this.animationController = animationController;
        
        // Ability unlock configuration
        this.FLIGHT_UNLOCK_LEVEL = 10;
        this.TURBO_UNLOCK_LEVEL = 20;
        
        this.unlockedAbilities = {
            flight: false,
            turbo: false
        };
        
        this.abilityUnlockAnimation = null;
        this.flightButtonUI = null;
        this.turboButtonUI = null;
        this.backgroundSystem = null;
    }

    /**
     * Set UI components for ability unlock feedback
     */
    setUIComponents(components) {
        this.abilityUnlockAnimation = components.abilityUnlockAnimation;
        this.flightButtonUI = components.flightButtonUI;
        this.turboButtonUI = components.turboButtonUI;
        this.backgroundSystem = components.backgroundSystem;
    }

    /**
     * Load specific level
     * @param {number} levelId - Level ID to load
     * @param {Object} dims - Canvas dimensions {width, height}
     */
    loadLevel(levelId, dims) {
        console.log(`📋 Loading level ${levelId}`);
        
        // Reset death animation state
        if (this.animationController) {
            this.animationController.reset();
        }
        
        // Silent unlock: Unlock abilities if loading level >= unlock threshold
        this._silentUnlockAbilities(levelId);
        
        // Load level data
        this.levelManager.loadLevel(levelId);
        
        // Generate level entities
        const entities = this.levelManager.generateLevelEntities();
        
        // Clear existing entities
        this._clearAllEntities();
        
        // Add entities to EntityManager
        this._addEntitiesToManager(entities);
        
        // Position player on first platform
        this._positionPlayerOnFirstPlatform(entities.platforms, dims);
        
        // Update background for level
        if (this.backgroundSystem) {
            this.backgroundSystem.setLevel(levelId);
        }
        
        console.log(`🎮 Level ${levelId} loaded!`);
    }

    /**
     * Load next level in sequence
     * @param {Object} dims - Canvas dimensions
     */
    loadNextLevel(dims) {
        const nextLevelId = this.levelManager.currentLevelId + 1;
        this.loadLevel(nextLevelId, dims);
    }

    /**
     * Retry current level
     * @param {Object} dims - Canvas dimensions
     */
    retryLevel(dims) {
        const currentLevelId = this.levelManager.currentLevelId;
        this.levelManager.reloadLevel();
        this.loadLevel(currentLevelId, dims);
    }

    /**
     * Handle level completion
     * Checks for ability unlocks and prepares summary
     * @returns {Object} Level summary data
     */
    onLevelComplete() {
        console.log('🎉 Level Complete!');
        
        const currentLevel = this.levelManager.currentLevelId;
        
        // Check and show ability unlock animations (if applicable)
        this.checkAbilityUnlock(currentLevel);
        
        // Get level summary
        const summary = this.levelManager.getLevelSummary();
        summary.score = this.scoreSystem.getScore();
        
        return summary;
    }

    /**
     * Check if player has unlocked new abilities
     * Shows unlock animation for newly unlocked abilities
     * @param {number} completedLevel - Level just completed
     * @returns {boolean} - True if any ability was unlocked
     */
    checkAbilityUnlock(completedLevel) {
        let unlocked = false;
        
        // Flight unlock animation ONLY when completing level 9
        if (completedLevel === (this.FLIGHT_UNLOCK_LEVEL - 1) && !this.unlockedAbilities.flight) {
            this.unlockedAbilities.flight = true;
            
            // Update UI button immediately
            if (this.flightButtonUI) {
                this.flightButtonUI.setUnlocked(true);
            }
            
            console.log('✈️ Flight ability unlocked with animation!');
            
            // Start unlock animation
            if (this.abilityUnlockAnimation) {
                this.abilityUnlockAnimation.start('flight');
            }
            this.audioManager.playSound('powerup');
            unlocked = true;
        }
        
        // Turbo unlock animation ONLY when completing level 19
        if (completedLevel === (this.TURBO_UNLOCK_LEVEL - 1) && !this.unlockedAbilities.turbo) {
            this.unlockedAbilities.turbo = true;
            
            // Update UI button immediately
            if (this.turboButtonUI) {
                this.turboButtonUI.setUnlocked(true);
            }
            
            console.log('🚀 Turbo ability unlocked with animation!');
            
            // Start unlock animation
            if (this.abilityUnlockAnimation) {
                this.abilityUnlockAnimation.start('turbo');
            }
            this.audioManager.playSound('powerup');
            unlocked = true;
        }
        
        return unlocked;
    }

    /**
     * Reset player powerup effects (for level transitions)
     */
    resetPlayerEffects() {
        this.player.isTurboActive = false;
        this.player.turboTimeRemaining = 0;
        this.player.turboCooldownRemaining = 0;
        this.player.isFlightActive = false;
        this.player.flightTimeRemaining = 0;
        this.player.flightCooldownRemaining = 0;
        this.player.instantFlightActive = false;
        this.player.instantFlightDuration = 0;
        this.player.boostActive = false;
        this.player.boostTimer = 0;
        this.player.shieldActive = false;
        this.player.shieldDuration = 0;
        this.player.powerups = {
            immortality: false,
            flight: false,
            superJump: false
        };
    }

    /**
     * Get unlocked abilities state
     * @returns {Object} - {flight: boolean, turbo: boolean}
     */
    getUnlockedAbilities() {
        return { ...this.unlockedAbilities };
    }

    /**
     * Silent unlock abilities if loading level beyond unlock threshold
     * No animation shown
     * @private
     */
    _silentUnlockAbilities(levelId) {
        if (levelId >= this.FLIGHT_UNLOCK_LEVEL) {
            this.unlockedAbilities.flight = true;
            if (this.flightButtonUI) {
                this.flightButtonUI.setUnlocked(true);
            }
        }
        if (levelId >= this.TURBO_UNLOCK_LEVEL) {
            this.unlockedAbilities.turbo = true;
            if (this.turboButtonUI) {
                this.turboButtonUI.setUnlocked(true);
            }
        }
    }

    /**
     * Clear all entities from EntityManager
     * @private
     */
    _clearAllEntities() {
        this.entityManager.platforms = [];
        this.entityManager.obstacles = [];
        this.entityManager.collectibles = [];
        this.entityManager.powerups = [];
        this.entityManager.hearts = [];
        this.entityManager.boosts = [];
        this.entityManager.magnetBonuses = [];
        this.entityManager.coinRainBonuses = [];
        this.entityManager.shieldBonuses = [];
        this.entityManager.multiplierBonuses = [];
        this.entityManager.rainbowBonuses = [];
        this.entityManager.heartRechargeBonuses = [];
        this.entityManager.flightBonuses = [];
        this.entityManager.rechargeBonuses = [];
        this.entityManager.powerupParticles = [];
        this.entityManager.boostParticles = [];
        this.entityManager.floatingTexts = [];
    }

    /**
     * Add generated entities to EntityManager
     * @private
     */
    _addEntitiesToManager(entities) {
        entities.platforms.forEach(p => this.entityManager.addEntity('platforms', p));
        entities.enemies.forEach(e => this.entityManager.addEntity('obstacles', e));
        entities.collectibles.forEach(c => this.entityManager.addEntity('collectibles', c));
        entities.powerups.forEach(p => this.entityManager.addEntity('powerups', p));
        entities.hearts.forEach(h => this.entityManager.addEntity('hearts', h));
        entities.shieldBonuses.forEach(s => this.entityManager.addEntity('shieldBonuses', s));
        entities.magnetBonuses.forEach(m => this.entityManager.addEntity('magnetBonuses', m));
        entities.coinRainBonuses.forEach(c => this.entityManager.addEntity('coinRainBonuses', c));
        entities.multiplierBonuses.forEach(m => this.entityManager.addEntity('multiplierBonuses', m));
        entities.rainbowBonuses.forEach(r => this.entityManager.addEntity('rainbowBonuses', r));
        entities.flightBonuses.forEach(f => this.entityManager.addEntity('flightBonuses', f));
        entities.rechargeBonuses.forEach(r => this.entityManager.addEntity('rechargeBonuses', r));
        entities.heartRechargeBonuses.forEach(h => this.entityManager.addEntity('heartRechargeBonuses', h));
        entities.obstacles.forEach(o => this.entityManager.addEntity('obstacles', o));
        
        // Add goal flag as special entity
        if (entities.goalFlag) {
            this.entityManager.addEntity('collectibles', entities.goalFlag);
        }
    }

    /**
     * Position player on first platform
     * @private
     */
    _positionPlayerOnFirstPlatform(platforms, dims) {
        if (platforms && platforms.length > 0) {
            const firstPlatform = platforms[0];
            const playerX = firstPlatform.x + firstPlatform.width / 2 - this.player.width / 2;
            const playerY = firstPlatform.y - this.player.height - 5;
            
            // Reset player state (alive, velocities, powerups, etc.)
            this.player.reset(playerX, playerY);
            
            console.log(`👤 Player positioned on first platform at (${playerX.toFixed(0)}, ${playerY.toFixed(0)})`);
        }
    }

    /**
     * Find last unlocked level based on progress
     * @param {Object} progress - Level progress data
     * @returns {number} - Last unlocked level ID
     */
    findLastUnlockedLevel(progress) {
        let lastUnlocked = 1;
        for (let i = 1; i <= 200; i++) {
            if (progress[i] && progress[i].completed) {
                lastUnlocked = i + 1;
            } else {
                break;
            }
        }
        return Math.min(lastUnlocked, 200);
    }
}
