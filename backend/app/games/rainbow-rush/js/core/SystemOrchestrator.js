/**
 * SystemOrchestrator - Coordinates update, reset, and resize for all game systems
 * Implements lifecycle management with priority-based execution
 * Reduces complexity from GameController by centralizing system coordination
 */

import { ISystem } from './interfaces.js';

export class SystemOrchestrator {
    constructor() {
        /** @type {Map<string, ISystem>} */
        this.systems = new Map();
        
        /** @type {ISystem[]} */
        this.sortedSystems = [];
        
        this.initialized = false;
    }

    /**
     * Register a system
     * @param {string} name - System identifier
     * @param {ISystem} system - System instance
     */
    registerSystem(name, system) {
        if (this.systems.has(name)) {

        }
        
        this.systems.set(name, system);
        this._sortSystems();
    }

    /**
     * Get system by name
     * @param {string} name - System identifier
     * @returns {ISystem|undefined}
     */
    getSystem(name) {
        return this.systems.get(name);
    }

    /**
     * Remove system
     * @param {string} name - System identifier
     */
    unregisterSystem(name) {
        this.systems.delete(name);
        this._sortSystems();
    }

    /**
     * Sort systems by priority (lower = earlier execution)
     * @private
     */
    _sortSystems() {
        this.sortedSystems = Array.from(this.systems.values())
            .sort((a, b) => a.getPriority() - b.getPriority());
    }

    /**
     * Initialize all systems
     * @returns {Promise<void>}
     */
    async initialize() {
        const promises = [];
        
        for (const [name, system] of this.systems) {
            if (typeof system.initialize === 'function') {
                promises.push(
                    system.initialize().catch(err => {
                        console.error(`Failed to initialize system '${name}':`, err);
                    })
                );
            }
        }
        
        await Promise.all(promises);
        this.initialized = true;

    }

    /**
     * Update all systems in priority order
     * @param {number} deltaTime - Time elapsed since last update
     * @param {Object} context - Game context with shared state
     */
    update(deltaTime, context) {
        for (const system of this.sortedSystems) {
            try {
                system.update(deltaTime, context);
            } catch (err) {
                console.error(`Error updating system:`, err);
            }
        }
    }

    /**
     * Reset all systems to initial state
     */
    reset() {
        for (const [name, system] of this.systems) {
            try {
                system.reset();
            } catch (err) {
                console.error(`Error resetting system '${name}':`, err);
            }
        }

    }

    /**
     * Update dimensions for all systems
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    resize(width, height) {
        for (const [name, system] of this.systems) {
            try {
                if (typeof system.updateDimensions === 'function') {
                    system.updateDimensions(width, height);
                }
            } catch (err) {
                console.error(`Error resizing system '${name}':`, err);
            }
        }

    }

    /**
     * Get all registered system names
     * @returns {string[]}
     */
    getSystemNames() {
        return Array.from(this.systems.keys());
    }

    /**
     * Check if system is registered
     * @param {string} name - System identifier
     * @returns {boolean}
     */
    hasSystem(name) {
        return this.systems.has(name);
    }

    /**
     * Get system count
     * @returns {number}
     */
    getSystemCount() {
        return this.systems.size;
    }

    /**
     * Dispose all systems
     */
    dispose() {
        for (const [name, system] of this.systems) {
            if (typeof system.dispose === 'function') {
                try {
                    system.dispose();
                } catch (err) {
                    console.error(`Error disposing system '${name}':`, err);
                }
            }
        }
        this.systems.clear();
        this.sortedSystems = [];
        this.initialized = false;
    }
}
