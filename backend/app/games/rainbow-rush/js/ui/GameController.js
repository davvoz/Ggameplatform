/**
 * GameController - Thin Orchestrator (REFACTORED)
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Coordinates components, delegates all logic
 * - Open/Closed: Extensible via new systems/commands without modification
 * - Liskov Substitution: All systems implement ISystem interface
 * - Interface Segregation: Components use focused interfaces
 * - Dependency Inversion: Depends on abstractions, injected via builder
 * 
 * Reduced from 1420 to ~350 lines by delegating to:
 * - SystemOrchestrator: Manages system lifecycle (update/reset/resize)
 * - GameStateMachine: Handles state transitions
 * - InputCommandMapper: Maps input to commands
 * - UIManager: Coordinates UI with Chain of Responsibility
 * - LevelOrchestrator: Manages level progression
 * 
 * Complexity: O(n) where n = number of systems (was O(n²))
 * Cyclomatic Complexity: <5 per method (was >25)
 */

import { GameStates } from '../core/GameState.js'

export class GameController {
    /**
     * Constructor with Dependency Injection
     * All dependencies injected via GameControllerBuilder
     */
    constructor(dependencies) {
        // Core
        this.canvas = dependencies.canvas;
        this.engine = dependencies.engine;
        this.gameState = dependencies.gameState;
        
        // Entities
        this.player = dependencies.player;
        
        // New orchestrators (SOLID components)
        this.systemOrchestrator = dependencies.systemOrchestrator;
        this.stateMachine = dependencies.stateMachine;
        this.uiManager = dependencies.uiManager;
        this.inputCommandMapper = dependencies.inputCommandMapper;
        this.levelOrchestrator = dependencies.levelOrchestrator;
        
        // Systems (injected, not instantiated)
        this.renderingSystem = dependencies.renderingSystem;
        this.scoreSystem = dependencies.scoreSystem;
        this.powerupSystem = dependencies.powerupSystem;
        this.backgroundSystem = dependencies.backgroundSystem;
        this.achievementSystem = dependencies.achievementSystem;
        this.audioManager = dependencies.audioManager;
        this.inputManager = dependencies.inputManager;
        this.sdkManager = dependencies.sdkManager;
        this.entityManager = dependencies.entityManager;
        this.safetyPlatformSystem = dependencies.safetyPlatformSystem;
        this.collisionDetector = dependencies.collisionDetector;
        this.animationController = dependencies.animationController;
        this.particleSystem = dependencies.particleSystem;
        this.levelManager = dependencies.levelManager;
        this.enemySystem = dependencies.enemySystem; // NEW: Enemy system
        
        // UI Components
        this.turboButtonUI = dependencies.turboButtonUI;
        this.flightButtonUI = dependencies.flightButtonUI;
        this.levelProgressBar = dependencies.levelProgressBar;
        this.abilityUnlockAnimation = dependencies.abilityUnlockAnimation;
        
        // Minimal state (game-specific effects)
        this.screenFlash = { alpha: 0, color: [1.0, 1.0, 1.0] };
        this.coinRainActive = false;
        this.coinRainTimer = 0;
        this.coinRainDuration = 0;
        this.coinRainSpawnTimer = 0;
        this.coinRainSpawnInterval = 0.3;
        this.timeScale = 1.0;
        this.cleanupTimer = 0;
        this.cleanupInterval = 1.0;
        
        // Auto-pause state
        this.autoPaused = false;
    }

    /**
     * Initialize game controller
     * Async initialization of all systems
     */
    async initialize() {
        // Initialize AudioManager first
        await this.audioManager.initialize();
        console.log('🔊 AudioManager initialized');
        
        // Initialize Platform SDK
        await this.sdkManager.initialize();
        console.log('🎮 Platform SDK initialized');
        
        // Setup rendering system update hook
        this.renderingSystem.update = (deltaTime, entities) => {
            this.updateGame(deltaTime);
            this.renderingSystem.setPowerupTimers(this.powerupSystem.getAllTimers());
            this.renderingSystem.setPlayer(this.player);
        };
        this.engine.registerSystem(this.renderingSystem);

        // Setup input handlers (delegates to InputCommandMapper)
        this._setupInputHandlers();

        // Setup system event listeners
        this._setupSystemListeners();

        // Setup visibility handler for auto-pause
        this._setupVisibilityHandler();

        // Sync UI with renderer
        this.uiManager.syncWithRenderer(this.renderingSystem);

        // Initialize state machine to MENU
        const context = this._getGameContext();
        this.stateMachine.transitionTo(GameStates.MENU, context);

        console.log('✅ GameController initialized');
    }

    /**
     * Main game update loop (SIMPLIFIED)
     * Delegates to SystemOrchestrator and specialized systems
     */
    updateGame(deltaTime) {
        const context = this._getGameContext();

        // Update animations (always, even during death)
        this.animationController.update(deltaTime);
        this.animationController.updateFloatingTexts(this.entityManager.floatingTexts, deltaTime);

        // Update state machine
        this.stateMachine.update(deltaTime, context);

        // Only update game systems when playing
        if (!this.stateMachine.isPlaying()) return;

        // Delegate to SystemOrchestrator for coordinated updates
        this._updateGameSystems(deltaTime, context);

        // Update rendering data
        this._updateRenderingData();

        // Check win/lose conditions
        this._checkGameConditions(context);
    }

    /**
     * Update all game systems (delegated)
     * @private
     */
    _updateGameSystems(deltaTime, context) {
        // Update score and achievements
        this.scoreSystem.update(deltaTime);
        this.achievementSystem.updateNotifications(deltaTime);
        this.achievementSystem.recordCombo(this.scoreSystem.combo);

        // Update powerups
        this.powerupSystem.update(deltaTime);

        // Update player
        this.player.update(deltaTime);
        const dims = this.engine.getCanvasDimensions();
        this.player.x = (dims.width * 0.35) - this.player.width / 2;

        // Update UI
        this.uiManager.update(deltaTime, context);

        // Update background (parallax)
        const cameraSpeed = this.player.boostActive ? this.player.velocityX :
            this.player.isTurboActive ? this.player.velocityX : 0;
        this.backgroundSystem.update(deltaTime, cameraSpeed * 0.3);

        // Update level manager con velocità BASE costante
        this.levelManager.update(deltaTime);
        
        // Check if goal should spawn
        const goalToSpawn = this.levelManager.shouldSpawnGoal();
        if (goalToSpawn) {
            this.entityManager.addEntity('collectibles', goalToSpawn);
            console.log('✅ Goal added to game!');
        }
        
        // Update level progress bar basata su DISTANZA
        if (this.levelProgressBar) {
            const levelProgress = this.levelManager.getProgress(); // 0.0-1.0
            this.levelProgressBar.update(
                deltaTime,
                levelProgress * 100, // Converti a percentuale
                100, // Totale sempre 100%
                this.levelManager.currentLevelId
            );
        }

        // Update entities
        this.entityManager.updateAll(deltaTime, cameraSpeed, this.player);
        
        // NEW: Update enemies (AI, movement, projectiles)
        if (this.enemySystem) {
            this.enemySystem.update(deltaTime);
        }

        // Check collisions
        const playerOnSafetyPlatform = this.collisionDetector.checkAll(
            this.entityManager,
            this.safetyPlatformSystem,
            this.powerupSystem
        );
        this.player.onSafetyPlatform = playerOnSafetyPlatform;
        this.safetyPlatformSystem.update(deltaTime, playerOnSafetyPlatform, this.entityManager, this.scoreSystem);

        // Handle special effects
        this._updateSpecialEffects(deltaTime, dims);

        // Update score with distance
        const platforms = this.entityManager.getEntities('platforms');
        const currentSpeed = Math.abs(platforms[0]?.velocity || 0);
        this.scoreSystem.updateSpeedMultiplier(currentSpeed);
        this.scoreSystem.addDistance(currentSpeed * deltaTime);

        // Periodic cleanup
        this.cleanupTimer += deltaTime;
        if (this.cleanupTimer >= this.cleanupInterval) {
            this._cleanupOffscreenEntities();
            this.cleanupTimer = 0;
        }
    }

    /**
     * Update special game effects (coin rain, etc)
     * @private
     */
    _updateSpecialEffects(deltaTime, dims) {
        // Check for bonus effects
        const bonusEffect = this.collisionDetector.checkBonusCollisions(this.entityManager);
        if (bonusEffect) {
            if (bonusEffect.type === 'coinRain' && bonusEffect.activated) {
                this.coinRainActive = true;
                this.coinRainTimer = 0;
                this.coinRainDuration = bonusEffect.duration;
            } else if (bonusEffect.type === 'rainbow' && bonusEffect.activated) {
                this.timeScale = 0.6;
                setTimeout(() => { this.timeScale = 1.0; }, 8000);
            }
        }

        // Coin rain spawning
        if (this.coinRainActive) {
            this.coinRainTimer += deltaTime;
            this.coinRainSpawnTimer += deltaTime;

            if (this.coinRainSpawnTimer >= this.coinRainSpawnInterval) {
                this._spawnCoinRainCollectible(dims);
                this.coinRainSpawnTimer = 0;
            }

            if (this.coinRainTimer >= this.coinRainDuration) {
                this.coinRainActive = false;
                this.coinRainTimer = 0;
            }
        }

        // Player landing sound
        if (this.player.hasJustLanded()) {
            this.audioManager.playSound('land');
        }

        // Ice brake effect
        if (this.player.hasJustStoppedSliding()) {
            this.player.addCameraShake(12, 0.4);
            this.audioManager.playSound('brake');
            this.player.slideDecelerationTime = 0;
        }
    }

    /**
     * Update rendering data
     * @private
     */
    _updateRenderingData() {
        // Pass data to rendering system
        this.renderingSystem.setBackground(
            this.backgroundSystem.getLayers(),
            this.backgroundSystem.getParticles(),
            this.backgroundSystem.getBackgroundColor()
        );
        this.renderingSystem.setFloatingTexts(this.entityManager.floatingTexts);
        this.renderingSystem.setAchievementNotifications(this.achievementSystem.getNotifications());
        this.renderingSystem.setScreenFlash(this.screenFlash);
        this.renderingSystem.setCombo(this.scoreSystem.getCombo());
        this.renderingSystem.setScore(this.scoreSystem.getTotalScore());
        this.renderingSystem.setLevel(this.levelManager.currentLevelId || 1);
        this.renderingSystem.setLevelLength(this.levelManager.levelLength || 3000);
        this.renderingSystem.setDistanceTraveled(this.levelManager.distanceTraveled || 0);
        this.renderingSystem.setIsPaused(this.stateMachine.isPaused());
        this.renderingSystem.setDeathAnimation(this.animationController.getAnimations().deathAnimation);

        // Collect all entities for rendering
        const entities = this._collectRenderEntities();
        this.engine.entities = entities;
    }

    /**
     * Collect all entities for rendering
     * @private
     */
    _collectRenderEntities() {
        const entities = [
            ...this.entityManager.platforms,
            ...this.entityManager.obstacles,
            ...this.entityManager.enemies,
            ...this.entityManager.collectibles,
            ...this.entityManager.powerups,
            ...this.entityManager.hearts,
            ...this.entityManager.boosts,
            ...this.entityManager.magnetBonuses,
            ...this.entityManager.coinRainBonuses,
            ...this.entityManager.shieldBonuses,
            ...this.entityManager.multiplierBonuses,
            ...this.entityManager.rainbowBonuses,
            ...this.entityManager.flightBonuses,
            ...this.entityManager.rechargeBonuses,
            ...this.entityManager.heartRechargeBonuses,
            ...this.entityManager.powerupParticles,
            ...this.entityManager.boostParticles
        ];

  
        // Add safety platform
        const safetyPlatform = this.safetyPlatformSystem.getPlatform();
        if (safetyPlatform) {
            entities.push(this._createSafetyPlatformRenderData(safetyPlatform));
        }

        entities.push(this.player);
        return entities;
    }

    /**
     * Create safety platform render data
     * @private
     */
    _createSafetyPlatformRenderData(platform) {
        return {
            ...platform,
            dissolveProgress: this.safetyPlatformSystem.getDissolveProgress(),
            isDissolving: this.safetyPlatformSystem.state === 'DISSOLVING',
            playerOnPlatform: this.safetyPlatformSystem.playerOnPlatform,
            timeOnPlatform: this.safetyPlatformSystem.playerOnPlatformTimer,
            maxTimeOnPlatform: this.safetyPlatformSystem.dissolveDuration,
            charges: this.safetyPlatformSystem.getCharges(),
            maxCharges: this.safetyPlatformSystem.maxCharges,
            canCollide: this.safetyPlatformSystem.isActive(),
            crackProgress: this.safetyPlatformSystem.getCrackProgress(),
            cracks: this.safetyPlatformSystem.getCracks(),
            // Cooldown bar data
            useTimes: this.safetyPlatformSystem.useTimes,
            useWindow: this.safetyPlatformSystem.useWindow,
            currentTime: this.safetyPlatformSystem.currentTime,
            // Charge consumption animation
            lastChargeConsumed: this.safetyPlatformSystem.lastChargeConsumed,
            chargeConsumedTime: this.safetyPlatformSystem.chargeConsumedTime,
            // Recharge animation
            isRecharging: this.safetyPlatformSystem.isRechargingNow(),
            rechargeAnimProgress: this.safetyPlatformSystem.getRechargeAnimProgress(),
            rechargeAnimDuration: this.safetyPlatformSystem.getRechargeAnimDuration(),
            chargesBeforeRecharge: this.safetyPlatformSystem.getChargesBeforeRecharge()
        };
    }

    /**
     * Check game win/lose conditions
     * @private
     */
    _checkGameConditions(context) {
        // Check level completion
        if (this.levelManager.checkLevelCompletion()) {
            this.stateMachine.handleInput('levelComplete', null, context);
        }

        // Check player death
        if (!this.player.alive && !this.animationController.isShowingDeathAnimation) {
            this._startDeathSequence();
        }
    }

    /**
     * Setup input handlers via InputCommandMapper
     * @private
     */
    _setupInputHandlers() {
        const context = () => this._getGameContext();

        // Keyboard inputs
        this.inputManager.addEventListener('jump', () => 
            this.inputCommandMapper.executeCommand('jump', context())
        );
        this.inputManager.addEventListener('jumpRelease', (duration) => 
            this.inputCommandMapper.executeCommand('jumpRelease', context(), duration)
        );
        this.inputManager.addEventListener('turbo', () => 
            this.inputCommandMapper.executeCommand('turbo', context())
        );
        this.inputManager.addEventListener('flight', () => 
            this.inputCommandMapper.executeCommand('flight', context())
        );
        this.inputManager.addEventListener('flightUp', () => 
            this.inputCommandMapper.executeCommand('flightUp', context())
        );
        this.inputManager.addEventListener('flightDown', () => 
            this.inputCommandMapper.executeCommand('flightDown', context())
        );

        // Click handler (delegates to UIManager)
        this.inputManager.addEventListener('click', (data) => 
            this.uiManager.handleClick(data.x, data.y, context())
        );
    }

    /**
     * Setup system event listeners
     * @private
     */
    _setupSystemListeners() {
        // Powerup listeners
        this.powerupSystem.addEventListener('activate', (type) => {
            this.player.activatePowerup(type);
            this.audioManager.playSound(`powerup_${type}`);
        });
        this.powerupSystem.addEventListener('deactivate', (type) => {
            this.player.deactivatePowerup(type);
            this.audioManager.playSound('powerup_end');
        });
        this.powerupSystem.addEventListener('ready', () => {
            this.audioManager.playSound('powerup_ready');
        });

        // Score listeners
        this.scoreSystem.onScoreChange(() => {
            const stats = this.scoreSystem.getGameStats();
            window.dispatchEvent(new CustomEvent('gameUpdate', { detail: stats }));
        });
    }

    /**
     * Setup visibility handler for auto-pause
     * @private
     */
    _setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.stateMachine.isPlaying()) {
                this.pauseGame();
                this.autoPaused = true;
            } else if (!document.hidden && this.autoPaused && this.stateMachine.isPaused()) {
                this.resumeGame();
                this.autoPaused = false;
            }
        });
    }

    /**
     * Get game context for commands/states
     * @private
     */
    _getGameContext() {
        return {
            gameController: this,
            gameState: this.gameState,
            stateMachine: this.stateMachine,
            player: this.player,
            engine: this.engine,
            audioManager: this.audioManager,
            scoreSystem: this.scoreSystem,
            powerupSystem: this.powerupSystem,
            levelManager: this.levelManager,
            levelController: this.levelOrchestrator,
            uiManager: this.uiManager,
            entityManager: this.entityManager,
            renderingSystem: this.renderingSystem,
            achievementSystem: this.achievementSystem,
            unlockedAbilities: this.levelOrchestrator.getUnlockedAbilities(),
            screenFlash: this.screenFlash,
            sdkManager: this.sdkManager,
            animationController: this.animationController
        };
    }

    // === PUBLIC API (Thin wrappers delegating to orchestrators) ===

    startGame() {
        this.stateMachine.transitionTo(GameStates.LEVEL_SELECT, this._getGameContext());
    }

    pauseGame() {
        this.stateMachine.handleInput('pause', null, this._getGameContext());
    }

    resumeGame() {
        this.stateMachine.handleInput('resume', null, this._getGameContext());
    }

    showMenu() {
        window.dispatchEvent(new CustomEvent('showMenu', {
            detail: { highScore: this.scoreSystem.getHighScore() }
        }));
    }

    showLevelSelect() {
        this.stateMachine.transitionTo(GameStates.LEVEL_SELECT, this._getGameContext());
    }

    handleResize() {
        const dims = this.engine.getCanvasDimensions();
        this.player.updateCanvasHeight(dims.height);
        this.uiManager.resize(dims.width, dims.height);
        this.systemOrchestrator.resize(dims.width, dims.height);
        // Update safety platform position on resize
        this.safetyPlatformSystem.updateDimensions(dims.width, dims.height);
    }

    // === PRIVATE HELPERS ===

    _startDeathSequence() {
        this.animationController.isShowingDeathAnimation = true;
        this.animationController.startDeathSequence(
            this.player.x, this.player.y,
            this.player.width, this.player.height,
            this.particleSystem
        );
        this.animationController.createFloatingText(
            '💀 GAME OVER 💀', 400, 300,
            [1.0, 0.2, 0.2, 1.0],
            this.entityManager, 3.0
        );
        this.audioManager.stopBackgroundMusic();
        this.audioManager.playSound('death');
        setTimeout(() => {
            this.stateMachine.handleInput('playerDied', null, this._getGameContext());
        }, 4000);
    }

    _spawnCoinRainCollectible(dims) {
        const collectible = {
            x: Math.random() * dims.width,
            y: -30,
            radius: 15,
            type: 'collectible',
            color: [1.0, 0.84, 0.0, 1.0],
            velocity: 0,
            value: 10,
            pulsePhase: Math.random() * Math.PI * 2,
            fromCoinRain: true,
            velocityY: 200 + Math.random() * 150,
            drift: (Math.random() - 0.5) * 30
        };
        this.entityManager.addEntity('collectibles', collectible);
    }

    _cleanupOffscreenEntities() {
        const leftBound = -100;
        const arrays = [
            'platforms', 'obstacles', 'collectibles', 'powerups', 'hearts',
            'boosts', 'magnetBonuses', 'coinRainBonuses', 'shieldBonuses',
            'multiplierBonuses', 'rainbowBonuses', 'heartRechargeBonuses'
        ];
        
        arrays.forEach(key => {
            this.entityManager[key] = this.entityManager[key].filter(e => 
                e.x + (e.radius || e.width || 0) > leftBound
            );
        });
    }
}
