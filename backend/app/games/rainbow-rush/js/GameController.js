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
import { AudioManager } from './managers/AudioManager.js';
import { InputManager } from './managers/InputManager.js';
import { PlatformSDKManager } from './managers/PlatformSDKManager.js';

export class GameController {
    constructor(canvas) {
        this.canvas = canvas;
        this.engine = new GameEngine(canvas);
        this.gameState = new GameState();
        this.scoreSystem = new ScoreSystem();
        this.powerupSystem = new PowerupSystem();
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
        
        // Level up animation
        this.levelUpAnimation = null;
        
        // Combo animation
        this.comboAnimation = null;
        this.floatingTexts = []; // Testi galleggianti per punti
        
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

        // Setup initial platforms
        this.setupInitialPlatforms();

        // Setup safety platform
        this.setupSafetyPlatform();

        // Setup systems
        this.setupSystems();

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
    }
    
    showComboAnimation() {
        const combo = this.scoreSystem.getCombo();
        if (combo <= 1) return; // Mostra solo da combo 2+
        
        const dims = this.engine.getCanvasDimensions();
        
        // Messaggi divertenti basati su combo
        let message = '';
        let color = [1.0, 1.0, 1.0, 1.0];
        
        if (combo >= 50) {
            message = `🔥 LEGGENDARIO! x${combo} 🔥`;
            color = [1.0, 0.0, 1.0, 1.0]; // Magenta
        } else if (combo >= 30) {
            message = `⭐ INCREDIBILE! x${combo} ⭐`;
            color = [1.0, 0.5, 0.0, 1.0]; // Arancione
        } else if (combo >= 20) {
            message = `💥 FANTASTICO! x${combo} 💥`;
            color = [1.0, 0.2, 0.2, 1.0]; // Rosso
        } else if (combo >= 15) {
            message = `⚡ PERFETTO! x${combo} ⚡`;
            color = [1.0, 1.0, 0.0, 1.0]; // Giallo
        } else if (combo >= 10) {
            message = `🌟 STUPENDO! x${combo} 🌟`;
            color = [0.0, 1.0, 1.0, 1.0]; // Cyan
        } else if (combo >= 5) {
            message = `🚀 COMBO! x${combo} 🚀`;
            color = [0.5, 1.0, 0.5, 1.0]; // Verde
        } else {
            message = `COMBO x${combo}!`;
            color = [1.0, 1.0, 1.0, 1.0]; // Bianco
        }
        
        this.comboAnimation = {
            text: message,
            x: dims.width - 250,
            y: 120,
            floatY: 120,
            life: 1.5,
            maxLife: 1.5,
            fontSize: 28 + Math.min(combo * 0.5, 20), // Cresce con la combo
            pulsePhase: 0,
            color: color,
            scale: 1.0,
            combo: combo
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
        if (!this.gameState.isPlaying()) return;
        
        // Update score system (include combo timer)
        this.scoreSystem.update(deltaTime);
        
        // Update camera offset basato sul boost del player
        this.updateCameraOffset(deltaTime);
        
        // Calcola velocità camera per effetto parallasse
        const cameraSpeed = this.player.boostActive ? this.player.velocityX : 0;

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
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnNewPlatform();
            this.spawnTimer = 0;
        }

        // Spawn powerups
        this.powerupSpawnTimer += deltaTime;
        if (this.powerupSpawnTimer >= this.powerupSpawnInterval) {
            this.spawnPowerup();
            this.powerupSpawnTimer = 0;
        }

        // Update score based on distance
        this.scoreSystem.addDistance(Math.abs(this.platforms[0]?.velocity || 0) * deltaTime);

        // Update entities for rendering
        this.updateRenderEntities();

        // Update UI
        this.updateUI();

        // Check if player is dead
        if (!this.player.alive) {
            this.gameOver();
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
        
        // Calcola velocità aggiuntiva dalle entità in base al camera offset
        const cameraSpeed = this.player.boostActive ? this.player.velocityX : 0;

        // Update platforms with crumbling logic
        this.platforms = this.platforms.filter(platform => {
            // Velocità base + velocità camera per effetto parallasse
            const totalVelocity = platform.velocity - cameraSpeed;
            platform.x += totalVelocity * deltaTime;

            // Handle crumbling platforms
            if (platform.isCrumbling) {
                platform.crumbleTimer += deltaTime;
                if (platform.crumbleTimer >= platform.crumbleDuration) {
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

            return platform.x + platform.width > 0;
        });

        // Update obstacles
        this.obstacles = this.obstacles.filter(obstacle => {
            const totalVelocity = obstacle.velocity - cameraSpeed;
            obstacle.x += totalVelocity * deltaTime;
            return obstacle.x + obstacle.width > 0;
        });

        // Update collectibles
        this.collectibles = this.collectibles.filter(collectible => {
            const totalVelocity = collectible.velocity - cameraSpeed;
            collectible.x += totalVelocity * deltaTime;
            return collectible.x + collectible.radius > 0;
        });

        // Update powerups
        this.powerups = this.powerups.filter(powerup => {
            // Applica camera speed al powerup
            const originalX = powerup.x;
            powerup.update(deltaTime);
            powerup.x += -cameraSpeed * deltaTime;
            return powerup.x + powerup.radius > 0 && !powerup.collected;
        });
        
        // Update hearts (cuoricini)
        this.hearts = this.hearts.filter(heart => {
            const totalVelocity = heart.velocity - cameraSpeed;
            heart.x += totalVelocity * deltaTime;
            // Animazione float
            heart.pulsePhase += deltaTime * 3;
            return heart.x + heart.radius > 0;
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
                return p.life > 0;
            });
            
            return boost.x + boost.radius > 0;
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

    checkCollisions() {
        // Reset grounded state - player must be on a platform to be grounded
        this.player.isGrounded = false;
        this.playerOnSafetyPlatform = false;

        // Safety platform collision (check first)
        if (this.safetyPlatform && this.safetyPlatformActive && !this.safetyPlatformDissolving) {
            const onSafety = this.player.checkPlatformCollision(this.safetyPlatform);
            if (onSafety) {
                this.playerOnSafetyPlatform = true;
            }
        }

        // Platform collisions
        for (const platform of this.platforms) {
            this.player.checkPlatformCollision(platform);
        }

        // Obstacle collisions
        for (const obstacle of this.obstacles) {
            if (this.player.checkObstacleCollision(obstacle)) {
                this.audioManager.playSound('hit');
            }
        }

        // Collectible collisions
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            if (this.player.checkCollectibleCollision(this.collectibles[i])) {
                const collectible = this.collectibles[i];
                this.collectibles.splice(i, 1);
                const points = this.scoreSystem.addCollectible();
                this.audioManager.playSound('collect');
                
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
                
                // Aggiungi combo e punti
                const points = this.scoreSystem.addBoostCombo();
                
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
                }
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
        const particleCount = 25;
        const centerX = boost.x;
        const centerY = boost.y;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + this.random(0, 0.3);
            const speed = 120 + this.random(0, 100);
            const size = 3 + this.random(0, 4);
            
            const particle = {
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.6 + this.random(0, 0.3),
                maxLife: 0.9,
                size: size,
                color: [0.0, 1.0, 0.9, 1.0],
                type: 'boostParticle'
            };
            
            this.boostParticles.push(particle);
        }
    }
    
    random(min, max) {
        return min + Math.random() * (max - min);
    }

    createPowerupParticles(powerup) {
        const particleCount = 30; // Number of particles
        const centerX = powerup.x;
        const centerY = powerup.y;
        
        // Get powerup-specific colors
        let particleColors = [];
        switch (powerup.powerupType || powerup.type) {
            case 'immortality':
                particleColors = [
                    [1.0, 0.84, 0.0, 1.0],  // Gold
                    [1.0, 0.95, 0.6, 1.0],  // Light gold
                    [1.0, 0.75, 0.0, 1.0]   // Deep gold
                ];
                break;
            case 'flight':
                particleColors = [
                    [0.4, 0.7, 1.0, 1.0],   // Light blue
                    [0.6, 0.85, 1.0, 1.0],  // Lighter blue
                    [0.3, 0.6, 0.9, 1.0]    // Sky blue
                ];
                break;
            case 'superJump':
                particleColors = [
                    [1.0, 0.3, 0.5, 1.0],   // Pink
                    [1.0, 0.5, 0.7, 1.0],   // Light pink
                    [1.0, 0.2, 0.4, 1.0]    // Deep pink
                ];
                break;
            default:
                particleColors = [[1.0, 1.0, 1.0, 1.0]];
        }
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
            const speed = 100 + Math.random() * 150;
            const size = 3 + Math.random() * 5;
            
            const particle = {
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 50, // Initial upward velocity
                gravity: 200, // Gravity effect
                life: 0.8 + Math.random() * 0.4,
                maxLife: 1.2,
                size: size,
                color: particleColors[Math.floor(Math.random() * particleColors.length)],
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 10,
                type: 'powerupParticle',
                shape: Math.random() > 0.5 ? 'circle' : 'square' // Mix of shapes
            };
            
            this.powerupParticles.push(particle);
        }
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

        // Include safety platform with dissolve info
        const entities = [
            ...this.platforms,
            ...this.obstacles,
            ...this.collectibles,
            ...this.powerups,
            ...this.hearts,
            ...this.boosts,
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
    }
}
