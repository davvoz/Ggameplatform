import { BaseThemeGenerator } from '../BaseThemeGenerator.js';
import { AURORA_NIGHT_CONFIG, THEME_NAMES } from '../ThemeConfigurations.js';

/**
 * Aurora Night Theme Generator
 * Single Responsibility: Generate night theme with aurora borealis waves
 */
export class AuroraNightThemeGenerator extends BaseThemeGenerator {
    getThemeName() {
        return THEME_NAMES.AURORA_NIGHT;
    }

    getBaseColors() {
        return AURORA_NIGHT_CONFIG.BASE_COLORS;
    }

    generateLayers(layers) {
        this.generateSkyGradient(layers);
        this.generateAuroraWaves(layers);
        this.generateGround(layers);
    }

    generateParticles(particles) {
        this.generateStars(particles);
        this.generateAuroraParticles(particles);
    }

    generateSkyGradient(layers) {
        layers.push({
            y: 0,
            height: this.canvasHeight * 0.7,
            color: [0.05, 0.1, 0.2, 1.0],
            type: 'sky_gradient',
            speed: 0
        });
    }

    generateGround(layers) {
        const groundY = this.getGroundY(0.85);
        layers.push({
            y: groundY,
            height: this.canvasHeight - groundY,
            color: [0.05, 0.08, 0.15, 1.0],
            type: 'ground',
            speed: 0
        });
    }

    generateAuroraWaves(layers) {
        const config = AURORA_NIGHT_CONFIG;
        
        for (let i = 0; i < config.AURORA_WAVE_COUNT; i++) {
            const hue = i / config.AURORA_WAVE_COUNT;
            const amplitude = this.randomInRange(config.AURORA_MIN_AMPLITUDE, config.AURORA_MAX_AMPLITUDE);

            layers.push({
                y: this.canvasHeight * (0.15 + i * 0.15),
                amplitude,
                frequency: 0.008 + i * 0.002,
                speed: 0.3 + i * 0.15,
                color: [
                    0.2 + hue * 0.6,
                    0.8 - hue * 0.3,
                    0.6 + window.randomSecure() * 0.4,
                    0.25 - i * 0.05
                ],
                type: 'aurora_wave',
                offset: 0,
                height: 80 + window.randomSecure() * 60
            });
        }
    }

    generateStars(particles) {
        const config = AURORA_NIGHT_CONFIG;
        
        for (let i = 0; i < config.STAR_COUNT; i++) {
            particles.push({
                x: window.randomSecure() * this.canvasWidth,
                y: window.randomSecure() * this.canvasHeight * 0.7,
                radius: 1 + window.randomSecure() * 2,
                twinkle: window.randomSecure() * Math.PI * 2,
                color: [1.0, 1.0, 0.95, 0.6 + window.randomSecure() * 0.4],
                type: 'star'
            });
        }
    }

    generateAuroraParticles(particles) {
        const config = AURORA_NIGHT_CONFIG;
        
        for (let i = 0; i < config.AURORA_PARTICLE_COUNT; i++) {
            const hue = window.randomSecure();
            
            particles.push({
                x: window.randomSecure() * this.canvasWidth,
                y: window.randomSecure() * this.canvasHeight * 0.5,
                radius: 2 + window.randomSecure() * 4,
                speed: 5 + window.randomSecure() * 15,
                glow: window.randomSecure() * Math.PI * 2,
                color: [
                    0.3 + hue * 0.5,
                    0.7 - hue * 0.2,
                    0.8 + window.randomSecure() * 0.2,
                    0.5 + window.randomSecure() * 0.3
                ],
                type: 'firefly',
                driftX: (window.randomSecure() - 0.5) * 60,
                driftY: (window.randomSecure() - 0.5) * 20
            });
        }
    }
}
