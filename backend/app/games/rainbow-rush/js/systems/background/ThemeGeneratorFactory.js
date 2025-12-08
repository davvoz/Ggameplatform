import { THEME_NAMES } from './ThemeConfigurations.js';

/**
 * Factory for creating theme generators with LAZY LOADING
 * Follows Factory Pattern and Open/Closed Principle
 * Dynamically imports generators only when needed for FAST startup
 */
export class ThemeGeneratorFactory {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.generators = new Map();
        this.generatorPromises = new Map();
        this.setupLazyLoaders();
    }

    setupLazyLoaders() {
        // Map theme names to their module paths
        this.lazyModules = {
            [THEME_NAMES.SKY]: () => import('./themes/SkyThemeGenerator.js'),
            [THEME_NAMES.OCEAN]: () => import('./themes/OceanThemeGenerator.js'),
            [THEME_NAMES.VOLCANO]: () => import('./themes/VolcanoThemeGenerator.js'),
            [THEME_NAMES.SPACE]: () => import('./themes/SpaceThemeGenerator.js'),
            // Additional themes will be loaded only if used
        };
        
        // Pre-load only the first theme (SKY) for instant startup
        this.preloadTheme(THEME_NAMES.SKY);
    }

    async preloadTheme(themeName) {
        if (!this.lazyModules[themeName]) return;
        
        try {
            const module = await this.lazyModules[themeName]();
            const GeneratorClass = Object.values(module)[0];
            const generator = new GeneratorClass(this.canvasWidth, this.canvasHeight);
            this.generators.set(themeName, generator);
        } catch (error) {
            console.error(`Failed to preload theme ${themeName}:`, error);
        }
    }

    /**
     * Register a theme generator
     * @param {BaseThemeGenerator} generator - Generator instance
     */
    registerGenerator(generator) {
        if (!generator.generate || !generator.getThemeName) {
            throw new Error('Invalid generator: must implement generate() and getThemeName()');
        }
        this.generators.set(generator.getThemeName(), generator);
    }

    /**
     * Get generator for specific theme (with lazy loading)
     * @param {string} themeName - Name of theme
     * @returns {Promise<BaseThemeGenerator|null>} Generator or null if not found
     */
    async getGenerator(themeName) {
        // Return if already loaded
        if (this.generators.has(themeName)) {
            return this.generators.get(themeName);
        }
        
        // Check if loading is in progress
        if (this.generatorPromises.has(themeName)) {
            return this.generatorPromises.get(themeName);
        }
        
        // Start lazy loading
        if (this.lazyModules[themeName]) {
            const promise = this.loadGenerator(themeName);
            this.generatorPromises.set(themeName, promise);
            return promise;
        }
        
        return null;
    }

    async loadGenerator(themeName) {
        try {
            const module = await this.lazyModules[themeName]();
            const GeneratorClass = Object.values(module)[0];
            const generator = new GeneratorClass(this.canvasWidth, this.canvasHeight);
            this.generators.set(themeName, generator);
            this.generatorPromises.delete(themeName);
            return generator;
        } catch (error) {
            console.error(`Failed to load theme generator ${themeName}:`, error);
            this.generatorPromises.delete(themeName);
            return null;
        }
    }

    /**
     * Generate theme data (async with lazy loading)
     * @param {string} themeName - Name of theme
     * @returns {Promise<Object|null>} Theme data or null if theme not found
     */
    async generateTheme(themeName) {
        const generator = await this.getGenerator(themeName);
        if (!generator) {
            console.warn(`No generator found for theme: ${themeName}`);
            return null;
        }
        return generator.generate();
    }

    /**
     * Check if theme is supported
     * @param {string} themeName - Name of theme
     * @returns {boolean} True if theme is supported
     */
    hasTheme(themeName) {
        return this.generators.has(themeName) || this.lazyModules[themeName] !== undefined;
    }

    /**
     * Get list of all available themes
     * @returns {Array<string>} Array of theme names
     */
    getAvailableThemes() {
        return Object.keys(this.lazyModules);
    }

    /**
     * Update canvas dimensions for all loaded generators
     * @param {number} width - New canvas width
     * @param {number} height - New canvas height
     */
    updateDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        
        // Update dimensions for already loaded generators
        for (const generator of this.generators.values()) {
            generator.canvasWidth = width;
            generator.canvasHeight = height;
        }
    }
}
