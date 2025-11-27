/**
 * GameStateMachine - State Pattern implementation
 * Manages game state transitions with explicit state objects
 * Each state handles its own logic and input
 */

import { IGameState } from '../core/interfaces.js';
import { GameStates } from '../core/GameState.js';

/**
 * Base game state
 */
class BaseGameState extends IGameState {
    constructor(name) {
        super();
        this.name = name;
    }

    getName() {
        return this.name;
    }

    enter(context) {
        console.log(`🎮 Entering state: ${this.name}`);
    }

    exit(context) {
        console.log(`🎮 Exiting state: ${this.name}`);
    }

    update(deltaTime, context) {
        // Default: no update logic
    }

    handleInput(action, data, context) {
        return false;
    }
}

/**
 * Menu state - Initial state before game starts
 */
class MenuState extends BaseGameState {
    constructor() {
        super(GameStates.MENU);
    }

    enter(context) {
        super.enter(context);
        context.audioManager?.playBackgroundMusic();
        context.gameController.showMenu();
    }

    handleInput(action, data, context) {
        if (action === 'start') {
            context.stateMachine.transitionTo(GameStates.LEVEL_SELECT);
            return true;
        }
        return false;
    }

    exit(context) {
        super.exit(context);
        context.audioManager?.stopBackgroundMusic();
    }
}

/**
 * Level Select state - Player choosing level
 */
class LevelSelectState extends BaseGameState {
    constructor() {
        super(GameStates.LEVEL_SELECT);
    }

    enter(context) {
        super.enter(context);

        // Stop engine - we're in HTML screen mode
        context.engine.stop();

        // Show HTML level select screen
        const event = new CustomEvent('showLevelSelect');
        window.dispatchEvent(event);
    }

    handleInput(action, data, context) {
        if (action === 'selectLevel') {
            const dims = context.engine.getCanvasDimensions();
            context.levelController.loadLevel(data.levelId, dims);
            context.stateMachine.transitionTo(GameStates.PLAYING, context);
            return true;
        } else if (action === 'back') {
            context.stateMachine.transitionTo(GameStates.MENU, context);
            return true;
        }
        return false;
    }
}

/**
 * Playing state - Active gameplay
 */
class PlayingState extends BaseGameState {
    constructor() {
        super(GameStates.PLAYING);
    }

    enter(context) {
        super.enter(context);
        context.engine.start();
        context.audioManager?.playBackgroundMusic();
        context.audioManager?.resume();

        // Emit game start event
        const event = new CustomEvent('gameStart');
        window.dispatchEvent(event);
    }

    update(deltaTime, context) {
        // Main game loop handled by GameController
        // State machine just coordinates transitions
    }

    handleInput(action, data, context) {
        if (action === 'pause') {
            context.audioManager?.playSound('pause');
            context.stateMachine.transitionTo(GameStates.PAUSED, context);
            return true;
        } else if (action === 'playerDied') {
            // Death sound già suonato in _startDeathSequence
            context.stateMachine.transitionTo(GameStates.GAME_OVER, context);
            return true;
        } else if (action === 'levelComplete') {
            context.audioManager?.playSound('victory');
            context.stateMachine.transitionTo(GameStates.LEVEL_SUMMARY, context);
            return true;
        }
        return false;
    }

    exit(context) {
        super.exit(context);
        context.audioManager?.stopBackgroundMusic();
    }
}

/**
 * Paused state - Game paused
 */
class PausedState extends BaseGameState {
    constructor() {
        super(GameStates.PAUSED);
    }

    enter(context) {
        super.enter(context);
        context.engine.stop();
        context.audioManager?.pause();

        // Show pause screen
        const pauseScreen = document.getElementById('pause-screen');
        if (pauseScreen) {
            pauseScreen.classList.add('active');
        }
    }

    handleInput(action, data, context) {
        if (action === 'resume') {
            context.audioManager?.playSound('resume');
            context.stateMachine.transitionTo(GameStates.PLAYING, context);
            return true;
        } else if (action === 'quit') {
            context.audioManager?.playSound('click');
            context.stateMachine.transitionTo(GameStates.MENU, context);
            return true;
        }
        return false;
    }

    exit(context) {
        super.exit(context);
        context.audioManager?.resume();

        // Hide pause screen
        const pauseScreen = document.getElementById('pause-screen');
        if (pauseScreen) {
            pauseScreen.classList.remove('active');
        }
    }
}

/**
 * Level Summary state - Showing level results
 */
class LevelSummaryState extends BaseGameState {
    constructor() {
        super(GameStates.LEVEL_SUMMARY);
    }

    enter(context) {
        super.enter(context);
        context.engine.stop();

        // Reset all active effects
        context.powerupSystem.reset();
        context.levelController.resetPlayerEffects();

        // Get summary data
        const summary = context.levelManager.getLevelSummary();
        summary.score = context.scoreSystem.getScore();

        // Show HTML level summary screen
        const event = new CustomEvent('showLevelSummary', { detail: summary });
        window.dispatchEvent(event);

        // Play sound based on stars
        if (summary.stars === 3) {
            context.audioManager?.playSound('score');
        } else {
            context.audioManager?.playSound('score');
        }
    }

    handleInput(action, data, context) {
        if (action === 'nextLevel') {
            const dims = context.engine.getCanvasDimensions();
            context.levelController.loadNextLevel(dims);
            context.stateMachine.transitionTo(GameStates.PLAYING, context);
            return true;
        } else if (action === 'retryLevel') {
            const dims = context.engine.getCanvasDimensions();
            context.levelController.retryLevel(dims);
            context.stateMachine.transitionTo(GameStates.PLAYING, context);
            return true;
        } else if (action === 'backToMenu') {
            context.stateMachine.transitionTo(GameStates.LEVEL_SELECT);
            return true;
        }
        return false;
    }
}

/**
 * Game Over state - Player died
 */
class GameOverState extends BaseGameState {
    constructor() {
        super(GameStates.GAME_OVER);
    }

    async enter(context) {
        super.enter(context);

        // Stop audio
        context.audioManager.stopBackgroundMusic();

        // Submit score
        const stats = context.scoreSystem.getGameStats();
        stats.level = context.levelManager.currentLevelId || 1;
        await context.sdkManager.submitScore(stats.score).then(() => {
            console.log('Score submitted successfully');
        }).catch((error) => {
            console.error('Error submitting score:', error);
        }).then(() => {
            // Send to SDK - grant XP every game
            if (typeof PlatformSDK !== 'undefined') {
                try {
                    context.sdkManager.gameOver(stats.score, {
                        level: stats.level,
                        coins: stats.coins,
                        score: stats.score,
                        time: Date.now() 
                    });
                    console.log(`📡 Game over sent to SDK: score=${stats.score}`);

                } catch (e) {
                    console.error('⚠️ Failed to send game over to SDK:', e);
                }
            }
        });


        // Reset total score
        context.scoreSystem.fullReset();

        // Emit game over event
        const event = new CustomEvent('gameOver', { detail: stats });
        window.dispatchEvent(event);
    }

    handleInput(action, data, context) {
        if (action === 'retry') {
            const dims = context.engine.getCanvasDimensions();
            context.levelController.retryLevel(dims);
            context.stateMachine.transitionTo(GameStates.PLAYING, context);
            return true;
        } else if (action === 'menu') {
            context.stateMachine.transitionTo(GameStates.MENU, context);
            return true;
        }
        return false;
    }
}

/**
 * GameStateMachine - Manages state transitions
 */
export class GameStateMachine {
    constructor() {
        /** @type {Map<string, IGameState>} */
        this.states = new Map();

        /** @type {IGameState} */
        this.currentState = null;

        /** @type {string} */
        this.currentStateName = null;

        this._registerStates();
    }

    /**
     * Register all available states
     * @private
     */
    _registerStates() {
        this.registerState(new MenuState());
        this.registerState(new LevelSelectState());
        this.registerState(new PlayingState());
        this.registerState(new PausedState());
        this.registerState(new LevelSummaryState());
        this.registerState(new GameOverState());
    }

    /**
     * Register a state
     * @param {IGameState} state
     */
    registerState(state) {
        this.states.set(state.getName(), state);
    }

    /**
     * Transition to new state
     * @param {string} stateName - Target state name
     * @param {Object} context - Game context
     */
    transitionTo(stateName, context) {
        const newState = this.states.get(stateName);

        if (!newState) {
            console.error(`State '${stateName}' not found`);
            return;
        }

        // Exit current state
        if (this.currentState) {
            this.currentState.exit(context);
        }

        // Enter new state
        this.currentState = newState;
        this.currentStateName = stateName;
        this.currentState.enter(context);
    }

    /**
     * Update current state
     * @param {number} deltaTime
     * @param {Object} context
     */
    update(deltaTime, context) {
        if (this.currentState) {
            this.currentState.update(deltaTime, context);
        }
    }

    /**
     * Handle input in current state
     * @param {string} action - Input action
     * @param {*} data - Input data
     * @param {Object} context - Game context
     * @returns {boolean} - True if input was handled
     */
    handleInput(action, data, context) {
        if (this.currentState) {
            return this.currentState.handleInput(action, data, {
                ...context,
                stateMachine: this
            });
        }
        return false;
    }

    /**
     * Get current state name
     * @returns {string}
     */
    getCurrentStateName() {
        return this.currentStateName;
    }

    /**
     * Check if in specific state
     * @param {string} stateName
     * @returns {boolean}
     */
    isInState(stateName) {
        return this.currentStateName === stateName;
    }

    /**
     * Check if currently playing
     * @returns {boolean}
     */
    isPlaying() {
        return this.currentStateName === GameStates.PLAYING;
    }

    /**
     * Check if currently paused
     * @returns {boolean}
     */
    isPaused() {
        return this.currentStateName === GameStates.PAUSED;
    }

    /**
     * Get all registered state names
     * @returns {string[]}
     */
    getStateNames() {
        return Array.from(this.states.keys());
    }
}

// Add LEVEL_SELECT and LEVEL_SUMMARY to GameStates if not present
if (!GameStates.LEVEL_SELECT) {
    GameStates.LEVEL_SELECT = 'LEVEL_SELECT';
}
if (!GameStates.LEVEL_SUMMARY) {
    GameStates.LEVEL_SUMMARY = 'LEVEL_SUMMARY';
}
