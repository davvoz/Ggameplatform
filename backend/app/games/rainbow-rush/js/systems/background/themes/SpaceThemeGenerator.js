import { BaseThemeGenerator } from '../BaseThemeGenerator.js';
import { SPACE_THEME_CONFIG, THEME_NAMES } from '../ThemeConfigurations.js';

/**
 * Space Theme Generator
 * Single Responsibility: Generate space theme with stars, planets, and nebulae
 */
export class SpaceThemeGenerator extends BaseThemeGenerator {
    getThemeName() {
        return THEME_NAMES.SPACE;
    }

    getBaseColors() {
        return SPACE_THEME_CONFIG.BASE_COLORS;
    }

    generateLayers(layers) {
        this.generatePlanets(layers);
        this.generateNebulae(layers);
    }

    generateParticles(particles) {
        this.generateStars(particles);
        this.generateShootingStars(particles);
    }

    generatePlanets(layers) {
        const config = SPACE_THEME_CONFIG;
        
        for (let i = 0; i < config.PLANET_COUNT; i++) {
            const radius = this.randomInRange(config.PLANET_MIN_RADIUS, config.PLANET_MAX_RADIUS);
            const hue = window.randomSecure();
            
            layers.push({
                x: (i + 1) * this.canvasWidth / (config.PLANET_COUNT + 1),
                y: this.getSkyY(0.3 + window.randomSecure() * 0.4),
                radius,
                color: [
                    0.3 + hue * 0.7,
                    0.3 + (1 - hue) * 0.5,
                    0.5 + window.randomSecure() * 0.3,
                    0.8
                ],
                type: 'planet',
                speed: 5 + i * 3,
                offset: 0
            });
        }
    }

    generateNebulae(layers) {
        const config = SPACE_THEME_CONFIG;
        
        for (let i = 0; i < config.NEBULA_COUNT; i++) {
            layers.push({
                x: window.randomSecure() * this.canvasWidth,
                y: window.randomSecure() * this.canvasHeight * 0.7,
                width: 150 + window.randomSecure() * 100,
                color: [
                    0.5 + window.randomSecure() * 0.5,
                    0.2 + window.randomSecure() * 0.4,
                    0.6 + window.randomSecure() * 0.4,
                    0.2
                ],
                type: 'nebula',
                speed: 3 + i * 2,
                offset: 0
            });
        }
    }

    generateStars(particles) {
        const config = SPACE_THEME_CONFIG;
        
        for (let i = 0; i < config.STAR_COUNT; i++) {
            particles.push({
                x: window.randomSecure() * this.canvasWidth,
                y: window.randomSecure() * this.canvasHeight,
                radius: this.randomInRange(config.STAR_MIN_RADIUS, config.STAR_MAX_RADIUS),
                twinkle: window.randomSecure() * Math.PI * 2,
                color: [1.0, 1.0, 0.9, 0.7],
                type: 'star'
            });
        }
    }

    generateShootingStars(particles) {
        const config = SPACE_THEME_CONFIG;
        
        for (let i = 0; i < config.SHOOTING_STAR_COUNT; i++) {
            particles.push({
                x: window.randomSecure() * this.canvasWidth,
                y: window.randomSecure() * this.canvasHeight * 0.6,
                length: config.SHOOTING_STAR_LENGTH,
                speed: 200 + window.randomSecure() * 150,
                angle: Math.PI / 4 + (window.randomSecure() - 0.5) * 0.5,
                color: [1.0, 1.0, 0.9, 0.8],
                type: 'shootingStar'
            });
        }
    }
}
