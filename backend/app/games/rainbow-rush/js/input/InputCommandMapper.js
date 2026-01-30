/**
 * Input Command System - Implements Command Pattern
 * Maps input events to executable command objects
 * Eliminates hardcoded if/else chains and enables testable, extensible input handling
 */

import { ICommand } from '../core/interfaces.js';

/**
 * Base command class
 */
export class GameCommand extends ICommand {
    constructor() {
        super();
    }

    execute(context) {
        throw new Error('GameCommand.execute() must be implemented');
    }

    canExecute(context) {
        return context.stateMachine && context.stateMachine.isPlaying();
    }
}

/**
 * Jump command
 */
export class JumpCommand extends GameCommand {
    execute(context) {
        const { player, audioManager, achievementSystem } = context;
        const jumped = player.jump();
        if (jumped) {
            audioManager.playSound('jump');
            achievementSystem.recordJump();
        }
        return jumped;
    }

    canExecute(context) {
        return context.player && context.stateMachine;
    }
}

/**
 * Jump release command (variable height jump)
 */
export class JumpReleaseCommand extends GameCommand {
    constructor(duration) {
        super();
        this.duration = duration;
    }

    canExecute(context) {
        // Allow jump release anytime player exists (not just when playing)
        return context.player != null;
    }

    execute(context) {
        context.player.releaseJump(this.duration);
    }
}

/**
 * Activate turbo command
 */
export class ActivateTurboCommand extends GameCommand {
    execute(context) {
        const { player, audioManager, scoreSystem, unlockedAbilities, screenFlash } = context;
        
        // Check if turbo is unlocked
        if (!unlockedAbilities.turbo) {

            return false;
        }
        
        const level = scoreSystem.getLevel();
        const activated = player.activateTurbo(level);
        
        if (activated) {
            audioManager.playSound('turbo');
            screenFlash.alpha = 0.3;
            screenFlash.color = [1.0, 0.8, 0.0];
        }
        
        return activated;
    }
    
    canExecute(context) {
        return context.player && context.stateMachine && context.stateMachine.isPlaying();
    }
}

/**
 * Activate flight command
 */
export class ActivateFlightCommand extends GameCommand {
    execute(context) {
        const { player, audioManager, unlockedAbilities, screenFlash } = context;
        
        // Check if flight is unlocked
        if (!unlockedAbilities.flight) {

            return false;
        }
        
        const activated = player.activateFlight();
        
        if (activated) {
            audioManager.playSound('flight');
            screenFlash.alpha = 0.2;
            screenFlash.color = [0.4, 0.8, 1.0];
        }
        
        return activated;
    }
    
    canExecute(context) {
        return context.player && context.stateMachine && context.stateMachine.isPlaying();
    }
}

/**
 * Flight move up command
 */
export class FlightMoveUpCommand extends GameCommand {
    execute(context) {
        const { player } = context;
        if (player.isFlightActive) {
            player.flightMoveUp();
        } else if (player.instantFlightActive) {
            player.instantFlightMoveUp();
        }
    }

    canExecute(context) {
        return context.player && 
               (context.player.isFlightActive || context.player.instantFlightActive);
    }
}

/**
 * Flight move down command
 */
export class FlightMoveDownCommand extends GameCommand {
    execute(context) {
        const { player } = context;
        if (player.isFlightActive) {
            player.flightMoveDown();
        } else if (player.instantFlightActive) {
            player.instantFlightMoveDown();
        }
    }

    canExecute(context) {
        return context.player && 
               (context.player.isFlightActive || context.player.instantFlightActive);
    }
}

/**
 * Pause game command
 */
export class PauseGameCommand extends ICommand {
    execute(context) {
        context.gameController.pauseGame();
    }

    canExecute(context) {
        return context.stateMachine && context.stateMachine.isPlaying();
    }
}

/**
 * Resume game command
 */
export class ResumeGameCommand extends ICommand {
    execute(context) {
        context.gameController.resumeGame();
    }

    canExecute(context) {
        return context.stateMachine && context.stateMachine.isPaused();
    }
}

/**
 * InputCommandMapper - Maps input events to commands
 */
export class InputCommandMapper {
    constructor() {
        /** @type {Map<string, ICommand>} */
        this.commandMap = new Map();
        
        this._setupDefaultMappings();
    }

    /**
     * Setup default input-to-command mappings
     * @private
     */
    _setupDefaultMappings() {
        // Keyboard mappings
        this.commandMap.set('jump', new JumpCommand());
        this.commandMap.set('jumpRelease', new JumpReleaseCommand(0)); // Placeholder, actual duration passed at execution
        this.commandMap.set('turbo', new ActivateTurboCommand());
        this.commandMap.set('flight', new ActivateFlightCommand());
        this.commandMap.set('flightUp', new FlightMoveUpCommand());
        this.commandMap.set('flightDown', new FlightMoveDownCommand());
        this.commandMap.set('pause', new PauseGameCommand());
        this.commandMap.set('resume', new ResumeGameCommand());
    }

    /**
     * Map custom command to input action
     * @param {string} action - Input action name
     * @param {ICommand} command - Command instance
     */
    mapCommand(action, command) {
        this.commandMap.set(action, command);
    }

    /**
     * Execute command for input action
     * @param {string} action - Input action name
     * @param {Object} context - Game context
     * @param {*} data - Optional command data
     * @returns {boolean} - True if command was executed
     */
    executeCommand(action, context, data = null) {
        const command = this.commandMap.get(action);
        
        if (!command) {

            return false;
        }

        // Create command with data if needed (e.g., JumpReleaseCommand)
        let commandToExecute = command;
        if (action === 'jumpRelease' && data) {
            commandToExecute = new JumpReleaseCommand(data);
        }

        if (!commandToExecute.canExecute(context)) {
            return false;
        }

        try {
            commandToExecute.execute(context);
            return true;
        } catch (err) {
            console.error(`Error executing command for '${action}':`, err);
            return false;
        }
    }

    /**
     * Check if command can be executed
     * @param {string} action - Input action name
     * @param {Object} context - Game context
     * @returns {boolean}
     */
    canExecute(action, context) {
        const command = this.commandMap.get(action);
        return command ? command.canExecute(context) : false;
    }

    /**
     * Get all mapped actions
     * @returns {string[]}
     */
    getMappedActions() {
        return Array.from(this.commandMap.keys());
    }

    /**
     * Remove command mapping
     * @param {string} action - Input action name
     */
    unmapCommand(action) {
        this.commandMap.delete(action);
    }

    /**
     * Clear all command mappings
     */
    clear() {
        this.commandMap.clear();
    }
}
