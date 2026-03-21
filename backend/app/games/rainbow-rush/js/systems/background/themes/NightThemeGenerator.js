import { BaseThemeGenerator } from '../BaseThemeGenerator.js';
import { NIGHT_THEME_CONFIG, THEME_NAMES } from '../ThemeConfigurations.js';

/**
 * Night Theme Generator
 * Single Responsibility: Generate night theme with moon, stars, fireflies, and clouds
 */
export class NightThemeGenerator extends BaseThemeGenerator {
    getThemeName() {
        return THEME_NAMES.NIGHT;
    }

    getBaseColors() {
        return NIGHT_THEME_CONFIG.BASE_COLORS;
    }

    generateLayers(layers) {
        this.generateSkyGradient(layers);
        this.generateMoon(layers);
        this.generateGround(layers);
    }

    generateParticles(particles) {
        this.generateStars(particles);
        this.generateFireflies(particles);
        this.generateClouds(particles);
    }

    generateSkyGradient(layers) {
        layers.push({
            y: 0,
            height: this.canvasHeight * 0.7,
            color: [0.1, 0.1, 0.2, 1.0],
            type: 'sky_gradient',
            speed: 0
        });
    }

    generateGround(layers) {
        const groundY = this.getGroundY(0.85);
        layers.push({
            y: groundY,
            height: this.canvasHeight - groundY,
            color: [0.05, 0.1, 0.15, 1.0],
            type: 'ground',
            speed: 0
        });
    }

    generateMoon(layers) {
        const config = NIGHT_THEME_CONFIG;
        
        layers.push({
            x: this.canvasWidth * 0.75,
            y: this.canvasHeight * 0.2,
            radius: config.MOON_RADIUS,
            color: [0.95, 0.95, 0.85, 0.9],
            type: 'celestial',
            speed: 2,
            offset: 0,
            glowColor: [0.9, 0.9, 0.7, 0.3],
            glowRadius: config.MOON_RADIUS * 1.5
        });
    }

    generateStars(particles) {
        const config = NIGHT_THEME_CONFIG;
        
        for (let i = 0; i < config.STAR_COUNT; i++) {
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight * 0.7,
                radius: this.randomInRange(config.STAR_MIN_RADIUS, config.STAR_MAX_RADIUS),
                twinkle: Math.random() * Math.PI * 2,
                color: [1.0, 1.0, 0.9, 0.7 + Math.random() * 0.3],
                type: 'star'
            });
        }
    }

    generateFireflies(particles) {
        const config = NIGHT_THEME_CONFIG;
        
        for (let i = 0; i < config.FIREFLY_COUNT; i++) {
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: this.canvasHeight * 0.5 + Math.random() * this.canvasHeight * 0.3,
                radius: 2 + Math.random() * 2,
                speed: 15 + Math.random() * 25,
                glow: Math.random() * Math.PI * 2,
                color: [0.9, 1.0, 0.4, 0.8],
                type: 'firefly',
                driftX: (Math.random() - 0.5) * 40,
                driftY: (Math.random() - 0.5) * 25
            });
        }
    }

    generateClouds(particles) {
        const config = NIGHT_THEME_CONFIG;
        
        for (let i = 0; i < config.CLOUD_COUNT; i++) {
            const baseSize = 50 + Math.random() * 40;
            const numPuffs = 3 + Math.floor(Math.random() * 4);
            
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight * 0.5,
                baseSize,
                puffs: this.createCloudPuffs(numPuffs, baseSize),
                speed: 15 + Math.random() * 20,
                color: [0.2, 0.2, 0.3, 0.4],
                type: 'cloud'
            });
        }
    }
}
