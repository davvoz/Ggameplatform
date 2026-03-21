import { BaseThemeGenerator } from '../BaseThemeGenerator.js';
import { LAVA_OCEAN_CONFIG, THEME_NAMES } from '../ThemeConfigurations.js';

/**
 * Lava Ocean Theme Generator
 * Single Responsibility: Generate hybrid lava-ocean theme with molten waves and embers
 * Hybrid: Combines volcano lava effects with ocean wave patterns
 */
export class LavaOceanThemeGenerator extends BaseThemeGenerator {
    getThemeName() {
        return THEME_NAMES.LAVA_OCEAN;
    }

    getBaseColors() {
        return LAVA_OCEAN_CONFIG.BASE_COLORS;
    }

    generateLayers(layers) {
        this.generateSkyGradient(layers);
        this.generateLavaWaves(layers);
    }

    generateParticles(particles) {
        this.generateLavaBubbles(particles);
        this.generateEmbers(particles);
        this.generateSmoke(particles);
    }

    generateSkyGradient(layers) {
        layers.push({
            y: 0,
            height: this.canvasHeight * 0.6,
            color: [0.8, 0.2, 0.0, 1.0],
            type: 'sky_gradient',
            speed: 0
        });
    }

    generateLavaWaves(layers) {
        const config = LAVA_OCEAN_CONFIG;
        
        for (let i = 0; i < config.WAVE_COUNT; i++) {
            const intensity = i / config.WAVE_COUNT;
            
            layers.push({
                y: this.canvasHeight * (0.6 + i * 0.1),
                amplitude: 25 + i * 10,
                frequency: 0.015 - i * 0.002,
                speed: 1.2 + i * 0.3,
                color: [
                    0.9 - intensity * 0.3,
                    0.2 + intensity * 0.2,
                    0.05,
                    0.8 - i * 0.15
                ],
                type: 'lava_flow',
                offset: 0,
                pulseSpeed: 2 + i * 0.5
            });
        }
    }

    generateLavaBubbles(particles) {
        const config = LAVA_OCEAN_CONFIG;
        
        for (let i = 0; i < config.LAVA_BUBBLE_COUNT; i++) {
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: this.canvasHeight * 0.65 + Math.random() * this.canvasHeight * 0.3,
                radius: 5 + Math.random() * 12,
                speed: 15 + Math.random() * 35,
                wobble: Math.random() * Math.PI * 2,
                color: [0.95, 0.3 + Math.random() * 0.2, 0.0, 0.6],
                type: 'bubble',
                glow: true
            });
        }
    }

    generateEmbers(particles) {
        const config = LAVA_OCEAN_CONFIG;
        
        for (let i = 0; i < config.EMBER_COUNT; i++) {
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: this.canvasHeight * 0.6 + Math.random() * this.canvasHeight * 0.4,
                radius: 2 + Math.random() * 4,
                speed: -20 - Math.random() * 50,
                color: [1.0, 0.4 + Math.random() * 0.3, 0.0, 0.7],
                type: 'simple_particle',
                drift: (Math.random() - 0.5) * 30,
                fade: 0.98
            });
        }
    }

    generateSmoke(particles) {
        const config = LAVA_OCEAN_CONFIG;
        
        for (let i = 0; i < config.SMOKE_COUNT; i++) {
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: this.canvasHeight * 0.6 - i * 30,
                radius: 15 + Math.random() * 25,
                speed: -20 - Math.random() * 30,
                color: [0.2, 0.1, 0.1, 0.35 - i * 0.05],
                type: 'smoke',
                expansion: 1 + i * 0.2,
                drift: (Math.random() - 0.5) * 15
            });
        }
    }
}
