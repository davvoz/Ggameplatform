/**
 * Core Interfaces for SOLID Architecture
 * Defines contracts for all major components
 */

/**
 * Base interface for all updateable components
 * @interface IUpdateable
 */
export class IUpdateable {
    /**
     * Update component state
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        throw new Error('IUpdateable.update() must be implemented');
    }
}

/**
 * Base interface for all systems
 * Systems are stateless processors that operate on data
 * @interface ISystem
 */
export class ISystem extends IUpdateable {
    /**
     * Initialize the system
     * @returns {Promise<void>}
     */
    async initialize() {
        // Optional - default no-op
    }

    /**
     * Reset system to initial state
     */
    reset() {
        throw new Error('ISystem.reset() must be implemented');
    }

    /**
     * Update system dimensions for responsive design
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    updateDimensions(width, height) {
        // Optional - default no-op
    }

    /**
     * Get system priority for update order (lower = earlier)
     * @returns {number}
     */
    getPriority() {
        return 100; // Default medium priority
    }
}

/**
 * Base interface for all managers
 * Managers coordinate systems and maintain state
 * @interface IManager
 */
export class IManager {
    /**
     * Initialize the manager
     * @returns {Promise<void>}
     */
    async initialize() {
        throw new Error('IManager.initialize() must be implemented');
    }

    /**
     * Cleanup manager resources
     */
    dispose() {
        // Optional - default no-op
    }
}

/**
 * Interface for resizable components
 * @interface IResizable
 */
export class IResizable {
    /**
     * Handle resize event
     * @param {number} width - New width
     * @param {number} height - New height
     */
    resize(width, height) {
        throw new Error('IResizable.resize() must be implemented');
    }
}

/**
 * Interface for command objects (Command Pattern)
 * @interface ICommand
 */
export class ICommand {
    /**
     * Execute the command
     * @param {Object} context - Execution context
     */
    execute(context) {
        throw new Error('ICommand.execute() must be implemented');
    }

    /**
     * Check if command can be executed
     * @param {Object} context - Execution context
     * @returns {boolean}
     */
    canExecute(context) {
        return true; // Default: always executable
    }
}

/**
 * Interface for UI click handlers (Chain of Responsibility)
 * @interface IClickHandler
 */
export class IClickHandler {
    /**
     * Handle click event
     * @param {number} x - Click X coordinate
     * @param {number} y - Click Y coordinate
     * @param {Object} context - Game context
     * @returns {boolean} - True if click was handled
     */
    handleClick(x, y, context) {
        throw new Error('IClickHandler.handleClick() must be implemented');
    }

    /**
     * Set next handler in chain
     * @param {IClickHandler} handler
     */
    setNext(handler) {
        this.nextHandler = handler;
        return handler;
    }
}

/**
 * Interface for game states (State Pattern)
 * @interface IGameState
 */
export class IGameState {
    /**
     * Enter this state
     * @param {Object} context - Game context
     */
    enter(context) {
        // Optional - default no-op
    }

    /**
     * Exit this state
     * @param {Object} context - Game context
     */
    exit(context) {
        // Optional - default no-op
    }

    /**
     * Update state logic
     * @param {number} deltaTime
     * @param {Object} context - Game context
     */
    update(deltaTime, context) {
        // Optional - default no-op
    }

    /**
     * Handle input in this state
     * @param {string} action - Input action
     * @param {Object} data - Input data
     * @param {Object} context - Game context
     * @returns {boolean} - True if input was handled
     */
    handleInput(action, data, context) {
        return false; // Default: not handled
    }

    /**
     * Get state name
     * @returns {string}
     */
    getName() {
        throw new Error('IGameState.getName() must be implemented');
    }
}

/**
 * Interface for event emitters
 * @interface IEventEmitter
 */
export class IEventEmitter {
    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    addEventListener(event, callback) {
        throw new Error('IEventEmitter.addEventListener() must be implemented');
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    removeEventListener(event, callback) {
        throw new Error('IEventEmitter.removeEventListener() must be implemented');
    }

    /**
     * Emit event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        throw new Error('IEventEmitter.emit() must be implemented');
    }
}
