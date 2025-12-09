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
        this.enemySystem = null; // Will be set externally
        this.gameController = null; // Will be set externally
        
        // Registra callback per spawn goal dinamico
        this.levelManager.onSpawnGoal = (goalFlag) => {
            this.entityManager.addEntity('collectibles', goalFlag);
        };
        
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
     * Set enemy system for loading enemies
     */
    setEnemySystem(enemySystem) {
        this.enemySystem = enemySystem;
    }

    /**
     * Set game controller reference for accessing shared state
     */
    setGameController(gameController) {
        this.gameController = gameController;
    }

    /**
     * Load specific level
     * @param {number} levelId - Level ID to load
     * @param {Object} dims - Canvas dimensions {width, height}
     * @param {boolean} resetHealth - Se true, resetta la salute del player (default: true per lista livelli)
     */
    async loadLevel(levelId, dims, resetHealth = true) {
        console.log(`📋 Loading level ${levelId} (resetHealth: ${resetHealth})`);
        
        // Session management:
        // - If resetHealth=true: NEW game session (from menu, restart, level select)
        //   → End previous session and start new one
        // - If resetHealth=false: CONTINUING game session (next level)
        //   → Keep session open, just update level if needed
        
        console.log(`🎮 [LevelOrchestrator] loadLevel called - levelId: ${levelId}, resetHealth: ${resetHealth}`);
        
        if (this.gameController?.rainbowRushSDK) {
            try {
                if (resetHealth) {
                    // NEW GAME - End previous session if exists, then start new one
                    if (this.gameController.rainbowRushSDK.sessionId) {
                        // Get current score before ending session
                        const currentScore = this.scoreSystem?.getScore() || 0;
                        console.log(`🔚 [LevelOrchestrator] Ending previous session with score: ${currentScore}`);
                        await this.gameController.rainbowRushSDK.endSession(currentScore);
                        console.log(`✅ Previous session ended (new game) with score: ${currentScore}`);
                    }
                    
                    // Start new game session for this level
                    console.log(`🚀 [LevelOrchestrator] Starting Rainbow Rush session for level ${levelId}`);
                    await this.gameController.rainbowRushSDK.startSession(levelId);
                    console.log(`✅ Game session started for level ${levelId}`);
                    
                    // Notify platform that game has started (triggers platform session creation)
                    if (this.gameController.sdkManager) {
                        console.log(`📡 [LevelOrchestrator] Calling gameStarted() to notify platform`);
                        await this.gameController.sdkManager.gameStarted();
                        console.log(`✅ [LevelOrchestrator] Platform notified of game start`);
                    }
                } else {
                    // CONTINUING - Keep session open, player is progressing through levels
                    console.log(`🎮 Continuing session for next level ${levelId}`);
                    // Optionally update session with new level info (without closing it)
                    if (this.gameController.rainbowRushSDK.sessionId) {
                        // You could add an updateSession call here if backend supports it
                    }
                }
            } catch (error) {
                console.error('❌ Failed to manage game session:', error);
            }
        }
        
        // Reset death animation state
        if (this.animationController) {
            this.animationController.reset();
        }
        
        // Reset goal reached flag for new level
        if (this.gameController) {
            this.gameController.goalReached = false;
            this.gameController.goalFadeProgress = 0;
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
        this._positionPlayerOnFirstPlatform(entities.platforms, dims, resetHealth);
        
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
        // NON resetta la salute quando si passa al livello successivo
        this.loadLevel(nextLevelId, dims, false);
    }

    /**
     * Retry current level
     * @param {Object} dims - Canvas dimensions
     */
    retryLevel(dims) {
        const currentLevelId = this.levelManager.currentLevelId;
        this.levelManager.reloadLevel();
        // Resetta la salute quando si fa retry del livello
        this.loadLevel(currentLevelId, dims, true);
    }

    /**
     * Handle level completion
     * Checks for ability unlocks and prepares summary
     * @returns {Object} Level summary data
     */
    async onLevelComplete() {
        console.log('🎉 Level Complete!');
        
        const currentLevel = this.levelManager.currentLevelId;
        
        // End current session when level is completed
        if (this.gameController?.rainbowRushSDK?.sessionId) {
            try {
                // Get final score before ending session
                const finalScore = this.scoreSystem?.getScore() || 0;
                const finalStats = {
                    score: finalScore,
                    level: currentLevel,
                    coins: this.scoreSystem?.coins || 0
                };
                await this.gameController.rainbowRushSDK.endSession(finalScore, finalStats);
                console.log(`✅ Game session ended on level complete with score: ${finalScore}`);
            } catch (error) {
                console.error('❌ Failed to end game session:', error);
            }
        }
        
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
        this.entityManager.goals = []; // Clear goal flags
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
        this.entityManager.enemies = []; // NEW: Clear enemies
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
        
        // Use EnemySystem to load enemies if available
        if (this.enemySystem && entities.enemies && entities.enemies.length > 0) {
            this.enemySystem.loadEnemiesFromLevel({ enemies: entities.enemies });
        }
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
    _positionPlayerOnFirstPlatform(platforms, dims, resetHealth = true) {
        if (platforms && platforms.length > 0) {
            const firstPlatform = platforms[0];
            const playerX = firstPlatform.x + firstPlatform.width / 2 - this.player.width / 2;
            const playerY = firstPlatform.y - this.player.height - 5;
            
            // Reset player state (alive, velocities, powerups, etc.)
            // resetHealth controlla se resettare anche la salute
            this.player.reset(playerX, playerY, resetHealth);
            
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
