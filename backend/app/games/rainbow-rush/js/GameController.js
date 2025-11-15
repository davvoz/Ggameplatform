/**
 * GameController - Main game controller orchestrating all systems
 * Implements Facade Pattern and coordinates all game components
 */
import { GameEngine } from './core/GameEngine.js';
import { GameState, GameStates } from './core/GameState.js';
import { Player } from './entities/Player.js';
import { ProceduralLevelGenerator } from './systems/ProceduralLevelGenerator.js';
import { RenderingSystem } from './systems/RenderingSystem.js';
import { ScoreSystem } from './systems/ScoreSystem.js';
import { AudioManager } from './managers/AudioManager.js';
import { InputManager } from './managers/InputManager.js';
import { PlatformSDKManager } from './managers/PlatformSDKManager.js';

export class GameController {
    constructor(canvas) {
        this.canvas = canvas;
        this.engine = new GameEngine(canvas);
        this.gameState = new GameState();
        this.scoreSystem = new ScoreSystem();
        this.audioManager = new AudioManager();
        this.inputManager = new InputManager(canvas);
        this.sdkManager = new PlatformSDKManager();
        
        this.platforms = [];
        this.obstacles = [];
        this.collectibles = [];
        this.player = null;
        this.levelGenerator = null;
        
        this.spawnTimer = 0;
        this.spawnInterval = 1.5;
        
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
        
        // Setup initial platforms
        this.setupInitialPlatforms();
        
        // Setup systems
        this.setupSystems();
        
        // Setup input handlers
        this.setupInput();
        
        // Setup score listeners
        this.setupScoreListeners();
        
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

    setupSystems() {
        // Setup rendering system
        const renderingSystem = new RenderingSystem(this.engine.gl);
        renderingSystem.update = (deltaTime, entities) => this.updateGame(deltaTime);
        this.engine.registerSystem(renderingSystem);
    }

    setupInput() {
        this.inputManager.addEventListener('jump', () => {
            if (this.gameState.isPlaying()) {
                const jumped = this.player.jump();
                if (jumped) {
                    this.audioManager.playSound('jump');
                }
            } else if (this.gameState.isMenu() || this.gameState.isGameOver()) {
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
            this.audioManager.playSound('score');
        });
    }

    setupStateListeners() {
        this.gameState.addEventListener(GameStates.GAME_OVER, () => {
            this.onGameOver();
        });
    }

    updateGame(deltaTime) {
        if (!this.gameState.isPlaying()) return;

        // Update player
        this.player.update(deltaTime);
        
        // Update platforms, obstacles, collectibles
        this.updateEntities(deltaTime);
        
        // Check collisions
        this.checkCollisions();
        
        // Spawn new entities
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnNewPlatform();
            this.spawnTimer = 0;
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

    updateEntities(deltaTime) {
        const dims = this.engine.getCanvasDimensions();
        
        // Update platforms
        this.platforms = this.platforms.filter(platform => {
            platform.x += platform.velocity * deltaTime;
            return platform.x + platform.width > 0;
        });
        
        // Update obstacles
        this.obstacles = this.obstacles.filter(obstacle => {
            obstacle.x += obstacle.velocity * deltaTime;
            return obstacle.x + obstacle.width > 0;
        });
        
        // Update collectibles
        this.collectibles = this.collectibles.filter(collectible => {
            collectible.x += collectible.velocity * deltaTime;
            return collectible.x + collectible.radius > 0;
        });
    }

    checkCollisions() {
        // Reset grounded state - player must be on a platform to be grounded
        this.player.isGrounded = false;
        
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
                this.collectibles.splice(i, 1);
                this.scoreSystem.addCollectible();
                this.audioManager.playSound('collect');
            }
        }
    }

    spawnNewPlatform() {
        const platform = this.levelGenerator.generatePlatform();
        this.platforms.push(platform);
        
        // Maybe spawn obstacle
        if (this.levelGenerator.shouldGenerateObstacle()) {
            const obstacle = this.levelGenerator.generateObstacle(
                platform.x, platform.y, platform.width
            );
            this.obstacles.push(obstacle);
        }
        
        // Maybe spawn collectible
        if (this.levelGenerator.shouldGenerateCollectible()) {
            const collectible = this.levelGenerator.generateCollectible(
                platform.x, platform.y, platform.width
            );
            this.collectibles.push(collectible);
        }
    }

    updateRenderEntities() {
        this.engine.entities = [
            ...this.platforms,
            ...this.obstacles,
            ...this.collectibles,
            this.player
        ];
    }

    updateUI() {
        const stats = this.scoreSystem.getGameStats();
        const event = new CustomEvent('gameUpdate', { detail: stats });
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
        this.scoreSystem.reset();
        this.spawnTimer = 0;
        
        // Reset player
        const dims = this.engine.getCanvasDimensions();
        this.player.reset(100, dims.height / 2);
        
        // Reset level generator
        this.levelGenerator.lastPlatformX = 0;
        this.levelGenerator.lastPlatformY = 0;
        this.levelGenerator.setDifficulty(1);
        
        // Setup initial platforms
        this.setupInitialPlatforms();
        
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
        // Show leaderboard
        const leaderboard = await this.sdkManager.getLeaderboard();
        const event = new CustomEvent('showLeaderboard', { detail: leaderboard });
        window.dispatchEvent(event);
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
    }
}
