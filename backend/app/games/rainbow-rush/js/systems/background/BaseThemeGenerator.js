/**
 * Base class for theme generators
 * Implements Template Method Pattern
 * Each theme generator is responsible for creating layers and particles for a specific theme
 */
export class BaseThemeGenerator {
    constructor(canvasWidth, canvasHeight) {
        if (new.target === BaseThemeGenerator) {
            throw new TypeError('Cannot construct BaseThemeGenerator instances directly');
        }
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    /**
     * Template method - defines the algorithm structure
     * @returns {Object} Object containing layers, particles, and baseColors
     */
    generate() {
        const layers = [];
        const particles = [];
        const baseColors = this.getBaseColors();

        this.generateLayers(layers);
        this.generateParticles(particles);

        return {
            layers,
            particles,
            baseColors
        };
    }

    /**
     * Abstract method - must be implemented by subclasses
     * @returns {Array} Base colors for gradient
     */
    getBaseColors() {
        throw new Error('Method getBaseColors() must be implemented');
    }

    /**
     * Abstract method - must be implemented by subclasses
     * @param {Array} layers - Array to populate with layer objects
     */
    generateLayers(layers) {
        throw new Error('Method generateLayers() must be implemented');
    }

    /**
     * Abstract method - must be implemented by subclasses
     * @param {Array} particles - Array to populate with particle objects
     */
    generateParticles(particles) {
        throw new Error('Method generateParticles() must be implemented');
    }

    /**
     * Abstract method - returns theme name
     * @returns {string} Theme name
     */
    getThemeName() {
        throw new Error('Method getThemeName() must be implemented');
    }

    // ========================================================================
    // Helper methods available to all theme generators
    // ========================================================================

    /**
     * Generate random position within canvas
     * @param {number} marginX - Horizontal margin
     * @param {number} marginY - Vertical margin
     * @returns {Object} Object with x, y coordinates
     */
    randomPosition(marginX = 0, marginY = 0) {
        return {
            x: marginX + Math.random() * (this.canvasWidth - 2 * marginX),
            y: marginY + Math.random() * (this.canvasHeight - 2 * marginY)
        };
    }

    /**
     * Generate random value in range
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random value
     */
    randomInRange(min, max) {
        return min + Math.random() * (max - min);
    }

    /**
     * Generate random integer in range
     * @param {number} min - Minimum value (inclusive)
     * @param {number} max - Maximum value (inclusive)
     * @returns {number} Random integer
     */
    randomIntInRange(min, max) {
        return Math.floor(this.randomInRange(min, max + 1));
    }

    /**
     * Generate random color variation
     * @param {Array} baseColor - Base RGBA color
     * @param {number} variation - Variation amount (0-1)
     * @returns {Array} New color with variation
     */
    colorVariation(baseColor, variation = 0.2) {
        return [
            Math.max(0, Math.min(1, baseColor[0] + (Math.random() - 0.5) * variation)),
            Math.max(0, Math.min(1, baseColor[1] + (Math.random() - 0.5) * variation)),
            Math.max(0, Math.min(1, baseColor[2] + (Math.random() - 0.5) * variation)),
            baseColor[3]
        ];
    }

    /**
     * Create cloud puffs structure
     * @param {number} numPuffs - Number of puffs
     * @param {number} baseSize - Base size of cloud
     * @returns {Array} Array of puff objects
     */
    createCloudPuffs(numPuffs, baseSize) {
        const puffs = [];
        for (let j = 0; j < numPuffs; j++) {
            puffs.push({
                offsetX: (j - numPuffs / 2) * (baseSize * 0.5) + (Math.random() - 0.5) * 20,
                offsetY: (Math.random() - 0.5) * 15,
                radius: baseSize * (0.4 + Math.random() * 0.4)
            });
        }
        return puffs;
    }

    /**
     * Calculate Y position for ground-level objects
     * @param {number} heightRatio - Ratio of canvas height (0-1)
     * @returns {number} Y coordinate
     */
    getGroundY(heightRatio = 0.8) {
        return this.canvasHeight * heightRatio;
    }

    /**
     * Calculate Y position for sky-level objects
     * @param {number} heightRatio - Ratio of canvas height (0-1)
     * @returns {number} Y coordinate
     */
    getSkyY(heightRatio = 0.3) {
        return this.canvasHeight * heightRatio;
    }
}
