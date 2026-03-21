import { BaseThemeGenerator } from '../BaseThemeGenerator.js';
import { PYRAMID_THEME_CONFIG, THEME_NAMES } from '../ThemeConfigurations.js';

/**
 * Pyramids Theme Generator
 * Single Responsibility: Generate desert theme with pyramids, sand particles, and heat waves
 */
export class PyramidsThemeGenerator extends BaseThemeGenerator {
    getThemeName() {
        return THEME_NAMES.PYRAMIDS;
    }

    getBaseColors() {
        return PYRAMID_THEME_CONFIG.BASE_COLORS;
    }

    generateLayers(layers) {
        this.generateSkyGradient(layers);
        this.generateDunes(layers);
        this.generatePyramids(layers);
        this.generateGround(layers);
    }

    generateParticles(particles) {
        this.generateSandParticles(particles);
        this.generateHeatWaves(particles);
    }

    generateSkyGradient(layers) {
        layers.push({
            y: 0,
            height: this.canvasHeight * 0.6,
            color: [0.85, 0.7, 0.35, 1.0],
            type: 'sky_gradient',
            speed: 0
        });
    }

    generateGround(layers) {
        const groundY = this.getGroundY(0.85);
        layers.push({
            y: groundY,
            height: this.canvasHeight - groundY,
            color: [0.8, 0.65, 0.3, 1.0],
            type: 'ground',
            speed: 0
        });
    }

    generateDunes(layers) {
        const config = PYRAMID_THEME_CONFIG;
        
        for (let i = 0; i < config.DUNE_COUNT; i++) {
            layers.push({
                x: i * this.canvasWidth / config.DUNE_COUNT,
                y: this.canvasHeight * (0.65 + i * 0.05),
                width: this.canvasWidth / config.DUNE_COUNT + 50,
                height: 80 + Math.random() * 40,
                color: [0.75 - i * 0.05, 0.6 - i * 0.05, 0.28 - i * 0.03, 0.5 + i * 0.1],
                type: 'simple_shape',
                shape: 'dune',
                speed: 3 + i * 2,
                offset: 0
            });
        }
    }

    generatePyramids(layers) {
        const config = PYRAMID_THEME_CONFIG;
        const groundY = this.getGroundY(0.85);

        for (let i = 0; i < config.PYRAMID_COUNT; i++) {
            const width = this.randomInRange(config.PYRAMID_MIN_WIDTH, config.PYRAMID_MAX_WIDTH);
            const height = this.randomInRange(config.PYRAMID_MIN_HEIGHT, config.PYRAMID_MAX_HEIGHT);
            const x = (i + 0.3) * this.canvasWidth / config.PYRAMID_COUNT;

            layers.push({
                x,
                y: groundY - height,
                width,
                height,
                color: [0.7 - i * 0.1, 0.55 - i * 0.1, 0.25 - i * 0.05, 0.8],
                type: 'simple_shape',
                shape: 'pyramid',
                speed: 6 + i * 3,
                offset: 0
            });
        }
    }

    generateSandParticles(particles) {
        const config = PYRAMID_THEME_CONFIG;
        
        for (let i = 0; i < config.SAND_PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: this.canvasHeight * 0.6 + Math.random() * this.canvasHeight * 0.3,
                radius: this.randomInRange(config.SAND_MIN_RADIUS, config.SAND_MAX_RADIUS),
                speed: this.randomInRange(config.SAND_MIN_SPEED, config.SAND_MAX_SPEED),
                color: [0.85, 0.7, 0.4, 0.5],
                type: 'simple_particle',
                drift: 50 + Math.random() * 80
            });
        }
    }

    generateHeatWaves(particles) {
        const config = PYRAMID_THEME_CONFIG;
        
        for (let i = 0; i < config.HEATWAVE_COUNT; i++) {
            particles.push({
                x: (i + 0.5) * this.canvasWidth / config.HEATWAVE_COUNT,
                y: this.canvasHeight * 0.7,
                amplitude: 15 + Math.random() * 10,
                frequency: 0.02 + Math.random() * 0.01,
                speed: 40 + Math.random() * 30,
                color: [1.0, 0.9, 0.6, 0.15],
                type: 'animated_particle',
                animation: 'wave',
                height: 60 + Math.random() * 40
            });
        }
    }
}
