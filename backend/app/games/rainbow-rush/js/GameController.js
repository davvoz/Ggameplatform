/**
 * GameController - Main game controller orchestrating all systems
 * Refactored to coordinate specialized managers and systems
 */
import { GameEngine } from './core/GameEngine.js';
import { GameState, GameStates } from './core/GameState.js';
import { Player } from './entities/Player.js';
import { ProceduralLevelGenerator } from './systems/ProceduralLevelGenerator.js';
import { RenderingSystem } from './systems/RenderingSystem.js';
import { ScoreSystem } from './systems/ScoreSystem.js';
import { PowerupSystem } from './systems/PowerupSystem.js';
import { BackgroundSystem } from './systems/BackgroundSystem.js';
import { AchievementSystem } from './systems/AchievementSystem.js';
import { AudioManager } from './managers/AudioManager.js';
import { InputManager } from './managers/InputManager.js';
import { PlatformSDKManager } from './managers/PlatformSDKManager.js';
import { TurboButtonUI } from './systems/TurboButtonUI.js';
import { FlightButtonUI } from './systems/FlightButtonUI.js';
import { EntityManager } from './managers/EntityManager.js';
import { SpawnManager } from './managers/SpawnManager.js';
import { SafetyPlatformSystem } from './systems/SafetyPlatformSystem.js';
import { CollisionDetector } from './systems/CollisionDetector.js';
import { AnimationController } from './controllers/AnimationController.js';
import { ParticleSystem } from './effects/ParticleSystem.js';
import { LevelProgressBar } from './systems/LevelProgressBar.js';

export class GameController {
    constructor(canvas) {
        this.canvas = canvas;
        this.engine = new GameEngine(canvas);
        this.gameState = new GameState();
        
        // Track auto-pause state for visibility changes
        this.autoPaused = false;

        // Core systems
        this.scoreSystem = new ScoreSystem();
        this.powerupSystem = new PowerupSystem();
        this.achievementSystem = new AchievementSystem();
        this.audioManager = new AudioManager();
        this.inputManager = new InputManager(canvas);
        this.sdkManager = new PlatformSDKManager();

        // Game entities
        this.player = null;
        this.levelGenerator = null;
        this.backgroundSystem = null;
        this.renderingSystem = null;
        this.turboButtonUI = null;
        this.flightButtonUI = null;

        // NEW: Specialized managers and systems
        this.entityManager = new EntityManager();
        this.spawnManager = null; // Initialized after getting dimensions
        this.safetyPlatformSystem = null; // Initialized after getting dimensions
        this.collisionDetector = null; // Initialized after creating player
        this.animationController = new AnimationController();
        this.particleSystem = new ParticleSystem();
        this.levelProgressBar = null; // Initialized after getting dimensions
        
        // Performance optimization - cleanup timer
        this.cleanupTimer = 0;
        this.cleanupInterval = 1.0; // Cleanup ogni 1 secondo (ridotto da 2)

        // Time scale for slow motion effects
        this.timeScale = 1.0;
        
        // Coin rain effect
        this.coinRainActive = false;
        this.coinRainTimer = 0;
        this.coinRainDuration = 0;
        this.coinRainSpawnTimer = 0;
        this.coinRainSpawnInterval = 0.3; // Spawn coin ogni 0.3 secondi

        this.initialize();
    }

    async initialize() {
        // Initialize audio
        await this.audioManager.initialize();

        // Initialize SDK
        await this.sdkManager.initialize();

        // Get canvas dimensions
        const dims = this.engine.getCanvasDimensions();

        // Create player
        this.player = new Player(100, dims.height / 2, dims.height);
        this.player.type = 'player';

        // Create level generator
        this.levelGenerator = new ProceduralLevelGenerator(dims.width, dims.height);

        // Create background system
        this.backgroundSystem = new BackgroundSystem(dims.width, dims.height);

        // Create UI systems
        this.turboButtonUI = new TurboButtonUI(dims.width, dims.height);
        this.flightButtonUI = new FlightButtonUI(dims.width, dims.height);

        // NEW: Initialize specialized systems
        this.spawnManager = new SpawnManager(this.levelGenerator, this.entityManager, dims);
        this.safetyPlatformSystem = new SafetyPlatformSystem(dims, this.audioManager);
        this.levelProgressBar = new LevelProgressBar(dims.width, dims.height);
        this.collisionDetector = new CollisionDetector(
            this.player,
            this.audioManager,
            this.achievementSystem,
            this.scoreSystem,
            this.particleSystem,
            this.animationController
        );
        
        // Pass safetyPlatformSystem reference to collisionDetector after initialization
        this.collisionDetector.safetyPlatformSystem = this.safetyPlatformSystem;

        // Setup initial platforms
        this.setupInitialPlatforms();

        // Setup systems
        this.setupSystems();

        // Setup UI input handlers
        this.setupUIInputHandlers();

        // Setup input handlers
        this.setupInput();

        // Setup score listeners
        this.setupScoreListeners();

        // Setup powerup listeners
        this.setupPowerupListeners();

        // Setup state listeners
        this.setupStateListeners();

        // Show menu
        this.showMenu();
    }

    setupInitialPlatforms() {
        const dims = this.engine.getCanvasDimensions();

        // Starting platform - più grande e accogliente
        const startPlatform = this.levelGenerator.generatePlatform(0);
        startPlatform.x = 50;
        startPlatform.y = dims.height * 0.7;
        startPlatform.width = 250; // Più larga per partenza comoda
        this.entityManager.addEntity('platforms', startPlatform);

        // Genera piattaforme iniziali con spaziatura ottimale
        for (let i = 0; i < 6; i++) {
            const platform = this.levelGenerator.generatePlatform();
            this.entityManager.addEntity('platforms', platform);
        }
    }

    setupSystems() {
        // Setup rendering system
        const dims = this.engine.getCanvasDimensions();
        this.renderingSystem = new RenderingSystem(this.engine.gl, dims.width, dims.height);
        this.renderingSystem.update = (deltaTime, entities) => {
            this.updateGame(deltaTime);
            this.renderingSystem.setPowerupTimers(this.powerupSystem.getAllTimers());
            this.renderingSystem.setPlayer(this.player);
        };
        this.engine.registerSystem(this.renderingSystem);

        // Setup UI controls - NON ricrearli se già esistono
        if (!this.turboButtonUI) {
            this.turboButtonUI = new TurboButtonUI(dims.width, dims.height);
        }
        if (!this.flightButtonUI) {
            this.flightButtonUI = new FlightButtonUI(dims.width, dims.height);
        }

        // Pass UI to rendering system
        this.renderingSystem.setTurboButton(this.turboButtonUI);
        this.renderingSystem.setFlightButton(this.flightButtonUI);
    }

    setupPowerupListeners() {
        this.powerupSystem.addEventListener('activate', (type) => {
            this.player.activatePowerup(type);
            // Play specific sound for each powerup type
            const soundName = `powerup_${type}`;
            this.audioManager.playSound(soundName);
        });

        this.powerupSystem.addEventListener('deactivate', (type) => {
            this.player.deactivatePowerup(type);
            this.audioManager.playSound('powerup_end');
        });

        this.powerupSystem.addEventListener('ready', (type) => {
            this.audioManager.playSound('powerup_ready');
        });
    }

    setupInput() {
        this.inputManager.addEventListener('jump', () => {
            if (this.gameState.isPlaying()) {
                const jumped = this.player.jump();
                if (jumped) {
                    this.audioManager.playSound('jump');
                    this.achievementSystem.recordJump();
                }
            } else if (this.gameState.isMenu()) {
                this.startGame();
            }
        });

        this.inputManager.addEventListener('jumpRelease', (duration) => {
            if (this.gameState.isPlaying()) {
                this.player.releaseJump(duration);
            }
        });
        
        // Turbo activation with 'A' key
        this.inputManager.addEventListener('turbo', () => {
            if (!this.gameState.isPlaying()) return;
            
            const level = this.scoreSystem.getLevel();
            const activated = this.player.activateTurbo(level);
            if (activated) {
                this.audioManager.playSound('turbo');
                this.screenFlash.alpha = 0.3;
                this.screenFlash.color = [1.0, 0.8, 0.0];
            }
        });
        
        // Flight activation with 'D' key
        this.inputManager.addEventListener('flight', () => {
            if (!this.gameState.isPlaying()) return;
            
            const activated = this.player.activateFlight();
            if (activated) {
                this.audioManager.playSound('flight');
                this.screenFlash.alpha = 0.2;
                this.screenFlash.color = [0.4, 0.8, 1.0];
            }
        });
        
        // Flight up with 'W' or Arrow Up
        this.inputManager.addEventListener('flightUp', () => {
            if (!this.gameState.isPlaying()) return;
            if (this.player.isFlightActive) {
                this.player.flightMoveUp();
            } else if (this.player.instantFlightActive) {
                this.player.instantFlightMoveUp();
            }
        });
        
        // Flight down with 'S' or Arrow Down
        this.inputManager.addEventListener('flightDown', () => {
            if (!this.gameState.isPlaying()) return;
            if (this.player.isFlightActive) {
                this.player.flightMoveDown();
            } else if (this.player.instantFlightActive) {
                this.player.instantFlightMoveDown();
            }
        });

        // Turbo e Flight button click handler (mouse/touch)
        this.inputManager.addEventListener('click', (data) => {
            if (!this.gameState.isPlaying()) return;

            const dims = this.engine.getCanvasDimensions();

            // Check turbo button
            if (this.turboButtonUI) {
                const shouldActivateTurbo = this.turboButtonUI.checkClick(data.x, data.y, this.player);
                if (shouldActivateTurbo) {
                    const level = this.scoreSystem.getLevel();
                    const activated = this.player.activateTurbo(level);
                    if (activated) {
                        this.audioManager.playSound('turbo');
                        this.screenFlash.alpha = 0.3;
                        this.screenFlash.color = [1.0, 0.8, 0.0];
                    }
                    return; // Non processare altri click
                }
            }

            // Check flight button
            if (this.flightButtonUI) {
                const shouldActivateFlight = this.flightButtonUI.checkClick(data.x, data.y, this.player);
                if (shouldActivateFlight) {
                    const activated = this.player.activateFlight();
                    if (activated) {
                        this.audioManager.playSound('flight');
                        this.screenFlash.alpha = 0.2;
                        this.screenFlash.color = [0.4, 0.8, 1.0]; // Blue flash
                    }
                    return;
                }
            }

            // Se volo è attivo (flight button o instant flight), controlla click su/giù
            if (this.player.isFlightActive || this.player.instantFlightActive) {
                const middleY = dims.height / 2;
                if (data.y < middleY) {
                    // Click nella metà superiore = sali
                    if (this.player.isFlightActive) {
                        this.player.flightMoveUp();
                    } else {
                        this.player.instantFlightMoveUp();
                    }
                } else {
                    // Click nella metà inferiore = scendi
                    if (this.player.isFlightActive) {
                        this.player.flightMoveDown();
                    } else {
                        this.player.instantFlightMoveDown();
                    }
                }
            }
        });
    }

    setupUIInputHandlers() {
        // Handler già gestiti in setupInput per turbo button
        // Il flight button funziona come il turbo: click per attivare
        // Poi click in alto/basso dello schermo per salire/scendere mentre volo è attivo
    }

    setupScoreListeners() {
        this.scoreSystem.onLevelUp((level, bonus) => {
            this.levelGenerator.setDifficulty(level);
            this.backgroundSystem.setLevel(level);
            this.audioManager.playSound('score');

            // Show "LEVEL UP!" message
            const dims = this.engine.getCanvasDimensions();
            this.animationController.showLevelUp(level, dims.width / 2, dims.height / 3);
            
            // Show epic time bonus with floating text
            if (bonus && bonus.points > 0) {
                this.showLevelTimeBonus(bonus, dims);
            }
            
            // Update HUD
            this.emitGameUpdate();
        });
        
        this.scoreSystem.onScoreChange(() => {
            // Update HUD when score changes
            this.emitGameUpdate();
        });
    }
    
    showLevelTimeBonus(bonus, dims) {
        console.log('🎯 SHOWING LEVEL BONUS:', bonus);
        
        // Play special sound for level completion
        this.audioManager.playSound('level_complete');
        
        // Play additional sound based on rank
        if (bonus.rank === 'perfect') {
            setTimeout(() => this.audioManager.playSound('streak'), 150);
        } else if (bonus.rank === 'gold') {
            setTimeout(() => this.audioManager.playSound('powerup_ready'), 150);
        }
        
        // Reset progress bar per il nuovo livello
        if (this.levelProgressBar) {
            this.levelProgressBar.reset();
        }
        
        // Create floating text al CENTRO dello schermo
        const centerX = dims.width / 2;
        const centerY = dims.height / 2;
        
        // Colori distintivi per ogni rank
        let textColor;
        switch(bonus.rank) {
            case 'perfect':
                textColor = [1.0, 0.9, 0.1, 1.0]; // Oro brillante
                break;
            case 'gold':
                textColor = [1.0, 0.7, 0.0, 1.0]; // Arancione dorato
                break;
            case 'silver':
                textColor = [0.8, 0.9, 1.0, 1.0]; // Argento/azzurro
                break;
            case 'bronze':
                textColor = [0.8, 0.5, 0.2, 1.0]; // Bronzo
                break;
            default:
                textColor = [0.7, 0.7, 0.7, 1.0]; // Grigio per slow
        }
        
        // Testo semplice senza moltiplicatore visibile
        // Main bonus text senza mostrare il moltiplicatore
        const bonusText = bonus.points > 0 
            ? `${bonus.rankIcon} LV${this.scoreSystem.level - 1}\n+${bonus.points}`
            : `${bonus.rankIcon} LV${this.scoreSystem.level - 1}`;
        console.log('Creating bonus text:', bonusText, 'at CENTER', centerX, centerY);
        
        this.animationController.createFloatingText(
            bonusText,
            centerX,
            centerY,
            textColor, // Usa il colore distintivo
            this.entityManager,
            6 // Durata maggiore per il bonus livello (4.5 secondi invece di 2.5)
        );
        
        console.log('FloatingTexts count:', this.entityManager.floatingTexts.length);
    }
    
    emitGameUpdate() {
        const stats = this.scoreSystem.getGameStats();
        const event = new CustomEvent('gameUpdate', { detail: stats });
        window.dispatchEvent(event);
    }

    setupStateListeners() {
        this.gameState.addEventListener(GameStates.GAME_OVER, () => {
            this.onGameOver();
        });
    }

    updateGame(deltaTime) {
        // Update animations (including death animation)
        this.animationController.update(deltaTime);
        
        // Update floating texts con animazioni EPICHE
        this.animationController.updateFloatingTexts(this.entityManager.floatingTexts, deltaTime);

        // Update rendering for death animation
        const animations = this.animationController.getAnimations();
        this.renderingSystem.setDeathAnimation(animations.deathAnimation);

        if (!this.gameState.isPlaying()) return;

        // Update score system (includes combo timer)
        this.scoreSystem.update(deltaTime);

        // Update achievement system
        this.achievementSystem.updateNotifications(deltaTime);
        this.achievementSystem.recordCombo(this.scoreSystem.combo);

        // Calculate camera speed for parallax - includes turbo boost
        const cameraSpeed = this.player.boostActive ? this.player.velocityX :
            this.player.isTurboActive ? this.player.velocityX : 0;

        // Update background with parallax effect
        this.backgroundSystem.update(deltaTime, cameraSpeed * 0.3);
        const bgColor = this.backgroundSystem.getBackgroundColor();
        this.engine.gl.clearColor(bgColor[0], bgColor[1], bgColor[2], bgColor[3]);

        // Update powerup system
        this.powerupSystem.update(deltaTime);

        // Update player
        this.player.update(deltaTime);

        // Lock player at 35% of screen width
        const dims = this.engine.getCanvasDimensions();
        this.player.x = (dims.width * 0.35) - this.player.width / 2;
        
        // Check if player is offscreen (top) and award altitude points
        this.checkOffscreenAltitudeBonus(deltaTime);

        // Update UI buttons
        if (this.turboButtonUI) {
            this.turboButtonUI.update(deltaTime, this.player);
        }
        if (this.flightButtonUI) {
            this.flightButtonUI.update(deltaTime, this.player);
        }
        
        // Update level progress bar
        if (this.levelProgressBar) {
            this.levelProgressBar.update(
                deltaTime,
                this.spawnManager.platformCounter,
                this.spawnManager.platformsPerLevel,
                this.scoreSystem.level
            );
        }

        // Check for ice brake effect
        if (this.player.hasJustStoppedSliding()) {
            this.player.addCameraShake(12, 0.4);
            this.audioManager.playSound('brake');
            this.player.slideDecelerationTime = 0;
        }

        // Update all entities via EntityManager
        this.entityManager.updateAll(deltaTime, cameraSpeed, this.player);

        // Check collisions via CollisionDetector
        const playerOnSafetyPlatform = this.collisionDetector.checkAll(
            this.entityManager,
            this.safetyPlatformSystem,
            this.powerupSystem
        );

        // Pass safety platform state to player for expression
        this.player.onSafetyPlatform = playerOnSafetyPlatform;

        // Update safety platform system with collision state
        this.safetyPlatformSystem.update(deltaTime, playerOnSafetyPlatform, this.entityManager, this.scoreSystem);

        // Handle special bonus effects (coin rain, rainbow)
        const bonusEffect = this.collisionDetector.checkBonusCollisions(this.entityManager);
        if (bonusEffect) {
            if (bonusEffect.type === 'coinRain' && bonusEffect.activated) {
                this.coinRainActive = true;
                this.coinRainTimer = 0;
                this.coinRainDuration = bonusEffect.duration;
                this.coinRainSpawnTimer = 0;
            } else if (bonusEffect.type === 'rainbow' && bonusEffect.activated) {
                this.timeScale = 0.6;
                setTimeout(() => { this.timeScale = 1.0; }, 8000);
            }
        }
        
        // Update coin rain effect
        if (this.coinRainActive) {
            this.coinRainTimer += deltaTime;
            this.coinRainSpawnTimer += deltaTime;
            
            // Spawn coins from the sky
            if (this.coinRainSpawnTimer >= this.coinRainSpawnInterval) {
                this.spawnCoinRainCollectible();
                this.coinRainSpawnTimer = 0;
            }
            
            // Check if duration expired
            if (this.coinRainTimer >= this.coinRainDuration) {
                this.coinRainActive = false;
                this.coinRainTimer = 0;
            }
        }

        // Play landing sound
        if (this.player.hasJustLanded()) {
            this.audioManager.playSound('land');
        }

        // Spawn new entities via SpawnManager
        this.spawnManager.update(deltaTime, this.scoreSystem);

        // Periodic cleanup of offscreen entities (every 1 second)
        this.cleanupTimer += deltaTime;
        if (this.cleanupTimer >= this.cleanupInterval) {
            this.cleanupOffscreenEntities();
            this.cleanupTimer = 0;
        }

        // Update score based on distance
        const platforms = this.entityManager.getEntities('platforms');
        const currentSpeed = Math.abs(platforms[0]?.velocity || 0);
        this.scoreSystem.updateSpeedMultiplier(currentSpeed);
        this.scoreSystem.addDistance(currentSpeed * deltaTime);

        // Update entities for rendering
        this.updateRenderEntities();

        // Check if player is dead
        if (!this.player.alive && !this.animationController.isShowingDeathAnimation) {
            this.startDeathSequence();
        }
    }
    
    /**
     * Spawn a collectible coin from coin rain bonus
     */
    spawnCoinRainCollectible() {
        const dims = this.engine.getCanvasDimensions();
        
        // Random X position across the screen
        const x = Math.random() * dims.width;
        // Spawn from top of screen
        const y = -30;
        
        const collectible = {
            x: x,
            y: y,
            radius: 15,
            type: 'collectible',
            color: [1.0, 0.84, 0.0, 1.0], // Gold
            velocity: 0, // No horizontal velocity
            value: 10,
            pulsePhase: Math.random() * Math.PI * 2,
            fromCoinRain: true, // Mark as coin rain collectible
            velocityY: 200 + Math.random() * 150, // Falls down at variable speed (200-350 px/s)
            drift: (Math.random() - 0.5) * 30 // Random horizontal drift
        };
        
        this.entityManager.addEntity('collectibles', collectible);
    }

    updateRenderEntities() {
        // Update background in rendering system
        this.renderingSystem.setBackground(
            this.backgroundSystem.getLayers(),
            this.backgroundSystem.getParticles()
        );

        // Pass level up animation to rendering system
        this.renderingSystem.setLevelUpAnimation(this.levelUpAnimation);
        this.renderingSystem.setComboAnimation(this.comboAnimation);
        this.renderingSystem.setFloatingTexts(this.entityManager.floatingTexts); // FIX: usa entityManager.floatingTexts!
        this.renderingSystem.setAchievementNotifications(this.achievementSystem.getNotifications());
        this.renderingSystem.setScreenFlash(this.screenFlash);
        this.renderingSystem.setCombo(this.scoreSystem.getCombo());
        this.renderingSystem.setLevelTransition(this.levelTransition);

        // Pass turbo button UI to rendering system
        this.renderingSystem.setTurboButton(this.turboButtonUI);
        
        // Pass level progress bar to rendering system
        this.renderingSystem.setLevelProgressBar(this.levelProgressBar);

        // Get entities from EntityManager
        const entities = [
            ...this.entityManager.platforms,
            ...this.entityManager.obstacles,
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

        // Add safety platform from SafetyPlatformSystem
        const safetyPlatform = this.safetyPlatformSystem.getPlatform();
        if (safetyPlatform) {
            const safetyClone = { ...safetyPlatform };
            safetyClone.dissolveProgress = this.safetyPlatformSystem.getDissolveProgress();
            safetyClone.isDissolving = this.safetyPlatformSystem.state === 'DISSOLVING';
            safetyClone.playerOnPlatform = this.safetyPlatformSystem.playerOnPlatform;
            safetyClone.timeOnPlatform = this.safetyPlatformSystem.playerOnPlatformTimer;
            safetyClone.lastChargeConsumed = this.safetyPlatformSystem.lastChargeConsumed;
            safetyClone.chargeConsumedTime = this.safetyPlatformSystem.chargeConsumedTime;
            safetyClone.maxTimeOnPlatform = this.safetyPlatformSystem.dissolveDuration;
            safetyClone.charges = this.safetyPlatformSystem.getCharges();
            safetyClone.maxCharges = this.safetyPlatformSystem.maxCharges;
            safetyClone.useTimes = this.safetyPlatformSystem.useTimes;
            safetyClone.useWindow = this.safetyPlatformSystem.useWindow;
            safetyClone.currentTime = Date.now() / 1000;
            safetyClone.canCollide = this.safetyPlatformSystem.isActive();
            safetyClone.crackProgress = this.safetyPlatformSystem.getCrackProgress();
            safetyClone.cracks = this.safetyPlatformSystem.getCracks();
            safetyClone.isRecharging = this.safetyPlatformSystem.isRechargingNow();
            safetyClone.rechargeAnimProgress = this.safetyPlatformSystem.getRechargeAnimProgress();
            safetyClone.rechargeAnimDuration = this.safetyPlatformSystem.getRechargeAnimDuration();
            safetyClone.chargesBeforeRecharge = this.safetyPlatformSystem.getChargesBeforeRecharge();
            entities.push(safetyClone);
        }

        entities.push(this.player);

        this.engine.entities = entities;
    }

    /**
     * Cleanup entities that are far offscreen to prevent memory leaks
     */
    cleanupOffscreenEntities() {
        const leftBound = -100; // Più aggressivo: 100px invece di 200px
        
        // Filter out offscreen platforms
        this.entityManager.platforms = this.entityManager.platforms.filter(p => 
            p.x + p.width > leftBound
        );
        
        // Filter out offscreen obstacles
        this.entityManager.obstacles = this.entityManager.obstacles.filter(o => 
            o.x + o.width > leftBound
        );
        
        // Filter out offscreen collectibles
        this.entityManager.collectibles = this.entityManager.collectibles.filter(c => 
            c.x + (c.radius || c.width) > leftBound
        );
        
        // Filter out offscreen powerups
        this.entityManager.powerups = this.entityManager.powerups.filter(p => 
            p.x + (p.radius || p.width) > leftBound
        );
        
        // Filter out offscreen hearts
        this.entityManager.hearts = this.entityManager.hearts.filter(h => 
            h.x + h.radius > leftBound
        );
        
        // Filter out offscreen boosts
        this.entityManager.boosts = this.entityManager.boosts.filter(b => 
            b.x + b.radius > leftBound
        );
        
        // Filter out offscreen bonuses
        this.entityManager.magnetBonuses = this.entityManager.magnetBonuses.filter(b => 
            b.x + b.radius > leftBound
        );
        this.entityManager.coinRainBonuses = this.entityManager.coinRainBonuses.filter(b => 
            b.x + b.radius > leftBound
        );
        this.entityManager.shieldBonuses = this.entityManager.shieldBonuses.filter(b => 
            b.x + b.radius > leftBound
        );
        this.entityManager.multiplierBonuses = this.entityManager.multiplierBonuses.filter(b => 
            b.x + b.radius > leftBound
        );
        this.entityManager.rainbowBonuses = this.entityManager.rainbowBonuses.filter(b => 
            b.x + b.radius > leftBound
        );
        this.entityManager.heartRechargeBonuses = this.entityManager.heartRechargeBonuses.filter(b => 
            b.x + b.radius > leftBound
        );
    }
    
    checkOffscreenAltitudeBonus(deltaTime) {
        const wasOffscreen = this.player.isOffscreenTop;
        const isNowOffscreen = this.player.y + this.player.height < 0;
        
        this.player.isOffscreenTop = isNowOffscreen;
        
        if (isNowOffscreen) {
            // Player is above screen - award altitude points
            this.player.offscreenAltitudeTimer += deltaTime;
            
            // Award points periodically
            if (this.player.offscreenAltitudeTimer - this.player.lastOffscreenScore >= this.player.offscreenScoreInterval) {
                this.player.lastOffscreenScore = this.player.offscreenAltitudeTimer;
                
                // Base altitude points (addAltitudeScore applicherà automaticamente il moltiplicatore di velocità)
                const basePoints = 50;
                const finalPoints = this.scoreSystem.addAltitudeScore(basePoints, 0); // Il secondo parametro viene ignorato
                
                // Get current speed multiplier for display
                const speedMult = this.scoreSystem.getSpeedMultiplier();
                
                // Visual feedback - floating text with multiplier
                const altitude = Math.abs(this.player.y);
                let text = `⬆ ${finalPoints} pts`;
                let color = [0.2, 0.9, 1.0, 1.0]; // Cyan base
                
                if (speedMult >= 1.5) {
                    text = `⬆ ${finalPoints} (×${speedMult.toFixed(1)})`;
                    // Color based on multiplier
                    if (speedMult >= 3.0) {
                        color = [1.0, 0.0, 0.4, 1.0]; // Rosa intenso
                    } else if (speedMult >= 2.0) {
                        color = [1.0, 0.4, 0.0, 1.0]; // Arancione
                    } else {
                        color = [1.0, 0.8, 0.0, 1.0]; // Giallo
                    }
                }
                
                this.animationController.createFloatingText(
                    text,
                    this.player.x + this.player.width / 2,
                    120, // Più in basso per leggibilità
                    color,
                    this.entityManager
                );
                
                // Sound feedback - higher pitch as you go higher
                const pitchVariation = 1.0 + Math.min(altitude / 500, 1.0);
                this.playAltitudeSound(pitchVariation);
                
                // Screen flash effect
                this.screenFlash.alpha = 0.1;
                this.screenFlash.color = [0.2, 0.9, 1.0];
            }
            
            // First time going offscreen - special notification
            if (!wasOffscreen) {
                const dims = this.engine.getCanvasDimensions();
                this.audioManager.playSound('streak');
                this.animationController.createFloatingText(
                    '🚀 SKY HIGH!',
                    dims.width / 2,
                    140, // Più in basso per leggibilità
                    [1.0, 1.0, 0.3, 1.0],
                    this.entityManager
                );
            }
        } else {
            // Reset timer when back on screen
            if (wasOffscreen) {
                this.player.offscreenAltitudeTimer = 0;
                this.player.lastOffscreenScore = 0;
            }
        }
    }
    
    playAltitudeSound(pitchMultiplier = 1.0) {
        if (!this.audioManager.enabled || !this.audioManager.audioContext) return;
        
        const ctx = this.audioManager.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        // Playful ascending tone
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600 * pitchMultiplier, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(900 * pitchMultiplier, ctx.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);
    }

    showMenu() {
        const event = new CustomEvent('showMenu', {
            detail: { highScore: this.scoreSystem.getHighScore() }
        });
        window.dispatchEvent(event);
    }

    startGame() {
        this.resetGame();
    }

    resetGame() {
        // Clear all entities from EntityManager
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
        this.entityManager.powerupParticles = [];
        this.entityManager.boostParticles = [];
        this.entityManager.floatingTexts = [];

        // Reset time scale
        this.timeScale = 1.0;
        
        // Reset coin rain effect
        this.coinRainActive = false;
        this.coinRainTimer = 0;
        this.coinRainDuration = 0;
        this.coinRainSpawnTimer = 0;

        // Reset screen flash
        this.screenFlash = {
            alpha: 0,
            color: [1.0, 1.0, 1.0]
        };

        // Reset animazioni
        this.comboAnimation = null;
        this.floatingTexts = [];
        this.levelTransition = null;
        this.isInLevelTransition = false;

        this.cameraOffsetX = 0;
        this.targetCameraOffsetX = 0;
        this.scoreSystem.reset();
        this.powerupSystem.reset();
        this.spawnTimer = 0;
        this.powerupSpawnTimer = 0;
        this.platformCounter = 0;
        this.levelUpAnimation = null;
        this.deathAnimation = null;
        this.isShowingDeathAnimation = false;
        this.cleanupTimer = 0; // Reset cleanup timer

        // Reset player
        const dims = this.engine.getCanvasDimensions();
        this.player.reset(100, dims.height / 2);

        // Reset level generator
        this.levelGenerator.lastPlatformX = 0;
        this.levelGenerator.lastPlatformY = 0;
        this.levelGenerator.setDifficulty(1);
        this.levelGenerator.resetPlatformCount();

        // Reset background
        this.backgroundSystem.setLevel(1);
        const bgColor = this.backgroundSystem.getBackgroundColor();
        this.engine.gl.clearColor(bgColor[0], bgColor[1], bgColor[2], bgColor[3]);

        // Setup initial platforms
        this.setupInitialPlatforms();

        // Update dimensions and reset all systems
        this.safetyPlatformSystem.updateDimensions(dims.width, dims.height);
        this.safetyPlatformSystem.reset();
        this.spawnManager.reset();
        this.animationController.reset();
        if (this.levelProgressBar) {
            this.levelProgressBar.reset();
        }

        // Start game
        this.gameState.setState(GameStates.PLAYING);
        this.engine.start();
        this.audioManager.resume();

        const event = new CustomEvent('gameStart');
        window.dispatchEvent(event);
    }

    startDeathSequence() {
        if (this.isShowingDeathAnimation) return;
        this.isShowingDeathAnimation = true;

        // Delegate to AnimationController
        this.deathAnimation = this.animationController.startDeathSequence(
            this.player.x,
            this.player.y,
            this.player.width,
            this.player.height,
            this.particleSystem
        );
        
        // Floating text GAME OVER gigante al centro
        this.animationController.createFloatingText(
            '💀 GAME OVER 💀', 
            400, 
            300, 
            [1.0, 0.2, 0.2, 1.0], 
            this.entityManager,
            3.0 // Durata più lunga
        );

        // Stop background music and play death sound
        this.audioManager.stopBackgroundMusic();
        this.audioManager.playSound('death');

        // Game over after animation
        setTimeout(() => this.gameOver(), 4000);
    }

    async gameOver() {
        this.gameState.setState(GameStates.GAME_OVER);

        // Submit score to platform
        const stats = this.scoreSystem.getGameStats();
        await this.sdkManager.submitScore(stats.score);

        const event = new CustomEvent('gameOver', { detail: stats });
        window.dispatchEvent(event);
    }

    async onGameOver() {
        // Game over handling - leaderboard removed
    }

    pauseGame() {
        if (this.gameState.isPlaying()) {
            this.gameState.setState(GameStates.PAUSED);
            this.engine.stop();
            // Pausa anche l'audio
            if (this.audioManager) {
                this.audioManager.pause();
            }
        }
    }

    resumeGame() {
        if (this.gameState.isPaused()) {
            this.gameState.setState(GameStates.PLAYING);
            this.engine.start();
            // Riprendi l'audio
            if (this.audioManager) {
                this.audioManager.resume();
            }
        }
    }

    handleResize() {
        const dims = this.engine.getCanvasDimensions();
        this.player.updateCanvasHeight(dims.height);
        this.levelGenerator.updateDimensions(dims.width, dims.height);
        this.backgroundSystem.updateDimensions(dims.width, dims.height);
        if (this.renderingSystem) {
            this.renderingSystem.updateDimensions(dims.width, dims.height);
        }
        if (this.turboButtonUI) {
            this.turboButtonUI.resize(dims.width, dims.height);
        }
        if (this.flightButtonUI) {
            this.flightButtonUI.resize(dims.width, dims.height);
        }
    }

    disposePlatform(platform) {
        // Pulisce riferimenti per garbage collection efficiente
        if (platform.vertices) platform.vertices = null;
        if (platform.colors) platform.colors = null;
        if (platform.indices) platform.indices = null;
        platform.platformType = null;
    }

    disposeObstacle(obstacle) {
        if (obstacle.vertices) obstacle.vertices = null;
        if (obstacle.colors) obstacle.colors = null;
        if (obstacle.indices) obstacle.indices = null;
    }

    disposeCollectible(collectible) {
        collectible.color = null;
        collectible.magnetized = null;
    }

    disposePowerup(powerup) {
        if (powerup.particles) powerup.particles = null;
        powerup.powerupType = null;
        powerup.entityType = null;
    }

    disposeBonus(bonus) {
        bonus.color = null;
        bonus.entityType = null;
    }

    disposeParticle(particle) {
        if (particle.color) particle.color = null;
    }
}