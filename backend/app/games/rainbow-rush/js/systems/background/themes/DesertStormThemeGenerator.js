import { BaseThemeGenerator } from '../BaseThemeGenerator.js';
import { DESERT_STORM_CONFIG, THEME_NAMES } from '../ThemeConfigurations.js';

/**
 * Desert Storm Theme Generator
 * Single Responsibility: Generate desert storm theme with sand particles and pyramids
 */
export class DesertStormThemeGenerator extends BaseThemeGenerator {
    getThemeName() {
        return THEME_NAMES.DESERT_STORM;
    }

    getBaseColors() {
        return DESERT_STORM_CONFIG.BASE_COLORS;
    }

    generateLayers(layers) {
        this.generateSkyGradient(layers);
        this.generateDunes(layers);
        this.generatePyramids(layers);
        this.generateGround(layers);
    }

    generateParticles(particles) {
        this.generateSandStorm(particles);
        this.generateHeatWaves(particles);
    }

    generateSkyGradient(layers) {
        layers.push({
            y: 0,
            height: this.canvasHeight * 0.6,
            color: [0.8, 0.6, 0.3, 1.0],
            type: 'sky_gradient',
            speed: 0
        });
    }

    generateGround(layers) {
        const groundY = this.getGroundY(0.85);
        layers.push({
            y: groundY,
            height: this.canvasHeight - groundY,
            color: [0.75, 0.55, 0.25, 1.0],
            type: 'ground',
            speed: 0
        });
    }

    generateDunes(layers) {
        const config = DESERT_STORM_CONFIG;
        
        for (let i = 0; i < config.DUNE_COUNT; i++) {
            layers.push({
                x: i * this.canvasWidth / config.DUNE_COUNT,
                y: this.canvasHeight * (0.6 + i * 0.06),
                width: this.canvasWidth / config.DUNE_COUNT + 60,
                height: 90 + window.randomSecure() * 50,
                color: [0.7 - i * 0.06, 0.55 - i * 0.06, 0.25 - i * 0.04, 0.4 + i * 0.15],
                type: 'simple_shape',
                shape: 'dune',
                speed: 4 + i * 2.5,
                offset: 0
            });
        }
    }

    generatePyramids(layers) {
        const config = DESERT_STORM_CONFIG;
        const groundY = this.getGroundY(0.85);

        for (let i = 0; i < config.PYRAMID_COUNT; i++) {
            const width = 130 + window.randomSecure() * 60;
            const height = 110 + window.randomSecure() * 50;
            const x = (i + 0.4) * this.canvasWidth / (config.PYRAMID_COUNT + 1);

            layers.push({
                x,
                y: groundY - height,
                width,
                height,
                color: [0.65 - i * 0.15, 0.5 - i * 0.15, 0.22 - i * 0.07, 0.6],
                type: 'simple_shape',
                shape: 'pyramid',
                speed: 7 + i * 3,
                offset: 0
            });
        }
    }

    generateSandStorm(particles) {
        const config = DESERT_STORM_CONFIG;
        
        for (let i = 0; i < config.SAND_PARTICLE_COUNT; i++) {
            particles.push({
                x: window.randomSecure() * this.canvasWidth,
                y: window.randomSecure() * this.canvasHeight,
                radius: 1 + window.randomSecure() * 4,
                speed: 60 + window.randomSecure() * 120,
                color: [0.8, 0.65, 0.35, 0.3 + window.randomSecure() * 0.4],
                type: 'simple_particle',
                drift: 100 + window.randomSecure() * 150,
                angle: Math.PI / 6 + (window.randomSecure() - 0.5) * 0.3
            });
        }
    }

    generateHeatWaves(particles) {
        const config = DESERT_STORM_CONFIG;
        
        for (let i = 0; i < config.HEATWAVE_PARTICLE_COUNT; i++) {
            particles.push({
                x: (i + 0.5) * this.canvasWidth / config.HEATWAVE_PARTICLE_COUNT,
                y: this.canvasHeight * 0.65 + window.randomSecure() * this.canvasHeight * 0.2,
                amplitude: 12 + window.randomSecure() * 15,
                frequency: 0.025 + window.randomSecure() * 0.015,
                speed: 50 + window.randomSecure() * 40,
                color: [0.9, 0.8, 0.5, 0.2],
                type: 'animated_particle',
                animation: 'wave',
                height: 50 + window.randomSecure() * 30
            });
        }
    }
}
