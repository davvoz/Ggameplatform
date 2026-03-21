import { BaseThemeGenerator } from '../BaseThemeGenerator.js';
import { FROZEN_VOLCANO_CONFIG, THEME_NAMES } from '../ThemeConfigurations.js';

/**
 * Frozen Volcano Theme Generator
 * Single Responsibility: Generate hybrid frozen-volcano theme with ice and steam
 * Hybrid: Combines volcanic structure with ice/snow elements
 */
export class FrozenVolcanoThemeGenerator extends BaseThemeGenerator {
    getThemeName() {
        return THEME_NAMES.FROZEN_VOLCANO;
    }

    getBaseColors() {
        return FROZEN_VOLCANO_CONFIG.BASE_COLORS;
    }

    generateLayers(layers) {
        this.generateSkyGradient(layers);
        this.generateGround(layers);
        this.generateVolcanoes(layers);
        this.generateIceCrystals(layers);
    }

    generateParticles(particles) {
        this.generateSnowflakes(particles);
        this.generateSteam(particles);
    }

    generateSkyGradient(layers) {
        layers.push({
            y: 0,
            height: this.canvasHeight * 0.6,
            color: [0.6, 0.7, 0.9, 1.0],
            type: 'sky_gradient',
            speed: 0
        });
    }

    generateGround(layers) {
        const groundY = this.getGroundY(0.85);
        layers.push({
            y: groundY,
            height: this.canvasHeight - groundY,
            color: [0.85, 0.9, 0.95, 1.0],
            type: 'ground',
            speed: 0
        });
    }

    generateVolcanoes(layers) {
        const config = FROZEN_VOLCANO_CONFIG;
        const groundY = this.getGroundY(0.85);

        // Main frozen volcano
        layers.push({
            x: this.canvasWidth * 0.6,
            y: groundY - 300,
            width: 300,
            height: 300,
            color: [0.5, 0.6, 0.75, 0.9],
            type: 'volcano',
            speed: 10,
            craterWidth: 70,
            craterDepth: 50,
            offset: 0,
            frozen: true
        });

        // Secondary volcano
        layers.push({
            x: this.canvasWidth * 0.3,
            y: groundY - 180,
            width: 180,
            height: 180,
            color: [0.45, 0.55, 0.7, 0.85],
            type: 'volcano',
            speed: 7,
            craterWidth: 45,
            craterDepth: 35,
            offset: 0,
            frozen: true
        });
    }

    generateIceCrystals(layers) {
        const config = FROZEN_VOLCANO_CONFIG;
        const groundY = this.getGroundY(0.85);

        for (let i = 0; i < config.ICE_CRYSTAL_COUNT; i++) {
            const size = 20 + Math.random() * 35;
            const x = Math.random() * this.canvasWidth;

            layers.push({
                x,
                y: groundY - size,
                width: size * 0.5,
                height: size,
                color: [0.7 + Math.random() * 0.2, 0.8 + Math.random() * 0.15, 0.95, 0.7],
                type: 'crystal',
                speed: 3 + i * 1.2,
                glimmer: Math.random() * Math.PI * 2,
                offset: 0
            });
        }
    }

    generateSnowflakes(particles) {
        const config = FROZEN_VOLCANO_CONFIG;
        
        for (let i = 0; i < config.SNOWFLAKE_COUNT; i++) {
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                radius: 2 + Math.random() * 4,
                speed: 20 + Math.random() * 35,
                rotation: Math.random() * Math.PI * 2,
                color: [1.0, 1.0, 1.0, 0.7],
                type: 'snowflake',
                drift: (Math.random() - 0.5) * 25
            });
        }
    }

    generateSteam(particles) {
        const config = FROZEN_VOLCANO_CONFIG;
        
        for (let i = 0; i < config.STEAM_COUNT; i++) {
            particles.push({
                x: this.canvasWidth * 0.6 + (Math.random() - 0.5) * 50,
                y: this.canvasHeight * 0.4 - i * 25,
                radius: 12 + Math.random() * 18,
                speed: -15 - Math.random() * 25,
                color: [0.9, 0.95, 1.0, 0.3 - i * 0.04],
                type: 'smoke',
                expansion: 1 + i * 0.15,
                drift: (Math.random() - 0.5) * 12
            });
        }
    }
}
