import { BaseThemeGenerator } from '../BaseThemeGenerator.js';
import { OCEAN_THEME_CONFIG, THEME_NAMES } from '../ThemeConfigurations.js';

/**
 * Ocean Theme Generator
 * Single Responsibility: Generate ocean theme with waves, bubbles, and fish
 */
export class OceanThemeGenerator extends BaseThemeGenerator {
    getThemeName() {
        return THEME_NAMES.OCEAN;
    }

    getBaseColors() {
        return OCEAN_THEME_CONFIG.BASE_COLORS;
    }

    generateLayers(layers) {
        this.generateWaves(layers);
        this.generateSeaweed(layers);
    }

    generateParticles(particles) {
        this.generateBubbles(particles);
        this.generateFish(particles);
    }

    generateWaves(layers) {
        const config = OCEAN_THEME_CONFIG;
        
        for (let i = 0; i < config.WAVE_COUNT; i++) {
            layers.push({
                y: this.canvasHeight * (0.7 + i * 0.1),
                amplitude: config.WAVE_BASE_AMPLITUDE + i * config.WAVE_AMPLITUDE_INCREMENT,
                frequency: config.WAVE_BASE_FREQUENCY - i * config.WAVE_FREQUENCY_DECREMENT,
                speed: config.WAVE_BASE_SPEED + i * config.WAVE_SPEED_INCREMENT,
                color: [0.1 + i * 0.1, 0.5 + i * 0.1, 0.85 - i * 0.05, 0.6 - i * 0.1],
                type: 'wave',
                offset: 0
            });
        }
    }

    generateSeaweed(layers) {
        const config = OCEAN_THEME_CONFIG;
        
        for (let i = 0; i < config.SEAWEED_COUNT; i++) {
            layers.push({
                x: (i + 0.5) * this.canvasWidth / config.SEAWEED_COUNT,
                y: this.canvasHeight * 0.8,
                height: 60 + Math.random() * 40,
                width: 8 + Math.random() * 6,
                swayPhase: Math.random() * Math.PI * 2,
                color: [0.1, 0.6 - i * 0.08, 0.4, 0.6],
                type: 'seaweed',
                speed: 0.5 + Math.random() * 0.5,
                offset: 0
            });
        }
    }

    generateBubbles(particles) {
        const config = OCEAN_THEME_CONFIG;
        
        for (let i = 0; i < config.BUBBLE_COUNT; i++) {
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: this.canvasHeight * 0.5 + Math.random() * this.canvasHeight * 0.5,
                radius: this.randomInRange(config.BUBBLE_MIN_RADIUS, config.BUBBLE_MAX_RADIUS),
                speed: this.randomInRange(config.BUBBLE_MIN_SPEED, config.BUBBLE_MAX_SPEED),
                wobble: Math.random() * Math.PI * 2,
                color: [1.0, 1.0, 1.0, 0.4],
                type: 'bubble'
            });
        }
    }

    generateFish(particles) {
        const config = OCEAN_THEME_CONFIG;
        
        for (let i = 0; i < config.FISH_COUNT; i++) {
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: this.canvasHeight * 0.6 + Math.random() * this.canvasHeight * 0.3,
                speed: this.randomInRange(config.FISH_MIN_SPEED, config.FISH_MAX_SPEED),
                size: this.randomInRange(config.FISH_MIN_SIZE, config.FISH_MAX_SIZE),
                swimPhase: Math.random() * Math.PI * 2,
                color: [0.9, 0.5, 0.2, 0.7],
                type: 'fish'
            });
        }
    }
}
