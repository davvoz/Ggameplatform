import { BaseThemeGenerator } from '../BaseThemeGenerator.js';
import { ICE_THEME_CONFIG, THEME_NAMES } from '../ThemeConfigurations.js';

/**
 * Ice Theme Generator
 * Single Responsibility: Generate ice theme with crystals and snowflakes
 */
export class IceThemeGenerator extends BaseThemeGenerator {
    getThemeName() {
        return THEME_NAMES.ICE;
    }

    getBaseColors() {
        return ICE_THEME_CONFIG.BASE_COLORS;
    }

    generateLayers(layers) {
        this.generateSkyGradient(layers);
        this.generateCrystals(layers);
        this.generateGround(layers);
    }

    generateParticles(particles) {
        this.generateSnowflakes(particles);
    }

    generateSkyGradient(layers) {
        layers.push({
            y: 0,
            height: this.canvasHeight * 0.7,
            color: [0.7, 0.85, 1.0, 1.0],
            type: 'sky_gradient',
            speed: 0
        });
    }

    generateGround(layers) {
        const groundY = this.getGroundY(0.85);
        layers.push({
            y: groundY,
            height: this.canvasHeight - groundY,
            color: [0.9, 0.95, 1.0, 1.0],
            type: 'ground',
            speed: 0
        });
    }

    generateCrystals(layers) {
        const config = ICE_THEME_CONFIG;
        const groundY = this.getGroundY(0.85);

        for (let i = 0; i < config.CRYSTAL_COUNT; i++) {
            const size = this.randomInRange(config.CRYSTAL_MIN_SIZE, config.CRYSTAL_MAX_SIZE);
            const x = window.randomSecure() * this.canvasWidth;

            layers.push({
                x,
                y: groundY - size,
                width: size * 0.6,
                height: size,
                color: [0.7 + window.randomSecure() * 0.2, 0.85 + window.randomSecure() * 0.1, 1.0, 0.6 + window.randomSecure() * 0.3],
                type: 'crystal',
                speed: 3 + i * 1.5,
                glimmer: window.randomSecure() * Math.PI * 2,
                offset: 0
            });
        }
    }

    generateSnowflakes(particles) {
        const config = ICE_THEME_CONFIG;
        
        for (let i = 0; i < config.SNOWFLAKE_COUNT; i++) {
            particles.push({
                x: window.randomSecure() * this.canvasWidth,
                y: window.randomSecure() * this.canvasHeight,
                radius: this.randomInRange(config.SNOWFLAKE_MIN_RADIUS, config.SNOWFLAKE_MAX_RADIUS),
                speed: this.randomInRange(config.SNOWFLAKE_MIN_SPEED, config.SNOWFLAKE_MAX_SPEED),
                rotation: window.randomSecure() * Math.PI * 2,
                color: [1.0, 1.0, 1.0, 0.7 + window.randomSecure() * 0.3],
                type: 'snowflake',
                drift: (window.randomSecure() - 0.5) * 30
            });
        }
    }
}
