/**
 * UIManager - Centralized UI management with Chain of Responsibility
 * Coordinates all UI screens and buttons, delegating click handling
 */

import { IClickHandler } from '../core/interfaces.js';
import { GameStates } from '../core/GameState.js';

/**
 * Base UI click handler
 */
class UIClickHandler extends IClickHandler {
    constructor() {
        super();
        this.nextHandler = null;
    }

    handleClick(x, y, context) {
        // Try to handle, if not pass to next
        const handled = this._handle(x, y, context);
        if (handled) {
            return true;
        }
        
        if (this.nextHandler) {
            return this.nextHandler.handleClick(x, y, context);
        }
        
        return false;
    }

    _handle(x, y, context) {
        // To be implemented by subclasses
        return false;
    }
}

/**
 * Level Summary Screen click handler
 */
class LevelSummaryClickHandler extends UIClickHandler {
    _handle(x, y, context) {
        const { levelSummaryScreen, levelController, engine, stateMachine } = context;
        
        if (!levelSummaryScreen || !levelSummaryScreen.isVisible()) {
            return false;
        }

        const action = levelSummaryScreen.checkClick(x, y);
        
        if (action === 'next') {
            levelSummaryScreen.hide();
            const dims = engine.getCanvasDimensions();
            levelController.loadNextLevel(dims);
            stateMachine.transitionTo(GameStates.PLAYING, context);
            engine.start();
            return true;
        } else if (action === 'retry') {
            levelSummaryScreen.hide();
            const dims = engine.getCanvasDimensions();
            levelController.retryLevel(dims);
            stateMachine.transitionTo(GameStates.PLAYING, context);
            engine.start();
            return true;
        } else if (action === 'menu') {
            levelSummaryScreen.hide();
            stateMachine.transitionTo(GameStates.LEVEL_SELECT, context);
            return true;
        }
        
        return false;
    }
}

/**
 * Level Select Screen click handler
 */
class LevelSelectClickHandler extends UIClickHandler {
    _handle(x, y, context) {
        const { levelSelectScreen, levelController } = context;
        
        if (!levelSelectScreen || !levelSelectScreen.isVisible()) {
            return false;
        }

        const result = levelSelectScreen.checkClick(x, y);
        
        if (!result) {
            return false;
        }

        if (result.action === 'back') {
            levelSelectScreen.hide();
            context.stateMachine.handleInput('back', null, context);
            return true;
        } else if (result.action === 'play' || result.action === 'select') {
            levelSelectScreen.hide();
            // Notify state machine about level selection
            context.stateMachine.handleInput('selectLevel', { levelId: result.levelId }, context);
            return true;
        }
        
        return false;
    }
}

/**
 * Pause button click handler
 */
class PauseButtonClickHandler extends UIClickHandler {
    _handle(x, y, context) {
        const { renderingSystem, stateMachine, gameController } = context;
        
        if (!renderingSystem || !renderingSystem.hudRenderer) {
            return false;
        }

        const pauseClicked = renderingSystem.hudRenderer.checkPauseClick(x, y);
        
        if (pauseClicked) {
            if (stateMachine.isPlaying()) {
                gameController.pauseGame();
            } else if (stateMachine.isPaused()) {
                gameController.resumeGame();
            }
            return true;
        }
        
        return false;
    }
}

/**
 * Ability button click handler (Turbo/Flight)
 */
class AbilityButtonClickHandler extends UIClickHandler {
    _handle(x, y, context) {
        const { 
            turboButtonUI, 
            flightButtonUI, 
            player, 
            stateMachine,
            unlockedAbilities,
            audioManager,
            screenFlash
        } = context;

        if (!stateMachine.isPlaying()) {
            return false;
        }

        // Check turbo button
        if (turboButtonUI) {
            const shouldActivateTurbo = turboButtonUI.checkClick(x, y, player);
            if (shouldActivateTurbo) {
                if (!unlockedAbilities.turbo) {
                    console.log('🔒 Turbo locked! Unlocks at level 20');
                    return true;
                }
                
                const level = context.scoreSystem.getLevel();
                const activated = player.activateTurbo(level);
                if (activated) {
                    audioManager.playSound('turbo');
                    screenFlash.alpha = 0.3;
                    screenFlash.color = [1.0, 0.8, 0.0];
                }
                return true;
            }
        }

        // Check flight button
        if (flightButtonUI) {
            const shouldActivateFlight = flightButtonUI.checkClick(x, y, player);
            if (shouldActivateFlight) {
                if (!unlockedAbilities.flight) {
                    console.log('🔒 Flight locked! Unlocks at level 10');
                    return true;
                }
                
                const activated = player.activateFlight();
                if (activated) {
                    audioManager.playSound('flight');
                    screenFlash.alpha = 0.2;
                    screenFlash.color = [0.4, 0.8, 1.0];
                }
                return true;
            }
        }
        
        return false;
    }
}

/**
 * Flight movement click handler (up/down during flight)
 */
class FlightMovementClickHandler extends UIClickHandler {
    _handle(x, y, context) {
        const { player, engine } = context;
        
        if (!player.isFlightActive && !player.instantFlightActive) {
            return false;
        }

        const dims = engine.getCanvasDimensions();
        const middleY = dims.height / 2;
        
        if (y < middleY) {
            // Click upper half = move up
            if (player.isFlightActive) {
                player.flightMoveUp();
            } else {
                player.instantFlightMoveUp();
            }
        } else {
            // Click lower half = move down
            if (player.isFlightActive) {
                player.flightMoveDown();
            } else {
                player.instantFlightMoveDown();
            }
        }
        
        return true;
    }
}

/**
 * UIManager - Coordinates all UI components
 */
export class UIManager {
    constructor() {
        this.turboButtonUI = null;
        this.flightButtonUI = null;
        this.levelProgressBar = null;
        
        // Chain of Responsibility for click handling
        this.clickHandlerChain = this._buildClickHandlerChain();
    }

    /**
     * Build click handler chain
     * @private
     * @returns {UIClickHandler}
     */
    _buildClickHandlerChain() {
        const levelSummary = new LevelSummaryClickHandler();
        const levelSelect = new LevelSelectClickHandler();
        const pauseButton = new PauseButtonClickHandler();
        const abilityButtons = new AbilityButtonClickHandler();
        const flightMovement = new FlightMovementClickHandler();
        
        // Chain order (priority): summary → select → pause → abilities → flight movement
        levelSummary
            .setNext(levelSelect)
            .setNext(pauseButton)
            .setNext(abilityButtons)
            .setNext(flightMovement);
        
        return levelSummary;
    }

    /**
     * Set UI components
     */
    setComponents(components) {
        this.turboButtonUI = components.turboButtonUI;
        this.flightButtonUI = components.flightButtonUI;
        this.levelProgressBar = components.levelProgressBar;
    }

    /**
     * Handle click event through chain of responsibility
     * @param {number} x - Click X coordinate
     * @param {number} y - Click Y coordinate
     * @param {Object} context - Game context
     * @returns {boolean} - True if click was handled
     */
    handleClick(x, y, context) {
        return this.clickHandlerChain.handleClick(x, y, {
            ...context,
            uiManager: this,
            turboButtonUI: this.turboButtonUI,
            flightButtonUI: this.flightButtonUI
        });
    }

    /**
     * Update UI components
     * @param {number} deltaTime
     * @param {Object} context
     */
    update(deltaTime, context) {
        if (this.turboButtonUI) {
            this.turboButtonUI.update(deltaTime, context.player);
        }
        if (this.flightButtonUI) {
            this.flightButtonUI.update(deltaTime, context.player);
        }
        if (this.levelProgressBar && context.levelManager) {
            const currentLevel = context.levelManager.getCurrentLevel();
            if (currentLevel) {
                const totalPlatforms = currentLevel.platforms.length;
                const passedPlatforms = context.levelManager.platformsPassed;
                this.levelProgressBar.update(
                    deltaTime,
                    passedPlatforms,
                    totalPlatforms,
                    context.levelManager.currentLevelId
                );
            }
        }
    }

    /**
     * Resize UI components
     * @param {number} width
     * @param {number} height
     */
    resize(width, height) {
        if (this.turboButtonUI) {
            this.turboButtonUI.resize(width, height);
        }
        if (this.flightButtonUI) {
            this.flightButtonUI.resize(width, height);
        }
        if (this.levelProgressBar) {
            this.levelProgressBar.updateDimensions(width, height);
        }
    }

    /**
     * Pass UI components to rendering system
     * @param {RenderingSystem} renderingSystem
     */
    syncWithRenderer(renderingSystem) {
        renderingSystem.setTurboButton(this.turboButtonUI);
        renderingSystem.setFlightButton(this.flightButtonUI);
        renderingSystem.setLevelProgressBar(this.levelProgressBar);
    }
}
