import { BaseThemeGenerator } from '../BaseThemeGenerator.js';
import { VOLCANO_THEME_CONFIG, THEME_NAMES } from '../ThemeConfigurations.js';

/**
 * Volcano Theme Generator
 * Single Responsibility: Generate volcanic landscape with lava and smoke
 */
export class VolcanoThemeGenerator extends BaseThemeGenerator {
    getThemeName() {
        return THEME_NAMES.VOLCANO;
    }

    getBaseColors() {
        return VOLCANO_THEME_CONFIG.BASE_COLORS;
    }

    generateLayers(layers) {
        this.generateSkyGradient(layers);
        this.generateGround(layers);
        this.generateVolcanoes(layers);
    }

    generateParticles(particles) {
        this.generateSmoke(particles);
        this.generateEmbers(particles);
    }

    generateSkyGradient(layers) {
        layers.push({
            y: 0,
            height: this.canvasHeight * 0.7,
            color: [0.4, 0.15, 0.1, 1.0],
            type: 'sky_gradient',
            speed: 0
        });
    }

    generateGround(layers) {
        const groundY = this.getGroundY(0.85);
        layers.push({
            y: groundY,
            height: this.canvasHeight - groundY,
            color: [0.2, 0.08, 0.04, 1.0],
            type: 'ground',
            speed: 0
        });
    }

    generateVolcanoes(layers) {
        const config = VOLCANO_THEME_CONFIG;
        const groundY = this.getGroundY(0.85);

        // Main volcano
        layers.push({
            x: this.canvasWidth * 0.65,
            y: groundY - config.MAIN_VOLCANO_HEIGHT,
            width: config.MAIN_VOLCANO_WIDTH,
            height: config.MAIN_VOLCANO_HEIGHT,
            color: [0.15, 0.08, 0.05, 1.0],
            type: 'volcano',
            speed: 12,
            craterWidth: config.MAIN_VOLCANO_CRATER_WIDTH,
            craterDepth: config.MAIN_VOLCANO_CRATER_DEPTH,
            offset: 0
        });

        // Secondary volcano
        layers.push({
            x: this.canvasWidth * 0.25,
            y: groundY - config.SECONDARY_VOLCANO_HEIGHT,
            width: config.SECONDARY_VOLCANO_WIDTH,
            height: config.SECONDARY_VOLCANO_HEIGHT,
            color: [0.12, 0.06, 0.04, 0.85],
            type: 'volcano',
            speed: 8,
            craterWidth: config.SECONDARY_VOLCANO_CRATER_WIDTH,
            craterDepth: config.SECONDARY_VOLCANO_CRATER_DEPTH,
            offset: 0
        });
    }

    generateSmoke(particles) {
        const config = VOLCANO_THEME_CONFIG;
        
        for (let i = 0; i < config.SMOKE_PARTICLE_COUNT; i++) {
            particles.push({
                x: this.canvasWidth * 0.65 + (Math.random() - 0.5) * 60,
                y: this.canvasHeight * 0.35 - 20 - i * 25,
                radius: 15 + Math.random() * 20,
                speed: -15 - Math.random() * 25,
                color: [0.2, 0.15, 0.12, 0.4 - i * 0.06],
                type: 'smoke',
                expansion: 1 + i * 0.15,
                drift: (Math.random() - 0.5) * 10
            });
        }
    }

    generateEmbers(particles) {
        const config = VOLCANO_THEME_CONFIG;
        
        for (let i = 0; i < config.EMBER_PARTICLE_COUNT; i++) {
            particles.push({
                x: this.canvasWidth * 0.65 + (Math.random() - 0.5) * 70,
                y: this.canvasHeight * 0.35 + Math.random() * 100,
                radius: this.randomInRange(config.EMBER_MIN_RADIUS, config.EMBER_MAX_RADIUS),
                speed: this.randomInRange(config.EMBER_MIN_SPEED, config.EMBER_MAX_SPEED),
                vx: (Math.random() - 0.5) * 30,
                color: [1.0, 0.5 + Math.random() * 0.3, 0.0, 0.8],
                type: 'ember',
                sparkle: Math.random() * Math.PI * 2
            });
        }
    }
}
