/**
 * UIManager - Centralized UI management with Chain of Responsibility
 * Coordinates all UI screens and buttons, delegating click handling
 */

import { IClickHandler } from '../core/interfaces.js';

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
 * Turbo button click handler
 */
class TurboButtonClickHandler extends UIClickHandler {
    _handle(x, y, context) {
        if (!context.turboButtonUI) return false;

        const clicked = context.turboButtonUI.checkClick(x, y, context.player);
        if (clicked) {
            // Activate turbo via command mapper
            return context.gameController.inputCommandMapper.executeCommand('turbo', context);
        }
        return false;
    }
}

/**
 * Flight button click handler
 */
class FlightButtonClickHandler extends UIClickHandler {
    _handle(x, y, context) {
        if (!context.flightButtonUI) return false;

        const clicked = context.flightButtonUI.checkClick(x, y, context.player);
        if (clicked) {
            // Activate flight via command mapper
            return context.gameController.inputCommandMapper.executeCommand('flight', context);
        }
        return false;
    }
}

/**
 * Pause button click handler
 */
class PauseButtonClickHandler extends UIClickHandler {
    _handle(x, y, context) {
        if (!context.hudRenderer) return false;

        const clicked = context.hudRenderer.checkPauseClick(x, y);
        if (clicked) {
            // Toggle pause
            if (context.gameController.stateMachine.isPaused()) {
                context.gameController.resumeGame();
            } else if (context.gameController.stateMachine.isPlaying()) {
                context.gameController.pauseGame();
            }
            return true;
        }
        return false;
    }
}

/**
 * UIManager - Main class
 */
export class UIManager {
    constructor() {
        this.turboButtonUI = null;
        this.flightButtonUI = null;
        this.levelProgressBar = null;
        this.hudRenderer = null;

        // Chain of Responsibility for click handling
        this.clickHandlerChain = this._buildClickHandlerChain();
    }

    /**
     * Build click handler chain
     * @private
     */
    _buildClickHandlerChain() {
        const pauseHandler = new PauseButtonClickHandler();
        const turboHandler = new TurboButtonClickHandler();
        const flightHandler = new FlightButtonClickHandler();

        // Chain: Pause -> Turbo -> Flight
        pauseHandler.nextHandler = turboHandler;
        turboHandler.nextHandler = flightHandler;

        return pauseHandler;
    }
    /**
     * Set UI components
     */
    setComponents(components) {
        this.turboButtonUI = components.turboButtonUI;
        this.flightButtonUI = components.flightButtonUI;
        this.levelProgressBar = components.levelProgressBar;
        this.hudRenderer = components.hudRenderer;
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
            flightButtonUI: this.flightButtonUI,
            hudRenderer: this.hudRenderer
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
