/**
 * GameController - Main game controller orchestrating all systems
 * Implements Facade Pattern and coordinates all game components
 */
import { GameEngine } from './core/GameEngine.js';
import { GameState, GameStates } from './core/GameState.js';
import { Player } from './entities/Player.js';
import { ProceduralLevelGenerator, PlatformTypes, BonusTypes } from './systems/ProceduralLevelGenerator.js';
import { RenderingSystem } from './systems/RenderingSystem.js';
import { ScoreSystem } from './systems/ScoreSystem.js';
import { PowerupSystem, PowerupTypes, Powerup } from './systems/PowerupSystem.js';
import { BackgroundSystem } from './systems/BackgroundSystem.js';
import { AchievementSystem } from './systems/AchievementSystem.js';
import { AudioManager } from './managers/AudioManager.js';
import { InputManager } from './managers/InputManager.js';
import { PlatformSDKManager } from './managers/PlatformSDKManager.js';
import { TurboButtonUI } from './systems/TurboButtonUI.js';
import { FlightButtonUI } from './systems/FlightButtonUI.js';

export class GameController {
    constructor(canvas) {
        this.canvas = canvas;
        this.engine = new GameEngine(canvas);
        this.gameState = new GameState();
        this.scoreSystem = new ScoreSystem();
        this.powerupSystem = new PowerupSystem();
        this.achievementSystem = new AchievementSystem();
        this.audioManager = new AudioManager();
        this.inputManager = new InputManager(canvas);
        this.sdkManager = new PlatformSDKManager();

        this.platforms = [];
        this.obstacles = [];
        this.collectibles = [];
        this.powerups = [];
        this.hearts = []; // Cuoricini per recuperare vita
        this.boosts = []; // Bonus boost per velocità
        this.powerupParticles = []; // Particelle per animazioni powerup
        this.boostParticles = []; // Particelle per animazioni boost
        this.player = null;
        this.levelGenerator = null;
        this.backgroundSystem = null;
        this.renderingSystem = null;
        this.turboButtonUI = null; // Turbo boost button
        this.flightSliderUI = null; // Flight slider control

        // Safety platform
        this.safetyPlatform = null;
        this.safetyPlatformTimer = 0;
        this.safetyPlatformDissolveDuration = 2.5; // 2.5 seconds on platform before dissolve
        this.safetyPlatformRespawnTime = 5.0; // 5 seconds to respawn
        this.safetyPlatformActive = true;
        this.safetyPlatformDissolving = false;
        this.safetyPlatformDissolveProgress = 0;
        this.playerOnSafetyPlatform = false;
        this.playerOnSafetyPlatformTimer = 0;
        this.rescuePlatformSpawnTimer = 0;
        this.rescuePlatformSpawnInterval = 2.0; // Spawn every 2 seconds
        this.hasSpawnedFirstRescue = false;

        this.spawnTimer = 0;
        this.spawnInterval = 1.5;
        this.powerupSpawnTimer = 0;
        this.powerupSpawnInterval = 8; // Spawn powerup every 8 seconds
        this.platformCounter = 0;
        this.platformsPerLevel = 15; // Level up every 15 platforms
        
        // Level transition animation
        this.levelTransition = null;
        this.isInLevelTransition = false;
        
        // Level up animation
        this.levelUpAnimation = null;
        
        // Combo animation
        this.comboAnimation = null;
        this.floatingTexts = []; // Testi galleggianti per punti
        
        // Death animation
        this.deathAnimation = null;
        this.isShowingDeathAnimation = false;
        
        // New bonus types
        this.magnetBonuses = []; // Magnete che attira collectibles
        this.timeBonuses = []; // Rallenta il tempo
        this.shieldBonuses = []; // Scudo temporaneo
        this.multiplierBonuses = []; // Moltiplicatore punti 3x
        this.rainbowBonuses = []; // Bonus arcobaleno (tutti i poteri!)
        
        // Bonus spawn timers
        this.magnetSpawnTimer = 0;
        this.magnetSpawnInterval = 15; // Ogni 15 secondi
        this.timeSlowTimer = 0;
        this.timeSlowInterval = 20; // Ogni 20 secondi
        this.shieldTimer = 0;
        this.shieldInterval = 18; // Ogni 18 secondi
        this.multiplierTimer = 0;
        this.multiplierInterval = 25; // Ogni 25 secondi
        this.rainbowTimer = 0;
        this.rainbowInterval = 40; // Ogni 40 secondi (raro!)
        
        // Time scale for slow motion effects
        this.timeScale = 1.0;
        
        // Screen flash for big combos
        this.screenFlash = {
            alpha: 0,
            color: [1.0, 1.0, 1.0]
        };
        
        // Camera system per boost
        this.cameraOffsetX = 0; // Offset camera per seguire il player
        this.targetCameraOffsetX = 0; // Target offset per smooth camera
        this.cameraLerpSpeed = 8; // Velocità interpolazione camera

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

        // Setup initial platforms
        this.setupInitialPlatforms();

        // Setup safety platform
        this.setupSafetyPlatform();

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

        // Starting platform
        const startPlatform = this.levelGenerator.generatePlatform(0);
        startPlatform.x = 50;
        startPlatform.y = dims.height * 0.7;
        startPlatform.width = 200;
        this.platforms.push(startPlatform);

        // Generate a few more platforms
        for (let i = 0; i < 5; i++) {
            this.platforms.push(this.levelGenerator.generatePlatform());
        }
    }

    setupSafetyPlatform() {
        const dims = this.engine.getCanvasDimensions();

        this.safetyPlatform = {
            x: dims.width / 2 - 200,
            y: dims.height - 60,
            width: 400,
            height: 20,
            color: [0.2, 0.8, 0.4, 1.0], // Green safety color
            type: 'safetyPlatform',
            velocity: 0,
            platformType: 'safety'
        };
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
        
        // Turbo e Flight button click handler
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
            
            // Se volo è attivo, controlla click su/giù
            if (this.player.isFlightActive) {
                const middleY = dims.height / 2;
                if (data.y < middleY) {
                    // Click nella metà superiore = sali
                    this.player.flightMoveUp();
                } else {
                    // Click nella metà inferiore = scendi
                    this.player.flightMoveDown();
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
        this.scoreSystem.onLevelUp((level) => {
            this.levelGenerator.setDifficulty(level);
            this.backgroundSystem.setLevel(level);
            this.audioManager.playSound('score');
            
            // Show "LEVEL UP!" message
            const dims = this.engine.getCanvasDimensions();
            this.showLevelUpAnimation(level, dims.width / 2, dims.height / 3);
        });
    }
    
    showLevelUpAnimation(level, x, y) {
        // Create a temporary level up indicator
        this.levelUpAnimation = {
            text: `✨ LEVEL ${level} ✨`,
            x: x,
            y: y,
            life: 2.5, // Match transition duration
            maxLife: 2.5,
            fontSize: 80,
            pulsePhase: 0,
            color: [1.0, 0.9, 0.2, 1.0], // Golden color
            scale: 0
        };
        
        // Avvia transizione epica tra livelli
        this.startLevelTransition(level);
    }
    
    showComboAnimation() {
        const combo = this.scoreSystem.getCombo();
        if (combo <= 1) return;
        
        const dims = this.engine.getCanvasDimensions();
        
        // Messaggi più epici e multiplier visibile
        const multiplier = this.scoreSystem.getComboMultiplier().toFixed(1);
        let message = '';
        let color = [1.0, 1.0, 1.0, 1.0];
        let intensity = 1.0;
        let flashIntensity = 0;
        
        if (combo >= 50) {
            message = `🌟 DIVINO! x${multiplier} 🌟`;
            color = [1.0, 0.0, 1.0, 1.0];
            intensity = 3.0;
            flashIntensity = 0.4; // Big flash!
        } else if (combo >= 30) {
            message = `🔥 EPICO! x${multiplier} 🔥`;
            color = [1.0, 0.3, 0.0, 1.0];
            intensity = 2.5;
            flashIntensity = 0.3;
        } else if (combo >= 20) {
            message = `💥 BRUTALE! x${multiplier} 💥`;
            color = [1.0, 0.2, 0.2, 1.0];
            intensity = 2.0;
            flashIntensity = 0.25;
        } else if (combo >= 15) {
            message = `⚡ PAZZESCO! x${multiplier} ⚡`;
            color = [1.0, 1.0, 0.0, 1.0];
            intensity = 1.8;
            flashIntensity = 0.2;
        } else if (combo >= 10) {
            message = `🌈 SUPER! x${multiplier} 🌈`;
            color = [0.0, 1.0, 1.0, 1.0];
            intensity = 1.5;
            flashIntensity = 0.15;
        } else if (combo >= 5) {
            message = `🚀 COMBO x${multiplier}!`;
            color = [0.5, 1.0, 0.5, 1.0];
            intensity = 1.2;
            flashIntensity = 0.1;
        } else {
            message = `COMBO x${multiplier}`;
            color = [1.0, 1.0, 1.0, 1.0];
            intensity = 1.0;
        }
        
        // Trigger screen flash for big combos
        if (flashIntensity > 0) {
            this.screenFlash.alpha = flashIntensity;
            this.screenFlash.color = [color[0], color[1], color[2]];
        }
        
        this.comboAnimation = {
            text: message,
            x: dims.width - 280,
            y: 80,
            floatY: 80,
            life: 2.0,
            maxLife: 2.0,
            fontSize: 32 + Math.min(combo * 0.8, 30),
            pulsePhase: 0,
            color: color,
            scale: 1.0,
            combo: combo,
            intensity: intensity
        };
    }
    
    createFloatingText(text, x, y, color) {
        this.floatingTexts.push({
            text: text,
            x: x,
            y: y,
            life: 1.0,
            maxLife: 1.0,
            alpha: 1.0,
            color: color,
            fontSize: 20
        });
    }

    setupStateListeners() {
        this.gameState.addEventListener(GameStates.GAME_OVER, () => {
            this.onGameOver();
        });
    }

    updateGame(deltaTime) {
        // Update death animation anche se non playing
        if (this.deathAnimation) {
            this.deathAnimation.timer += deltaTime;
            this.deathAnimation.fadeAlpha = Math.min(1.0, this.deathAnimation.timer / 0.8);
            this.deathAnimation.playerAlpha = Math.max(0, 1.0 - (this.deathAnimation.timer / 1.5));
            this.deathAnimation.rotation += deltaTime * 3;
            this.deathAnimation.scale = 1.0 + (this.deathAnimation.timer * 0.5);
            
            // Update death particles
            this.deathAnimation.particles.forEach(p => {
                p.x += p.vx * deltaTime;
                p.y += p.vy * deltaTime;
                p.vy += 300 * deltaTime; // Gravity
                p.life -= deltaTime;
                p.alpha = Math.max(0, p.life / p.maxLife);
            });
            
            this.deathAnimation.particles = this.deathAnimation.particles.filter(p => p.life > 0);
            
            // Update rendering for death animation
            this.renderingSystem.setDeathAnimation(this.deathAnimation);
            
            if (this.deathAnimation.timer >= this.deathAnimation.duration) {
                this.deathAnimation = null;
                // NON resettare isShowingDeathAnimation qui per evitare doppie chiamate
                // Verrà resettato solo quando si riavvia il gioco
                this.renderingSystem.setDeathAnimation(null);
            }
        }
        
        if (!this.gameState.isPlaying()) return;
        
        // Update score system (include combo timer)
        this.scoreSystem.update(deltaTime);
        
        // Update achievement system
        this.achievementSystem.updateNotifications(deltaTime);
        this.achievementSystem.recordCombo(this.scoreSystem.combo);
        
        // Update camera offset basato sul boost del player
        this.updateCameraOffset(deltaTime);
        
        // Calcola velocità camera per effetto parallasse - include turbo boost
        const cameraSpeed = this.player.boostActive ? this.player.velocityX : 
                           this.player.isTurboActive ? this.player.velocityX : 0;

        // Update background (includes transition handling)
        // Passa camera speed per effetto parallasse
        this.backgroundSystem.update(deltaTime, cameraSpeed * 0.3); // Background scorre al 30% della velocità camera
        
        // Update background color during transition
        const bgColor = this.backgroundSystem.getBackgroundColor();
        this.engine.gl.clearColor(bgColor[0], bgColor[1], bgColor[2], bgColor[3]);
        
        // Update level up animation
        if (this.levelUpAnimation) {
            this.levelUpAnimation.life -= deltaTime;
            this.levelUpAnimation.pulsePhase += deltaTime * 5;
            
            // Scale animation: grow quickly, then shrink slowly
            const progress = 1 - (this.levelUpAnimation.life / this.levelUpAnimation.maxLife);
            if (progress < 0.2) {
                // Grow phase (0 to 1.2)
                this.levelUpAnimation.scale = (progress / 0.2) * 1.2;
            } else if (progress < 0.8) {
                // Stable phase (1.2 to 1.0)
                this.levelUpAnimation.scale = 1.2 - ((progress - 0.2) / 0.6) * 0.2;
            } else {
                // Shrink phase (1.0 to 0)
                this.levelUpAnimation.scale = 1.0 - ((progress - 0.8) / 0.2);
            }
            
            if (this.levelUpAnimation.life <= 0) {
                this.levelUpAnimation = null;
            }
        }
        
        // Update combo animation
        if (this.comboAnimation) {
            this.comboAnimation.life -= deltaTime;
            this.comboAnimation.pulsePhase += deltaTime * 8;
            this.comboAnimation.floatY -= deltaTime * 30; // Galleggia verso l'alto
            this.comboAnimation.scale = 1.0 + Math.sin(this.comboAnimation.pulsePhase) * 0.15;
            
            if (this.comboAnimation.life <= 0) {
                this.comboAnimation = null;
            }
        }
        
        // Fade out screen flash
        if (this.screenFlash.alpha > 0) {
            this.screenFlash.alpha -= deltaTime * 2.5; // Fast fade (0.4s for full flash)
            if (this.screenFlash.alpha < 0) {
                this.screenFlash.alpha = 0;
            }
        }
        
        // Update floating texts
        this.floatingTexts = this.floatingTexts.filter(text => {
            text.life -= deltaTime;
            text.y -= deltaTime * 50; // Galleggia verso l'alto
            text.alpha = text.life / text.maxLife;
            return text.life > 0;
        });

        // Update powerup system
        this.powerupSystem.update(deltaTime);

        // Update safety platform
        this.updateSafetyPlatform(deltaTime);

        // Update player
        this.player.update(deltaTime);
        
        // Update turbo button UI
        if (this.turboButtonUI) {
            this.turboButtonUI.update(deltaTime, this.player);
        }
        
        // Update flight slider UI
        if (this.flightSliderUI) {
            this.flightSliderUI.update(deltaTime, this.player);
        }
        
        // Check if player just stopped sliding on ice - trigger brake shake
        if (this.player.hasJustStoppedSliding()) {
            this.player.addCameraShake(12, 0.4); // Strong brake shake
            this.audioManager.playSound('brake'); // Brake skid sound
            this.player.slideDecelerationTime = 0; // Reset to avoid repeated triggers
        }

        // Update platforms, obstacles, collectibles, powerups
        this.updateEntities(deltaTime);

        // Check collisions
        this.checkCollisions();
        
        // Riproduci suono di atterraggio se il player è appena atterrato
        if (this.player.hasJustLanded()) {
            this.audioManager.playSound('land');
        }

        // Spawn new entities
        this.spawnTimer += deltaTime;
        
        // Spawn normale ogni spawnInterval
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnNewPlatform();
            this.spawnTimer = 0;
        } else {
            // Check occasionale per garantire minimo 3 piattaforme (solo ogni 0.5s)
            if (this.spawnTimer % 0.5 < deltaTime) {
                const dims = this.engine.getCanvasDimensions();
                const visiblePlatforms = this.platforms.filter(p => 
                    p.x + p.width > 0 && p.x < dims.width
                ).length;
                
                // Spawn emergenza se meno di 3 piattaforme visibili
                if (visiblePlatforms < 3) {
                    this.spawnNewPlatform();
                    this.spawnTimer = 0;
                }
            }
        }

        // Spawn powerups
        this.powerupSpawnTimer += deltaTime;
        if (this.powerupSpawnTimer >= this.powerupSpawnInterval) {
            this.spawnPowerup();
            this.powerupSpawnTimer = 0;
        }
        
        // Spawn nuovi bonus - molti più bonus!
        this.magnetSpawnTimer += deltaTime;
        if (this.magnetSpawnTimer >= this.magnetSpawnInterval) {
            this.spawnMagnetBonus();
            this.magnetSpawnTimer = 0;
        }
        
        this.timeSlowTimer += deltaTime;
        if (this.timeSlowTimer >= this.timeSlowInterval) {
            this.spawnTimeSlowBonus();
            this.timeSlowTimer = 0;
        }
        
        this.shieldTimer += deltaTime;
        if (this.shieldTimer >= this.shieldInterval) {
            this.spawnShieldBonus();
            this.shieldTimer = 0;
        }
        
        this.multiplierTimer += deltaTime;
        if (this.multiplierTimer >= this.multiplierInterval) {
            this.spawnMultiplierBonus();
            this.multiplierTimer = 0;
        }
        
        this.rainbowTimer += deltaTime;
        if (this.rainbowTimer >= this.rainbowInterval) {
            this.spawnRainbowBonus();
            this.rainbowTimer = 0;
        }

        // Update score based on distance
        this.scoreSystem.addDistance(Math.abs(this.platforms[0]?.velocity || 0) * deltaTime);

        // Update entities for rendering
        this.updateRenderEntities();

        // Update UI
        this.updateUI();

        // Check if player is dead
        if (!this.player.alive && !this.isShowingDeathAnimation) {
            this.startDeathSequence();
        }
    }

    updateCameraOffset(deltaTime) {
        // Il player è sempre a X=100, non serve calcolare offset
        // Questo metodo è mantenuto per compatibilità futura
    }
    
    updateSafetyPlatform(deltaTime) {
        if (!this.safetyPlatform) return;

        if (this.safetyPlatformActive) {
            // Check if player is on safety platform
            if (this.playerOnSafetyPlatform) {
                // Spawn immediately on first landing
                if (!this.hasSpawnedFirstRescue) {
                    this.spawnRescuePlatforms();
                    this.hasSpawnedFirstRescue = true;
                    this.rescuePlatformSpawnTimer = 0;
                }

                this.playerOnSafetyPlatformTimer += deltaTime;
                this.rescuePlatformSpawnTimer += deltaTime;

                // Spawn rescue platforms every interval while on safety platform
                if (this.rescuePlatformSpawnTimer >= this.rescuePlatformSpawnInterval) {
                    this.spawnRescuePlatforms();
                    this.rescuePlatformSpawnTimer = 0;
                }

                // Start dissolving after duration
                if (this.playerOnSafetyPlatformTimer >= this.safetyPlatformDissolveDuration) {
                    this.safetyPlatformDissolving = true;
                }
            } else {
                // Reset when player leaves
                this.playerOnSafetyPlatformTimer = 0;
                this.rescuePlatformSpawnTimer = 0;
                this.hasSpawnedFirstRescue = false;
            }

            // Handle dissolving animation
            if (this.safetyPlatformDissolving) {
                this.safetyPlatformDissolveProgress += deltaTime * 2; // 0.5 seconds dissolve

                if (this.safetyPlatformDissolveProgress >= 1.0) {
                    // Platform fully dissolved
                    this.safetyPlatformActive = false;
                    this.safetyPlatformDissolving = false;
                    this.safetyPlatformDissolveProgress = 0;
                    this.safetyPlatformTimer = 0;
                }
            }
        } else {
            // Platform is respawning
            this.safetyPlatformTimer += deltaTime;

            if (this.safetyPlatformTimer >= this.safetyPlatformRespawnTime) {
                // Respawn platform
                this.safetyPlatformActive = true;
                this.safetyPlatformTimer = 0;
                this.playerOnSafetyPlatformTimer = 0;
                this.rescuePlatformSpawnTimer = 0;
                this.hasSpawnedFirstRescue = false;
                this.setupSafetyPlatform(); // Reset platform
            }
        }
    }

    spawnRescuePlatforms() {
        const dims = this.engine.getCanvasDimensions();
        const rescueY = dims.height - 150; // Slightly above safety platform
        const platformWidth = 80;
        const spacing = 100;
        const startX = dims.width + 50;

        // Create 5 rescue platforms coming from the right
        for (let i = 0; i < 5; i++) {
            const platform = {
                x: startX + (i * spacing),
                y: rescueY - (i * 30), // Staircase pattern going up
                width: platformWidth,
                height: 12,
                color: [0.3, 0.9, 0.5, 1.0], // Bright green for rescue
                velocity: -150, // Moving left
                type: 'platform',
                platformType: 'RESCUE',
                // Laser effect properties
                laserPhase: Math.random() * Math.PI * 2,
                laserIntensity: 1.0,
                spawnTime: Date.now()
            };
            this.platforms.push(platform);
        }
    }

    updateEntities(deltaTime) {
        const dims = this.engine.getCanvasDimensions();
        
        // Calcola velocità aggiuntiva dalle entità in base al camera offset - include turbo boost
        const cameraSpeed = this.player.boostActive ? this.player.velocityX : 
                           this.player.isTurboActive ? this.player.velocityX : 0;

        // Update platforms with crumbling logic
        this.platforms = this.platforms.filter(platform => {
            // Velocità base + velocità camera per effetto parallasse
            const totalVelocity = platform.velocity - cameraSpeed;
            platform.x += totalVelocity * deltaTime;

            // Handle crumbling platforms
            if (platform.isCrumbling) {
                platform.crumbleTimer += deltaTime;
                if (platform.crumbleTimer >= platform.crumbleDuration) {
                    this.disposePlatform(platform); // Cleanup memoria
                    return false; // Remove crumbled platform
                }
            }
            
            // Handle spring animation
            if (platform.platformType === PlatformTypes.SPRING) {
                platform.springAnimationTime += deltaTime;
                
                // Decay compression over time
                if (platform.springCompression > 0) {
                    platform.springCompression = Math.max(0, platform.springCompression - deltaTime * 3);
                }
            }
            
            // Handle icy platform shimmer effect
            if (platform.platformType === PlatformTypes.ICY) {
                platform.icyShimmer += deltaTime * 5; // Shimmer animation speed
            }

            const keep = platform.x + platform.width > -100;
            if (!keep) this.disposePlatform(platform);
            return keep;
        });

        // Update obstacles
        this.obstacles = this.obstacles.filter(obstacle => {
            const totalVelocity = obstacle.velocity - cameraSpeed;
            obstacle.x += totalVelocity * deltaTime;
            const keep = obstacle.x + obstacle.width > -50;
            if (!keep) this.disposeObstacle(obstacle);
            return keep;
        });

        // Update collectibles
        this.collectibles = this.collectibles.filter(collectible => {
            const totalVelocity = collectible.velocity - cameraSpeed;
            collectible.x += totalVelocity * deltaTime;
            
            // Effetto magnete - attira verso il player
            if (collectible.magnetized) {
                collectible.magnetDuration -= deltaTime;
                if (collectible.magnetDuration <= 0) {
                    collectible.magnetized = false;
                } else {
                    const dx = this.player.x - collectible.x;
                    const dy = (this.player.y + this.player.height / 2) - collectible.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 5) {
                        // Magnete più veloce durante il turbo per compensare la velocità aumentata
                        const magnetSpeed = this.player.isTurboActive ? 1200 : 400;
                        collectible.x += (dx / dist) * magnetSpeed * deltaTime;
                        collectible.y += (dy / dist) * magnetSpeed * deltaTime;
                    }
                }
            }
            
            const keep = collectible.x + collectible.radius > -50;
            if (!keep) this.disposeCollectible(collectible);
            return keep;
        });

        // Update powerups
        this.powerups = this.powerups.filter(powerup => {
            // Applica camera speed al powerup
            const originalX = powerup.x;
            powerup.update(deltaTime);
            powerup.x += -cameraSpeed * deltaTime;
            const keep = powerup.x + powerup.radius > -50 && !powerup.collected;
            if (!keep) this.disposePowerup(powerup);
            return keep;
        });
        
        // Update hearts (cuoricini)
        this.hearts = this.hearts.filter(heart => {
            const totalVelocity = heart.velocity - cameraSpeed;
            heart.x += totalVelocity * deltaTime;
            // Animazione float
            heart.pulsePhase += deltaTime * 3;
            const keep = heart.x + heart.radius > -50;
            if (!keep) this.disposeCollectible(heart);
            return keep;
        });
        
        // Update boosts
        this.boosts = this.boosts.filter(boost => {
            const totalVelocity = boost.velocity - cameraSpeed;
            boost.x += totalVelocity * deltaTime;
            boost.pulsePhase += deltaTime * 4;
            boost.rotationAngle += deltaTime * 3;
            
            // Trail particles per boost
            if (this.random(0, 1) < 0.3) {
                boost.trailParticles.push({
                    x: boost.x,
                    y: boost.y,
                    life: 0.5,
                    maxLife: 0.5,
                    size: 4 + this.random(0, 3),
                    color: [...boost.color]
                });
            }
            
            // Update trail particles
            boost.trailParticles = boost.trailParticles.filter(p => {
                p.life -= deltaTime;
                const pKeep = p.life > 0;
                if (!pKeep) this.disposeParticle(p);
                return pKeep;
            });
            
            const keep = boost.x + boost.radius > -50;
            if (!keep) this.disposeCollectible(boost);
            return keep;
        });
        
        // Update nuovi bonus
        
        this.magnetBonuses = this.magnetBonuses.filter(bonus => {
            const totalVelocity = bonus.velocity - cameraSpeed;
            bonus.x += totalVelocity * deltaTime;
            bonus.pulsePhase += deltaTime * 5;
            bonus.rotation += deltaTime * 2;
            const keep = bonus.x + bonus.radius > -50;
            if (!keep) this.disposeBonus(bonus);
            return keep;
        });
        
        this.timeBonuses = this.timeBonuses.filter(bonus => {
            const totalVelocity = bonus.velocity - cameraSpeed;
            bonus.x += totalVelocity * deltaTime;
            bonus.pulsePhase += deltaTime * 4;
            bonus.rotation += deltaTime * 3;
            const keep = bonus.x + bonus.radius > -50;
            if (!keep) this.disposeBonus(bonus);
            return keep;
        });
        
        this.shieldBonuses = this.shieldBonuses.filter(bonus => {
            const totalVelocity = bonus.velocity - cameraSpeed;
            bonus.x += totalVelocity * deltaTime;
            bonus.pulsePhase += deltaTime * 6;
            bonus.rotation += deltaTime * 2.5;
            const keep = bonus.x + bonus.radius > -50;
            if (!keep) this.disposeBonus(bonus);
            return keep;
        });
        
        this.multiplierBonuses = this.multiplierBonuses.filter(bonus => {
            const totalVelocity = bonus.velocity - cameraSpeed;
            bonus.x += totalVelocity * deltaTime;
            bonus.pulsePhase += deltaTime * 7;
            bonus.rotation += deltaTime * 4;
            const keep = bonus.x + bonus.radius > -50;
            if (!keep) this.disposeBonus(bonus);
            return keep;
        });
        
        this.rainbowBonuses = this.rainbowBonuses.filter(bonus => {
            const totalVelocity = bonus.velocity - cameraSpeed;
            bonus.x += totalVelocity * deltaTime;
            bonus.rainbowPhase += deltaTime * 10;
            bonus.pulsePhase += deltaTime * 5;
            bonus.rotation += deltaTime * 3;
            
            // Trail arcobaleno
            if (this.random(0, 1) < 0.5) {
                const hue = (bonus.rainbowPhase * 100) % 360;
                const rgb = this.hslToRgb(hue / 360, 1.0, 0.5);
                bonus.particles.push({
                    x: bonus.x,
                    y: bonus.y,
                    life: 0.8,
                    size: 6,
                    color: [...rgb, 1.0]
                });
            }
            
            // Update particles
            bonus.particles = bonus.particles.filter(p => {
                p.life -= deltaTime;
                const pKeep = p.life > 0;
                if (!pKeep) this.disposeParticle(p);
                return pKeep;
            });
            
            const keep = bonus.x + bonus.radius > -50;
            if (!keep) this.disposeBonus(bonus);
            return keep;
        });
        
        // Update boost particles
        this.boostParticles = this.boostParticles.filter(particle => {
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            particle.life -= deltaTime;
            particle.size *= 0.98; // Shrink
            return particle.life > 0;
        });
        
        // Update powerup particles
        this.powerupParticles = this.powerupParticles.filter(particle => {
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            particle.vy += particle.gravity * deltaTime; // Gravity
            particle.life -= deltaTime;
            particle.rotation += particle.rotationSpeed * deltaTime;
            return particle.life > 0;
        });
    }
    
    hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [r, g, b];
    }

    checkCollisions() {
        // Reset grounded state - player must be on a platform to be grounded
        this.player.isGrounded = false;
        this.playerOnSafetyPlatform = false;

        // Safety platform collision (check first) - con tolleranza MOLTO maggiore
        if (this.safetyPlatform && this.safetyPlatformActive && !this.safetyPlatformDissolving) {
            // Usa tolleranza ENORME (80px) per essere sicuri che non passi attraverso
            const onSafety = this.player.checkPlatformCollision(this.safetyPlatform, 80);
            if (onSafety) {
                this.playerOnSafetyPlatform = true;
                // FORZA la posizione sopra la piattaforma
                if (this.player.velocityY > 0) {
                    this.player.y = this.safetyPlatform.y - this.player.height;
                    this.player.velocityY = 0;
                    this.player.isGrounded = true;
                }
            }
        }

        // Platform collisions
        for (const platform of this.platforms) {
            const wasGrounded = this.player.grounded;
            const landed = this.player.checkPlatformCollision(platform);
            
            if (landed && !wasGrounded) {
                this.achievementSystem.recordNormalLanding();
                this.achievementSystem.checkAchievements();
            }
        }

        // Obstacle collisions
        for (const obstacle of this.obstacles) {
            // Near miss detection
            const playerRight = this.player.x + this.player.width;
            const playerBottom = this.player.y + this.player.height;
            const obstacleLeft = obstacle.x;
            const obstacleTop = obstacle.y;
            const obstacleBottom = obstacle.y + obstacle.height;
            
            // Near miss se passa entro 15px dall'ostacolo
            if (playerRight > obstacleLeft - 15 && 
                playerRight < obstacleLeft + 5 &&
                this.player.y < obstacleBottom && 
                playerBottom > obstacleTop) {
                if (!obstacle.nearMissTriggered) {
                    obstacle.nearMissTriggered = true;
                    this.audioManager.playSound('near_miss');
                    this.achievementSystem.recordNearMiss();
                    this.createFloatingText('😎 +5', obstacle.x, obstacle.y - 20, [0.0, 1.0, 1.0, 1.0]);
                    this.scoreSystem.addPoints(5);
                    this.achievementSystem.checkAchievements();
                    
                    // Near miss sparkles for visual feedback
                    this.createSparkles(playerRight, this.player.y + this.player.height / 2, 10, [0.0, 1.0, 1.0]);
                }
            }
            
            if (this.player.checkObstacleCollision(obstacle)) {
                // Play hit sound only if player is still alive
                if (this.player.alive) {
                    this.audioManager.playSound('hit');
                }
                this.achievementSystem.recordDamage();
                
                // Combo break notification
                if (this.scoreSystem.combo > 3) {
                    this.audioManager.playSound('combo_break');
                    this.achievementSystem.addNotification('💔 Combo Perso!', `Hai perso la combo x${this.scoreSystem.combo}`, 'warning');
                }
            }
        }

        // Collectible collisions
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(this.collectibles[i])) {
                const collectible = this.collectibles[i];
                this.collectibles.splice(i, 1);
                const points = this.scoreSystem.addCollectible();
                this.audioManager.playSound('collect');
                
                // Achievement tracking
                this.achievementSystem.recordCollectible();
                this.achievementSystem.checkAchievements();
                
                // Streak notification ogni 5
                if (this.achievementSystem.currentStreak > 0 && this.achievementSystem.currentStreak % 5 === 0) {
                    this.audioManager.playSound('streak');
                    this.achievementSystem.addNotification(`🔥 Streak x${this.achievementSystem.currentStreak}!`, 'Continua così!', 'streak');
                }
                
                // Crea floating text per i punti
                this.createFloatingText(`+${points}`, collectible.x, collectible.y, [1.0, 0.9, 0.2, 1.0]);
                
                // Mostra combo animation
                this.showComboAnimation();
            }
        }
        
        // Heart collisions (cuoricini)
        for (let i = this.hearts.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(this.hearts[i])) {
                if (this.player.heal(1)) {
                    this.hearts.splice(i, 1);
                    this.audioManager.playSound('powerup'); // Suono positivo
                }
            }
        }
        
        // Boost collisions
        for (let i = this.boosts.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(this.boosts[i])) {
                const boost = this.boosts[i];
                this.boosts.splice(i, 1);
                
                // Applica boost velocità al player
                this.player.applyBoost();
                
                // Suono di accelerazione
                this.audioManager.playSound('boost');
                
                // Aggiungi combo e punti
                const points = this.scoreSystem.addBoostCombo();
                
                // Achievement tracking
                this.achievementSystem.recordBoost();
                this.achievementSystem.checkAchievements();
                
                // Crea esplosione di particelle
                this.createBoostParticles(boost);
                
                // Floating text per boost
                this.createFloatingText(`+${points} BOOST!`, boost.x, boost.y, [0.0, 1.0, 0.9, 1.0]);
                
                // Mostra combo animation
                this.showComboAnimation();
                
                // Suono
                this.audioManager.playSound('collect');
            }
        }
        
        // Collisioni nuovi bonus - MECCANICHE PAZZESCHE!
        
        // Magnet bonus - attira tutti i collectibles
        for (let i = this.magnetBonuses.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(this.magnetBonuses[i])) {
                const magnet = this.magnetBonuses[i];
                this.magnetBonuses.splice(i, 1);
                
                // Attira tutti i collectibles verso il player (anche quelli fuori schermo)
                this.collectibles.forEach(c => {
                    const dx = this.player.x - c.x;
                    const dy = this.player.y - c.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    c.magnetized = true;
                    // Durata più lunga durante turbo per compensare velocità
                    c.magnetDuration = this.player.isTurboActive ? 8.0 : 5.0;
                });
                
                this.createBonusExplosion(magnet.x, magnet.y, magnet.color);
                this.createFloatingText('🧲 MAGNETE!', magnet.x, magnet.y, magnet.color);
                this.achievementSystem.addNotification('🧲 Magnete Attivo!', 'Tutti i collectibles sono attratti!', 'info');
                this.audioManager.playSound('powerup');
            }
        }
        
        // Time slow bonus - rallenta tutto
        for (let i = this.timeBonuses.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(this.timeBonuses[i])) {
                const timeSlow = this.timeBonuses[i];
                this.timeBonuses.splice(i, 1);
                
                // Slow motion per 8 secondi
                this.timeScale = 0.5;
                setTimeout(() => {
                    this.timeScale = 1.0;
                }, 8000);
                
                this.createBonusExplosion(timeSlow.x, timeSlow.y, timeSlow.color);
                this.createFloatingText('⏰ SLOW MOTION!', timeSlow.x, timeSlow.y, timeSlow.color);
                this.achievementSystem.addNotification('⏰ Tempo Rallentato!', 'Hai 8 secondi di tempo!', 'info');
                this.audioManager.playSound('powerup');
            }
        }
        
        // Shield bonus - invincibilità temporanea
        for (let i = this.shieldBonuses.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(this.shieldBonuses[i])) {
                const shield = this.shieldBonuses[i];
                this.shieldBonuses.splice(i, 1);
                
                // Attiva scudo
                this.player.shieldActive = true;
                this.player.shieldDuration = 10.0; // 10 secondi
                
                this.createBonusExplosion(shield.x, shield.y, shield.color);
                this.createFloatingText('🛡️ SCUDO!', shield.x, shield.y, shield.color);
                this.achievementSystem.addNotification('🛡️ Scudo Attivo!', 'Sei invincibile per 10 secondi!', 'achievement');
                this.audioManager.playSound('powerup');
            }
        }
        
        // Multiplier bonus - 3x punti
        for (let i = this.multiplierBonuses.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(this.multiplierBonuses[i])) {
                const multi = this.multiplierBonuses[i];
                this.multiplierBonuses.splice(i, 1);
                
                // Attiva moltiplicatore
                this.scoreSystem.bonusMultiplier = 3.0;
                this.scoreSystem.bonusMultiplierDuration = 12.0; // 12 secondi
                
                this.createBonusExplosion(multi.x, multi.y, multi.color);
                this.createFloatingText('✖️3 PUNTI!', multi.x, multi.y, multi.color);
                this.achievementSystem.addNotification('💰 Moltiplicatore x3!', 'Tutti i punti triplicati per 12 secondi!', 'achievement');
                this.audioManager.playSound('powerup');
            }
        }
        
        // Rainbow bonus - TUTTI I POTERI!
        for (let i = this.rainbowBonuses.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(this.rainbowBonuses[i])) {
                const rainbow = this.rainbowBonuses[i];
                this.rainbowBonuses.splice(i, 1);
                
                // ATTIVA TUTTO!
                this.collectibles.forEach(c => { c.magnetized = true; c.magnetDuration = 8.0; });
                this.timeScale = 0.6;
                this.player.shieldActive = true;
                this.player.shieldDuration = 15.0;
                this.scoreSystem.bonusMultiplier = 5.0;
                this.scoreSystem.bonusMultiplierDuration = 15.0;
                
                setTimeout(() => { this.timeScale = 1.0; }, 8000);
                
                // ESPLOSIONE ARCOBALENO PAZZESCA
                for (let j = 0; j < 5; j++) {
                    setTimeout(() => {
                        const hue = (j * 72) % 360;
                        const rgb = this.hslToRgb(hue / 360, 1.0, 0.5);
                        this.createBonusExplosion(rainbow.x, rainbow.y, rgb, 120);
                    }, j * 150);
                }
                
                this.createFloatingText('🌈 RAINBOW POWER!', rainbow.x, rainbow.y, [1.0, 1.0, 1.0, 1.0]);
                this.achievementSystem.addNotification('🌈 RAINBOW POWER!', 'TUTTI I POTERI ATTIVI!', 'achievement');
                this.audioManager.playSound('powerup');
                
                // Screen flash rainbow
                this.screenFlash.alpha = 0.5;
                this.screenFlash.color = [1.0, 1.0, 1.0];
            }
        }

        // Powerup collisions
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            if (this.player.checkPowerupCollision(this.powerups[i])) {
                const powerup = this.powerups[i];
                powerup.collected = true;

                console.log('Power-up collected!', powerup.powerupType || powerup.type);

                // Create particle explosion
                this.createPowerupParticles(powerup);

                // Activate powerup usando il tipo corretto
                const powerupType = powerup.powerupType || powerup.type;
                const activated = this.powerupSystem.activatePowerup(
                    powerupType,
                    powerup.duration,
                    powerup.cooldown
                );

                console.log('Power-up activated:', activated);

                if (activated) {
                    this.powerups.splice(i, 1);
                    
                    // Achievement tracking
                    this.achievementSystem.recordPowerup();
                    this.achievementSystem.checkAchievements();
                }
            }
        }

    }

    checkDeathCondition() {
        // Check if player fell off screen
        // Safety platform salva il player SOLO se è attiva (non dissolta)
        const hasSafetyPlatform = this.safetyPlatformActive && !this.safetyPlatformDissolving;
        
        if (this.player.y > this.canvasHeight) {
            if (!this.player.powerups.immortality && !hasSafetyPlatform) {
                // Morte solo se non è immortale E non c'è safety platform ATTIVA
                this.player.alive = false;
            } else if (hasSafetyPlatform && this.player.y > this.safetyPlatform.y + 100) {
                // Se è caduto MOLTO sotto la safety platform, emergency teleport
                this.player.y = this.safetyPlatform.y - 50;
                this.player.velocityY = 0;
                console.log('Emergency teleport to safety platform!');
            }
        }
    }

    spawnNewPlatform() {
        const platform = this.levelGenerator.generatePlatform();
        this.platforms.push(platform);
        this.platformCounter++;

        // Level up based on platform count
        if (this.platformCounter >= this.platformsPerLevel) {
            this.scoreSystem.levelUp();
            this.platformCounter = 0;
        }

        // Maybe spawn obstacle (but not on bouncy platforms)
        if (platform.platformType !== PlatformTypes.BOUNCY && this.levelGenerator.shouldGenerateObstacle()) {
            const obstacle = this.levelGenerator.generateObstacle(
                platform.x, platform.y, platform.width, platform.velocity
            );
            this.obstacles.push(obstacle);
        }

        // Maybe spawn collectible
        if (this.levelGenerator.shouldGenerateCollectible()) {
            const collectible = this.levelGenerator.generateCollectible(
                platform.x, platform.y, platform.width, platform.velocity
            );
            this.collectibles.push(collectible);
        }
        
        // Maybe spawn heart (cuoricino)
        if (this.levelGenerator.shouldGenerateHeart()) {
            const heart = this.levelGenerator.generateHeart(
                platform.x, platform.y, platform.width, platform.velocity
            );
            this.hearts.push(heart);
        }
        
        // Maybe spawn boost (non su molle o bouncy)
        if (platform.platformType !== PlatformTypes.BOUNCY && 
            platform.platformType !== PlatformTypes.SPRING && 
            this.levelGenerator.shouldGenerateBoost()) {
            const boost = this.levelGenerator.generateBoost(
                platform.x, platform.y, platform.width, platform.velocity
            );
            this.boosts.push(boost);
        }
    }

    spawnPowerup() {
        const dims = this.engine.getCanvasDimensions();

        // Choose random powerup type
        const types = Object.values(PowerupTypes);
        const randomType = types[Math.floor(Math.random() * types.length)];

        // Find a platform to spawn on
        const validPlatforms = this.platforms.filter(p =>
            p.x > dims.width * 0.3 && p.x < dims.width * 0.8
        );

        if (validPlatforms.length > 0) {
            const platform = validPlatforms[Math.floor(Math.random() * validPlatforms.length)];
            const powerup = new Powerup(
                platform.x + platform.width / 2,
                platform.y - 80,
                randomType
            );
            powerup.entityType = 'powerup'; // Per il rendering
            powerup.powerupType = randomType; // Tipo specifico del powerup
            powerup.velocity = platform.velocity;
            this.powerups.push(powerup);
            console.log('Power-up spawned:', randomType, 'at', powerup.x, powerup.y);
        }
    }

    createBoostParticles(boost) {
        const particleCount = 50; // Più particelle per effetto più spettacolare
        const centerX = boost.x;
        const centerY = boost.y;
        
        // Esplosione a più strati con colori cyan vibranti
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + this.random(0, 0.5);
            const layer = Math.floor(i / (particleCount / 3));
            const speed = 150 + this.random(0, 150) + layer * 50;
            const size = 4 + this.random(0, 5);
            
            // Colori cyan/turchese brillanti
            const colorVariant = Math.random();
            let color;
            if (colorVariant < 0.33) {
                color = [0.0, 1.0, 0.9, 1.0]; // Cyan brillante
            } else if (colorVariant < 0.66) {
                color = [0.0, 0.8, 1.0, 1.0]; // Turchese
            } else {
                color = [0.2, 1.0, 1.0, 1.0]; // Cyan chiaro
            }
            
            const particle = {
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.8 + this.random(0, 0.4),
                maxLife: 1.2,
                size: size,
                color: color,
                type: 'boostParticle',
                glow: true // Flag per effetto glow
            };
            
            this.boostParticles.push(particle);
        }
        
        // Aggiungi anello esplosivo
        this.createExplosionRing(centerX, centerY, [0.0, 1.0, 0.9, 1.0], 80);
    }
    
    random(min, max) {
        return min + Math.random() * (max - min);
    }

    createPowerupParticles(powerup) {
        const particleCount = 60; // Esplosione spettacolare
        const centerX = powerup.x;
        const centerY = powerup.y;
        
        // Get powerup-specific colors
        let particleColors = [];
        let ringColor = [];
        switch (powerup.powerupType || powerup.type) {
            case 'immortality':
                particleColors = [
                    [1.0, 0.84, 0.0, 1.0],
                    [1.0, 0.95, 0.6, 1.0],
                    [1.0, 0.75, 0.0, 1.0],
                    [1.0, 1.0, 0.3, 1.0]
                ];
                ringColor = [1.0, 0.84, 0.0, 1.0];
                break;
            case 'flight':
                particleColors = [
                    [0.4, 0.7, 1.0, 1.0],
                    [0.6, 0.85, 1.0, 1.0],
                    [0.3, 0.6, 0.9, 1.0],
                    [0.5, 0.9, 1.0, 1.0]
                ];
                ringColor = [0.4, 0.7, 1.0, 1.0];
                break;
            case 'superJump':
                particleColors = [
                    [1.0, 0.3, 0.5, 1.0],
                    [1.0, 0.5, 0.7, 1.0],
                    [1.0, 0.2, 0.4, 1.0],
                    [1.0, 0.4, 0.8, 1.0]
                ];
                ringColor = [1.0, 0.3, 0.5, 1.0];
                break;
            default:
                particleColors = [[1.0, 1.0, 1.0, 1.0]];
                ringColor = [1.0, 1.0, 1.0, 1.0];
        }
        
        // Esplosione multi-strato
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
            const layer = Math.floor(i / (particleCount / 3));
            const speed = 120 + Math.random() * 180 + layer * 40;
            const size = 4 + Math.random() * 6;
            
            const particle = {
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 60,
                gravity: 200,
                life: 1.0 + Math.random() * 0.5,
                maxLife: 1.5,
                size: size,
                color: particleColors[Math.floor(Math.random() * particleColors.length)],
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 12,
                type: 'powerupParticle',
                shape: Math.random() > 0.5 ? 'circle' : 'square',
                glow: true
            };
            
            this.powerupParticles.push(particle);
        }
        
        // Aggiungi anello esplosivo e scintille
        this.createExplosionRing(centerX, centerY, ringColor, 100);
        this.createSparkles(centerX, centerY, ringColor, 20);
    }
    
    createExplosionRing(x, y, color, maxRadius) {
        // Crea anello espansivo
        for (let i = 0; i < 40; i++) {
            const angle = (Math.PI * 2 * i) / 40;
            const particle = {
                x: x,
                y: y,
                vx: Math.cos(angle) * 300,
                vy: Math.sin(angle) * 300,
                life: 0.3,
                maxLife: 0.3,
                size: 3,
                color: [...color],
                type: 'ringParticle',
                glow: true
            };
            this.boostParticles.push(particle);
        }
    }
    
    createSparkles(x, y, color, count) {
        // Scintille casuali
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 150;
            const particle = {
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 100,
                gravity: 150,
                life: 0.5 + Math.random() * 0.3,
                maxLife: 0.8,
                size: 2 + Math.random() * 3,
                color: [...color],
                type: 'sparkle',
                glow: true
            };
            this.powerupParticles.push(particle);
        }
    }
    
    spawnMagnetBonus() {
        const dims = this.engine.getCanvasDimensions();
        const x = dims.width + 50;
        const y = 100 + Math.random() * (dims.height - 300);
        
        this.magnetBonuses.push({
            x: x,
            y: y,
            width: 35,
            height: 35,
            velocity: -200,
            type: 'magnet',
            rotation: 0,
            color: [1.0, 0.0, 1.0, 1.0], // Magenta
            glowColor: [1.0, 0.5, 1.0, 0.6],
            pulsePhase: 0,
            radius: 17.5
        });
    }
    
    spawnTimeSlowBonus() {
        const dims = this.engine.getCanvasDimensions();
        const x = dims.width + 50;
        const y = 100 + Math.random() * (dims.height - 300);
        
        this.timeBonuses.push({
            x: x,
            y: y,
            width: 35,
            height: 35,
            velocity: -200,
            type: 'timeslow',
            rotation: 0,
            color: [0.5, 0.5, 1.0, 1.0], // Blu chiaro
            glowColor: [0.7, 0.7, 1.0, 0.6],
            pulsePhase: 0,
            radius: 17.5
        });
    }
    
    spawnShieldBonus() {
        const dims = this.engine.getCanvasDimensions();
        const x = dims.width + 50;
        const y = 100 + Math.random() * (dims.height - 300);
        
        this.shieldBonuses.push({
            x: x,
            y: y,
            width: 35,
            height: 35,
            velocity: -200,
            type: 'shield',
            rotation: 0,
            color: [0.0, 1.0, 0.5, 1.0], // Verde acqua
            glowColor: [0.3, 1.0, 0.7, 0.6],
            pulsePhase: 0,
            radius: 17.5
        });
    }
    
    spawnMultiplierBonus() {
        const dims = this.engine.getCanvasDimensions();
        const x = dims.width + 50;
        const y = 100 + Math.random() * (dims.height - 300);
        
        this.multiplierBonuses.push({
            x: x,
            y: y,
            width: 40,
            height: 40,
            velocity: -200,
            type: 'multiplier',
            rotation: 0,
            color: [1.0, 0.8, 0.0, 1.0], // Oro
            glowColor: [1.0, 0.9, 0.3, 0.6],
            pulsePhase: 0,
            radius: 20
        });
    }
    
    spawnRainbowBonus() {
        const dims = this.engine.getCanvasDimensions();
        const x = dims.width + 50;
        const y = 100 + Math.random() * (dims.height - 300);
        
        this.rainbowBonuses.push({
            x: x,
            y: y,
            width: 45,
            height: 45,
            velocity: -200,
            type: 'rainbow',
            rotation: 0,
            rainbowPhase: 0,
            pulsePhase: 0,
            particles: [],
            radius: 22.5
        });
    }
    
    createBonusExplosion(x, y, color, count = 80) {
        // Esplosione PAZZESCA per i nuovi bonus
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 200 + Math.random() * 300;
            
            this.boostParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 4 + Math.random() * 6,
                color: [...color],
                life: 1.0 + Math.random() * 0.8,
                maxLife: 1.0 + Math.random() * 0.8,
                type: 'bonus',
                glow: true,
                spiral: Math.random() > 0.5 // Metà spirale, metà dritte
            });
        }
        
        // Multiple explosion rings
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.createExplosionRing(x, y, color, 100);
            }, i * 100);
        }
        
        // Super sparkles
        this.createSparkles(x, y, color, 30);
    }
    
    startLevelTransition(level) {
        this.isInLevelTransition = true;
        const dims = this.engine.getCanvasDimensions();
        
        const messages = [
            `🌟 LIVELLO ${level} 🌟`,
            `💎 LIVELLO ${level} 💎`,
            `⚡ LIVELLO ${level} ⚡`,
            `🔥 LIVELLO ${level} 🔥`,
            `🚀 LIVELLO ${level} 🚀`
        ];
        
        this.levelTransition = {
            level: level,
            message: messages[(level - 1) % messages.length],
            phase: 0, // 0: zoom in, 1: hold, 2: zoom out
            progress: 0,
            duration: 3.0, // 3 secondi totali
            scale: 0,
            alpha: 0,
            rotation: 0,
            particles: [],
            rays: []
        };
        
        // Crea particelle esplosive
        for (let i = 0; i < 100; i++) {
            const angle = (Math.PI * 2 * i) / 100;
            this.levelTransition.particles.push({
                x: dims.width / 2,
                y: dims.height / 2,
                vx: Math.cos(angle) * (200 + Math.random() * 200),
                vy: Math.sin(angle) * (200 + Math.random() * 200),
                size: 3 + Math.random() * 5,
                color: [
                    Math.random(),
                    Math.random(),
                    Math.random(),
                    1.0
                ],
                life: 1.0 + Math.random() * 1.5,
                maxLife: 1.0 + Math.random() * 1.5
            });
        }
        
        // Crea raggi luminosi rotanti
        for (let i = 0; i < 20; i++) {
            this.levelTransition.rays.push({
                angle: (Math.PI * 2 * i) / 20,
                length: 0,
                maxLength: dims.width,
                speed: 2 + Math.random()
            });
        }
        
        // Slow motion durante transizione
        this.timeScale = 0.3;
        setTimeout(() => {
            this.timeScale = 1.0;
            this.isInLevelTransition = false;
        }, 3000);
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
        this.renderingSystem.setFloatingTexts(this.floatingTexts);
        this.renderingSystem.setAchievementNotifications(this.achievementSystem.getNotifications());
        this.renderingSystem.setScreenFlash(this.screenFlash);
        this.renderingSystem.setCombo(this.scoreSystem.getCombo());
        this.renderingSystem.setLevelTransition(this.levelTransition);
        
        // Pass turbo button UI to rendering system
        this.renderingSystem.setTurboButton(this.turboButtonUI);

        // Include safety platform with dissolve info
        const entities = [
            ...this.platforms,
            ...this.obstacles,
            ...this.collectibles,
            ...this.powerups,
            ...this.hearts,
            ...this.boosts,
            ...this.magnetBonuses,
            ...this.timeBonuses,
            ...this.shieldBonuses,
            ...this.multiplierBonuses,
            ...this.rainbowBonuses,
            ...this.powerupParticles,
            ...this.boostParticles
        ];

        // Add safety platform if active or dissolving
        if (this.safetyPlatform && (this.safetyPlatformActive || this.safetyPlatformDissolving)) {
            const safetyClone = { ...this.safetyPlatform };
            safetyClone.dissolveProgress = this.safetyPlatformDissolveProgress;
            safetyClone.isDissolving = this.safetyPlatformDissolving;
            safetyClone.respawnProgress = this.safetyPlatformActive ? 0 : (this.safetyPlatformTimer / this.safetyPlatformRespawnTime);
            // Add timer info for visual indicator
            safetyClone.playerOnPlatform = this.playerOnSafetyPlatform;
            safetyClone.timeOnPlatform = this.playerOnSafetyPlatformTimer;
            safetyClone.maxTimeOnPlatform = this.safetyPlatformDissolveDuration;
            entities.push(safetyClone);
        }

        entities.push(this.player);

        this.engine.entities = entities;
    }

    updateUI() {
        const stats = this.scoreSystem.getGameStats();
        const powerupTimers = this.powerupSystem.getAllTimers();

        const event = new CustomEvent('gameUpdate', {
            detail: { ...stats, powerupTimers }
        });
        window.dispatchEvent(event);
    }

    showMenu() {
        this.gameState.setState(GameStates.MENU);
        const event = new CustomEvent('showMenu', {
            detail: { highScore: this.scoreSystem.getHighScore() }
        });
        window.dispatchEvent(event);
    }

    startGame() {
        // Reset game state
        this.platforms = [];
        this.obstacles = [];
        this.collectibles = [];
        this.powerups = [];
        this.hearts = [];
        this.boosts = [];
        this.powerupParticles = [];
        this.boostParticles = [];
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

        // Reset safety platform
        this.safetyPlatformActive = true;
        this.safetyPlatformDissolving = false;
        this.safetyPlatformDissolveProgress = 0;
        this.safetyPlatformTimer = 0;
        this.playerOnSafetyPlatformTimer = 0;
        this.setupSafetyPlatform();

        // Start game
        this.gameState.setState(GameStates.PLAYING);
        this.engine.start();
        this.audioManager.resume();

        const event = new CustomEvent('gameStart');
        window.dispatchEvent(event);
    }

    startDeathSequence() {
        // Prevent multiple calls
        if (this.isShowingDeathAnimation) return;
        
        this.isShowingDeathAnimation = true;
        
        // Stop background music
        this.audioManager.stopBackgroundMusic();
        
        // Play sad death sound
        this.audioManager.playSound('death');
        
        // Create death animation
        this.deathAnimation = {
            timer: 0,
            duration: 2.5, // Durata del suono di morte
            fadeAlpha: 0,
            playerAlpha: 1.0,
            rotation: 0,
            scale: 1.0,
            particles: [],
            playerX: this.player.x,
            playerY: this.player.y,
            playerWidth: this.player.width,
            playerHeight: this.player.height
        };
        
        // Create sad particle explosion
        const particleCount = 40;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 100 + Math.random() * 150;
            
            this.deathAnimation.particles.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 100,
                size: 3 + Math.random() * 4,
                color: [0.5, 0.5, 0.5, 1.0], // Gray particles for sad effect
                life: 1.5 + Math.random() * 0.5,
                maxLife: 2.0,
                alpha: 1.0
            });
        }
        
        // After death animation, show game over
        setTimeout(() => {
            this.gameOver();
        }, 2500);
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
        }
    }

    resumeGame() {
        if (this.gameState.isPaused()) {
            this.gameState.setState(GameStates.PLAYING);
            this.engine.start();
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
    
    // ============================================
    // DISPOSE METHODS - Gestione efficiente memoria
    // ============================================
    
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

