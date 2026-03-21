import { BaseThemeGenerator } from '../BaseThemeGenerator.js';
import { SUNSET_OCEAN_CONFIG, THEME_NAMES } from '../ThemeConfigurations.js';

/**
 * Sunset Ocean Theme Generator
 * Single Responsibility: Generate sunset over ocean theme combining sky and water elements
 * Hybrid theme mixing sunset colors with ocean waves
 */
export class SunsetOceanThemeGenerator extends BaseThemeGenerator {
    getThemeName() {
        return THEME_NAMES.SUNSET_OCEAN;
    }

    getBaseColors() {
        return SUNSET_OCEAN_CONFIG.BASE_COLORS;
    }

    generateLayers(layers) {
        this.generateSkyGradient(layers);
        this.generateSun(layers);
        this.generateWaves(layers);
    }

    generateParticles(particles) {
        this.generateBirds(particles);
        this.generateReflections(particles);
    }

    generateSkyGradient(layers) {
        layers.push({
            y: 0,
            height: this.canvasHeight * 0.5,
            color: [1.0, 0.4, 0.2, 1.0],
            type: 'sky_gradient',
            speed: 0
        });
    }

    generateSun(layers) {
        const config = SUNSET_OCEAN_CONFIG;
        
        layers.push({
            x: this.canvasWidth * 0.5,
            y: this.canvasHeight * 0.4,
            radius: config.SUN_RADIUS,
            color: [1.0, 0.5, 0.1, 0.9],
            type: 'celestial',
            speed: 1,
            offset: 0,
            glowColor: [1.0, 0.6, 0.2, 0.4],
            glowRadius: config.SUN_RADIUS * 2
        });
    }

    generateWaves(layers) {
        const config = SUNSET_OCEAN_CONFIG;
        
        for (let i = 0; i < config.WAVE_COUNT; i++) {
            layers.push({
                y: this.canvasHeight * (0.5 + i * 0.12),
                amplitude: 15 + i * 8,
                frequency: 0.012 - i * 0.002,
                speed: 0.8 + i * 0.25,
                color: [0.2 + i * 0.15, 0.3 + i * 0.15, 0.5 + i * 0.1, 0.7 - i * 0.15],
                type: 'wave',
                offset: 0
            });
        }
    }

    generateBirds(particles) {
        const config = SUNSET_OCEAN_CONFIG;
        
        for (let i = 0; i < config.BIRD_COUNT; i++) {
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight * 0.35,
                speed: 35 + Math.random() * 40,
                wingPhase: Math.random() * Math.PI * 2,
                size: 5 + Math.random() * 4,
                color: [0.1, 0.1, 0.1, 0.7],
                type: 'bird'
            });
        }
    }

    generateReflections(particles) {
        for (let i = 0; i < 8; i++) {
            particles.push({
                x: this.canvasWidth * 0.5 + (Math.random() - 0.5) * 100,
                y: this.canvasHeight * 0.5 + Math.random() * this.canvasHeight * 0.3,
                radius: 3 + Math.random() * 5,
                speed: 10 + Math.random() * 20,
                color: [1.0, 0.6, 0.2, 0.3 + Math.random() * 0.3],
                type: 'simple_particle',
                wobble: Math.random() * Math.PI * 2
            });
        }
    }
}
