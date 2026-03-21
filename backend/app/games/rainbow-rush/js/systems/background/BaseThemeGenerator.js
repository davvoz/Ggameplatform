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
        
        // Automatically assign parallax speeds to all layers
        this.assignParallaxSpeeds(layers);

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

    /**
     * Assign parallax speed to layers based on their type and depth
     * Layers further back move slower for parallax effect
     * @param {Array} layers - Array of layer objects
     */
    assignParallaxSpeeds(layers) {
        // Default parallax speeds by layer type (lower = slower = further back)
        const parallaxConfig = {
            'sky_gradient': 0.0,    // Background, no movement
            'ground': 1.0,          // Foreground, full speed
            'wave': 0.3,            // Far background
            'dune': 0.4,            // Mid background
            'simple_shape': 0.5,    // Variable depth
            'tree': 0.6,            // Mid-foreground
            'pyramid': 0.5,         // Mid-background
            'seaweed': 0.4,         // Background decoration
            'sunray': 0.08,         // Very far, subtle movement
            'volcano': 0.5,         // Mid-background
            'lava_flow': 0.7,       // Foreground
            'mountain': 0.3,        // Far background
            'vegetation': 0.6,      // Mid-foreground
            'aurora_wave': 0.2,     // Far sky effect
            'crystal': 0.5,         // Variable depth
            'mushroom': 0.6,        // Mid-foreground
            'building': 0.7,        // Foreground
            'sun': 0.05,            // Very far, barely moves
            'moon': 0.05,           // Very far, barely moves
            'planet': 0.06,         // Very far, barely moves
            'nebula': 0.04,         // Extremely far
            'celestial': 0.05       // Generic celestial
        };

        layers.forEach((layer, index) => {
            if (!layer.hasOwnProperty('parallaxSpeed')) {
                // Priority order:
                // 1. If layer has explicit speed property (and not 0), convert it
                // 2. Use type-based configuration
                // 3. Calculate based on index
                
                if (layer.speed !== undefined && layer.speed > 0) {
                    // Convert old speed to parallaxSpeed (normalize between 0-1)
                    // Higher speed = closer layer = higher parallaxSpeed
                    layer.parallaxSpeed = Math.min(1.0, layer.speed / 10.0);
                } else if (parallaxConfig.hasOwnProperty(layer.type)) {
                    layer.parallaxSpeed = parallaxConfig[layer.type];
                } else {
                    // Default based on index (later layers = closer = faster)
                    layer.parallaxSpeed = 0.3 + (index / layers.length) * 0.7;
                }
                
                // Special case: if speed was explicitly 0, override to static
                if (layer.speed === 0) {
                    layer.parallaxSpeed = 0.0;
                }
            }
            
            // Initialize offset if not present
            if (!layer.hasOwnProperty('offset')) {
                layer.offset = 0;
            }
        });
    }
}
