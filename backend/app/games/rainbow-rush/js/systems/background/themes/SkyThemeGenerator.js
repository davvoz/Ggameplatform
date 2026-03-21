import { BaseThemeGenerator } from '../BaseThemeGenerator.js';
import { SKY_THEME_CONFIG, THEME_NAMES } from '../ThemeConfigurations.js';

/**
 * Sky Theme Generator
 * Single Responsibility: Generate sky theme with clouds, birds, and sun rays
 */
export class SkyThemeGenerator extends BaseThemeGenerator {
    getThemeName() {
        return THEME_NAMES.SKY;
    }

    getBaseColors() {
        return SKY_THEME_CONFIG.BASE_COLORS;
    }

    generateLayers(layers) {
        this.generateSunRays(layers);
    }

    generateParticles(particles) {
        this.generateClouds(particles);
        this.generateBirds(particles);
    }

    generateClouds(particles) {
        const config = SKY_THEME_CONFIG;
        
        for (let i = 0; i < config.CLOUD_COUNT; i++) {
            const baseSize = this.randomInRange(config.CLOUD_MIN_SIZE, config.CLOUD_MAX_SIZE);
            const numPuffs = this.randomIntInRange(config.CLOUD_MIN_PUFFS, config.CLOUD_MAX_PUFFS);
            
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight * 0.6,
                baseSize,
                puffs: this.createCloudPuffs(numPuffs, baseSize),
                speed: this.randomInRange(config.CLOUD_MIN_SPEED, config.CLOUD_MAX_SPEED),
                color: [0.95, 0.95, 0.98, 0.45 + Math.random() * 0.12],
                type: 'cloud'
            });
        }
    }

    generateBirds(particles) {
        const config = SKY_THEME_CONFIG;
        
        for (let i = 0; i < config.BIRD_COUNT; i++) {
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight * 0.4,
                speed: this.randomInRange(config.BIRD_MIN_SPEED, config.BIRD_MAX_SPEED),
                wingPhase: Math.random() * Math.PI * 2,
                size: this.randomInRange(config.BIRD_MIN_SIZE, config.BIRD_MAX_SIZE),
                color: [0.2, 0.2, 0.2, 0.6],
                type: 'bird'
            });
        }
    }

    generateSunRays(layers) {
        const config = SKY_THEME_CONFIG;
        
        for (let i = 0; i < config.SUNRAY_COUNT; i++) {
            layers.push({
                x: this.canvasWidth * 0.8,
                y: this.canvasHeight * 0.15,
                angle: (i * Math.PI / 6) - Math.PI / 12,
                length: config.SUNRAY_BASE_LENGTH + i * config.SUNRAY_LENGTH_INCREMENT,
                width: 40,
                color: [1.0, 0.95, 0.7, 0.15],
                type: 'sunray',
                speed: 1 + i * 0.3,
                offset: 0
            });
        }
    }
}
