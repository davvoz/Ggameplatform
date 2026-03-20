import { BaseThemeGenerator } from '../BaseThemeGenerator.js';
import { FOREST_THEME_CONFIG, THEME_NAMES } from '../ThemeConfigurations.js';

/**
 * Forest Theme Generator
 * Single Responsibility: Generate forest theme with trees, fireflies, and falling leaves
 */
export class ForestThemeGenerator extends BaseThemeGenerator {
    getThemeName() {
        return THEME_NAMES.FOREST;
    }

    getBaseColors() {
        return FOREST_THEME_CONFIG.BASE_COLORS;
    }

    generateLayers(layers) {
        this.generateSkyGradient(layers);
        this.generateTrees(layers);
        this.generateGround(layers);
    }

    generateParticles(particles) {
        this.generateFireflies(particles);
        this.generateLeaves(particles);
    }

    generateSkyGradient(layers) {
        layers.push({
            y: 0,
            height: this.canvasHeight * 0.6,
            color: [0.4, 0.6, 0.8, 1.0],
            type: 'sky_gradient',
            speed: 0
        });
    }

    generateGround(layers) {
        const groundY = this.getGroundY(0.85);
        layers.push({
            y: groundY,
            height: this.canvasHeight - groundY,
            color: [0.2, 0.4, 0.2, 1.0],
            type: 'ground',
            speed: 0
        });
    }

    generateTrees(layers) {
        const config = FOREST_THEME_CONFIG;
        const groundY = this.getGroundY(0.85);

        for (let i = 0; i < config.TREE_COUNT; i++) {
            const width = this.randomInRange(config.TREE_MIN_WIDTH, config.TREE_MAX_WIDTH);
            const height = this.randomInRange(config.TREE_MIN_HEIGHT, config.TREE_MAX_HEIGHT);
            const x = (i + 0.5) * this.canvasWidth / config.TREE_COUNT;

            layers.push({
                x,
                y: groundY - height,
                width,
                height,
                color: [0.2 + window.randomSecure() * 0.1, 0.3 + window.randomSecure() * 0.2, 0.1, 0.7 + window.randomSecure() * 0.2],
                type: 'tree',
                speed: 5 + i * 2,
                swayPhase: window.randomSecure() * Math.PI * 2,
                offset: 0
            });
        }
    }

    generateFireflies(particles) {
        const config = FOREST_THEME_CONFIG;
        
        for (let i = 0; i < config.FIREFLY_COUNT; i++) {
            particles.push({
                x: window.randomSecure() * this.canvasWidth,
                y: this.canvasHeight * 0.4 + window.randomSecure() * this.canvasHeight * 0.4,
                radius: this.randomInRange(config.FIREFLY_MIN_RADIUS, config.FIREFLY_MAX_RADIUS),
                speed: 20 + window.randomSecure() * 30,
                glow: window.randomSecure() * Math.PI * 2,
                color: [0.9, 1.0, 0.3, 0.8],
                type: 'firefly',
                driftX: (window.randomSecure() - 0.5) * 50,
                driftY: (window.randomSecure() - 0.5) * 30
            });
        }
    }

    generateLeaves(particles) {
        const config = FOREST_THEME_CONFIG;
        
        for (let i = 0; i < config.LEAF_COUNT; i++) {
            particles.push({
                x: window.randomSecure() * this.canvasWidth,
                y: window.randomSecure() * this.canvasHeight * 0.6,
                speed: 15 + window.randomSecure() * 25,
                rotation: window.randomSecure() * Math.PI * 2,
                size: 4 + window.randomSecure() * 6,
                color: [0.8 - window.randomSecure() * 0.3, 0.5 + window.randomSecure() * 0.3, 0.1, 0.7],
                type: 'leaf',
                swayAmplitude: 20 + window.randomSecure() * 30,
                swayPhase: window.randomSecure() * Math.PI * 2
            });
        }
    }
}
