/**
 * GameControllerBuilder - Builder Pattern for Dependency Injection
 * Constructs GameController with all dependencies injected
 * Eliminates tight coupling from "new XYZ()" instantiations
 * Enables testing with mock dependencies
 */

import { GameEngine } from './core/GameEngine.js';
import { GameState } from './core/GameState.js';
import { Player } from './entities/Player.js';
import { LevelManager } from './managers/LevelManager.js';
import { RenderingSystem } from './systems/RenderingSystem.js';
import { ScoreSystem } from './systems/ScoreSystem.js';
import { PowerupSystem } from './systems/PowerupSystem.js';
import { BackgroundSystem } from './systems/BackgroundSystem.js';
import { AchievementSystem } from './systems/AchievementSystem.js';
import { AudioManager } from './managers/AudioManager.js';
import { InputManager } from './managers/InputManager.js';
import { PlatformSDKManager } from './managers/PlatformSDKManager.js';
import { EntityManager } from './managers/EntityManager.js';
import { SafetyPlatformSystem } from './systems/SafetyPlatformSystem.js';
import { CollisionDetector } from './systems/CollisionDetector.js';
import { AnimationController } from './controllers/AnimationController.js';
import { ParticleSystem } from './effects/ParticleSystem.js';
import { TurboButtonUI } from './systems/TurboButtonUI.js';
import { FlightButtonUI } from './systems/FlightButtonUI.js';
import { LevelProgressBar } from './systems/LevelProgressBar.js';
import { AbilityUnlockAnimation } from './systems/AbilityUnlockAnimation.js';
import { SystemOrchestrator } from './core/SystemOrchestrator.js';
import { GameStateMachine } from './core/GameStateMachine.js';
import { UIManager } from './managers/UIManager.js';
import { InputCommandMapper } from './input/InputCommandMapper.js';
import { LevelOrchestrator } from './orchestrators/LevelOrchestrator.js';
import { GameController } from './ui/GameController.js';

/**
 * GameControllerBuilder - Fluent API for building GameController
 */
export class GameControllerBuilder {
    constructor(canvas) {
        this.canvas = canvas;
        
        // Dependencies to inject
        this.engine = null;
        this.gameState = null;
        this.player = null;
        this.levelManager = null;
        this.renderingSystem = null;
        this.scoreSystem = null;
        this.powerupSystem = null;
        this.backgroundSystem = null;
        this.achievementSystem = null;
        this.audioManager = null;
        this.inputManager = null;
        this.sdkManager = null;
        this.entityManager = null;
        this.safetyPlatformSystem = null;
        this.collisionDetector = null;
        this.animationController = null;
        this.particleSystem = null;
        this.turboButtonUI = null;
        this.flightButtonUI = null;
        this.levelProgressBar = null;
        this.abilityUnlockAnimation = null;
        
        // New components
        this.systemOrchestrator = null;
        this.stateMachine = null;
        this.uiManager = null;
        this.inputCommandMapper = null;
        this.levelOrchestrator = null;
    }

    /**
     * Build with default dependencies
     * Creates all components with standard configuration
     */
    withDefaults() {
        // Core systems - create engine first
        this.engine = new GameEngine(this.canvas);
        
        // Get logical dimensions from engine (after DPR handling)
        const dims = this.engine.getCanvasDimensions();
        const width = dims.width;
        const height = dims.height;
        
        this.gameState = new GameState();
        
        // Entities
        this.player = new Player(100, height / 2, height);
        this.player.type = 'player';
        
        // Managers
        this.levelManager = new LevelManager(width, height);
        this.audioManager = new AudioManager();
        this.inputManager = new InputManager(this.canvas);
        this.sdkManager = new PlatformSDKManager();
        this.entityManager = new EntityManager();
        
        // Systems
        this.renderingSystem = new RenderingSystem(this.engine.gl, width, height);
        this.scoreSystem = new ScoreSystem();
        this.powerupSystem = new PowerupSystem();
        this.backgroundSystem = new BackgroundSystem(width, height);
        this.achievementSystem = new AchievementSystem();
        this.safetyPlatformSystem = new SafetyPlatformSystem(dims, this.audioManager);
        this.animationController = new AnimationController();
        this.particleSystem = new ParticleSystem();
        
        // UI Components
        this.turboButtonUI = new TurboButtonUI(width, height);
        this.flightButtonUI = new FlightButtonUI(width, height);
        this.levelProgressBar = new LevelProgressBar(width, height);
        this.abilityUnlockAnimation = new AbilityUnlockAnimation();
        
        // Collision detector
        this.collisionDetector = new CollisionDetector(
            this.player,
            this.audioManager,
            this.achievementSystem,
            this.scoreSystem,
            this.particleSystem,
            this.animationController
        );
        this.collisionDetector.safetyPlatformSystem = this.safetyPlatformSystem;
        this.collisionDetector.levelManager = this.levelManager;
        
        // New orchestrators
        this.systemOrchestrator = new SystemOrchestrator();
        this.stateMachine = new GameStateMachine();
        this.uiManager = new UIManager();
        this.inputCommandMapper = new InputCommandMapper();
        this.levelOrchestrator = new LevelOrchestrator(
            this.levelManager,
            this.scoreSystem,
            this.entityManager,
            this.player,
            this.audioManager,
            this.animationController
        );
        
        // Configure UI Manager
        this.uiManager.setComponents({
            turboButtonUI: this.turboButtonUI,
            flightButtonUI: this.flightButtonUI,
            levelProgressBar: this.levelProgressBar
        });
        
        // Configure Level Orchestrator
        this.levelOrchestrator.setUIComponents({
            abilityUnlockAnimation: this.abilityUnlockAnimation,
            flightButtonUI: this.flightButtonUI,
            turboButtonUI: this.turboButtonUI,
            backgroundSystem: this.backgroundSystem
        });
        
        // Link EntityManager to LevelManager
        this.entityManager.setLevelManager(this.levelManager);
        
        return this;
    }

    /**
     * Override specific dependency (for testing or customization)
     */
    withEngine(engine) {
        this.engine = engine;
        return this;
    }

    withGameState(gameState) {
        this.gameState = gameState;
        return this;
    }

    withPlayer(player) {
        this.player = player;
        return this;
    }

    withAudioManager(audioManager) {
        this.audioManager = audioManager;
        return this;
    }

    withInputManager(inputManager) {
        this.inputManager = inputManager;
        return this;
    }

    // ... Add more withXYZ methods as needed for testing

    /**
     * Build GameController instance
     * @returns {GameController}
     */
    build() {
        // Validate required dependencies
        this._validate();
        
        return new GameController({
            canvas: this.canvas,
            engine: this.engine,
            gameState: this.gameState,
            player: this.player,
            levelManager: this.levelManager,
            renderingSystem: this.renderingSystem,
            scoreSystem: this.scoreSystem,
            powerupSystem: this.powerupSystem,
            backgroundSystem: this.backgroundSystem,
            achievementSystem: this.achievementSystem,
            audioManager: this.audioManager,
            inputManager: this.inputManager,
            sdkManager: this.sdkManager,
            entityManager: this.entityManager,
            safetyPlatformSystem: this.safetyPlatformSystem,
            collisionDetector: this.collisionDetector,
            animationController: this.animationController,
            particleSystem: this.particleSystem,
            turboButtonUI: this.turboButtonUI,
            flightButtonUI: this.flightButtonUI,
            levelProgressBar: this.levelProgressBar,
            abilityUnlockAnimation: this.abilityUnlockAnimation,
            systemOrchestrator: this.systemOrchestrator,
            stateMachine: this.stateMachine,
            uiManager: this.uiManager,
            inputCommandMapper: this.inputCommandMapper,
            levelOrchestrator: this.levelOrchestrator
        });
    }

    /**
     * Validate required dependencies are set
     * @private
     */
    _validate() {
        const required = [
            'engine', 'gameState', 'player', 'levelManager', 'audioManager',
            'inputManager', 'systemOrchestrator', 'stateMachine', 'uiManager',
            'inputCommandMapper', 'levelOrchestrator'
        ];
        
        for (const dep of required) {
            if (!this[dep]) {
                throw new Error(`Required dependency '${dep}' not set. Call withDefaults() or set manually.`);
            }
        }
    }

    /**
     * Async initialization after build
     * Initializes all async components
     */
    async initializeAsync() {
        // Initialize audio
        await this.audioManager.initialize();
        
        // Initialize SDK
        await this.sdkManager.initialize();
        
        // Initialize system orchestrator
        await this.systemOrchestrator.initialize();
        
        console.log('✅ GameController dependencies initialized');
    }
}

/**
 * Factory method - convenient shorthand
 */
export function createGameController(canvas) {
    const builder = new GameControllerBuilder(canvas);
    return builder.withDefaults();
}
