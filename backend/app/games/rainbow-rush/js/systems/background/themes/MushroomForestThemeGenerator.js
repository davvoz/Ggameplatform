import { BaseThemeGenerator } from '../BaseThemeGenerator.js';
import { MUSHROOM_FOREST_CONFIG, THEME_NAMES } from '../ThemeConfigurations.js';

/**
 * Mushroom Forest Theme Generator
 * Single Responsibility: Generate fantasy mushroom forest with giant mushrooms and spores
 */
export class MushroomForestThemeGenerator extends BaseThemeGenerator {
    getThemeName() {
        return THEME_NAMES.MUSHROOM_FOREST;
    }

    getBaseColors() {
        return MUSHROOM_FOREST_CONFIG.BASE_COLORS;
    }

    generateLayers(layers) {
        this.generateSkyGradient(layers);
        this.generateGiantMushrooms(layers);
        this.generateRegularMushrooms(layers);
        this.generateGround(layers);
    }

    generateParticles(particles) {
        this.generateSpores(particles);
        this.generateFireflies(particles);
    }

    generateSkyGradient(layers) {
        layers.push({
            y: 0,
            height: this.canvasHeight * 0.6,
            color: [0.2, 0.3, 0.4, 1.0],
            type: 'sky_gradient',
            speed: 0
        });
    }

    generateGround(layers) {
        const groundY = this.getGroundY(0.85);
        layers.push({
            y: groundY,
            height: this.canvasHeight - groundY,
            color: [0.25, 0.35, 0.3, 1.0],
            type: 'ground',
            speed: 0
        });
    }

    generateGiantMushrooms(layers) {
        const config = MUSHROOM_FOREST_CONFIG;
        const groundY = this.getGroundY(0.85);

        for (let i = 0; i < config.GIANT_MUSHROOM_COUNT; i++) {
            const height = 120 + window.randomSecure() * 80;
            const capWidth = 80 + window.randomSecure() * 60;
            const x = (i + 0.5) * this.canvasWidth / config.GIANT_MUSHROOM_COUNT;
            const hue = window.randomSecure();

            // Stem
            layers.push({
                x: x - 10,
                y: groundY - height,
                width: 20 + window.randomSecure() * 10,
                height: height * 0.7,
                color: [0.8, 0.75, 0.7, 0.8],
                type: 'simple_shape',
                shape: 'rectangle',
                speed: 5 + i * 2,
                offset: 0
            });

            // Cap
            layers.push({
                x,
                y: groundY - height,
                width: capWidth,
                height: height * 0.4,
                color: [
                    0.6 + hue * 0.4,
                    0.2 + (1 - hue) * 0.3,
                    0.3 + window.randomSecure() * 0.2,
                    0.85
                ],
                type: 'simple_shape',
                shape: 'mushroom_cap',
                speed: 5 + i * 2,
                offset: 0,
                spots: Math.floor(3 + window.randomSecure() * 5)
            });
        }
    }

    generateRegularMushrooms(layers) {
        const config = MUSHROOM_FOREST_CONFIG;
        const groundY = this.getGroundY(0.85);

        for (let i = 0; i < config.REGULAR_MUSHROOM_COUNT; i++) {
            const size = 15 + window.randomSecure() * 25;
            const x = window.randomSecure() * this.canvasWidth;
            const hue = window.randomSecure();

            layers.push({
                x,
                y: groundY - size,
                width: size,
                height: size,
                color: [
                    0.5 + hue * 0.5,
                    0.3 + (1 - hue) * 0.4,
                    0.4,
                    0.7
                ],
                type: 'simple_shape',
                shape: 'small_mushroom',
                speed: 4 + i * 1.5,
                offset: 0
            });
        }
    }

    generateSpores(particles) {
        const config = MUSHROOM_FOREST_CONFIG;
        
        for (let i = 0; i < config.SPORE_COUNT; i++) {
            particles.push({
                x: window.randomSecure() * this.canvasWidth,
                y: window.randomSecure() * this.canvasHeight,
                radius: this.randomInRange(config.SPORE_MIN_RADIUS, config.SPORE_MAX_RADIUS),
                speed: 8 + window.randomSecure() * 15,
                color: [0.9, 0.9, 0.7, 0.4 + window.randomSecure() * 0.3],
                type: 'simple_particle',
                drift: (window.randomSecure() - 0.5) * 20,
                wobble: window.randomSecure() * Math.PI * 2
            });
        }
    }

    generateFireflies(particles) {
        const config = MUSHROOM_FOREST_CONFIG;
        
        for (let i = 0; i < config.FIREFLY_COUNT; i++) {
            particles.push({
                x: window.randomSecure() * this.canvasWidth,
                y: this.canvasHeight * 0.4 + window.randomSecure() * this.canvasHeight * 0.4,
                radius: 2 + window.randomSecure() * 2,
                speed: 18 + window.randomSecure() * 25,
                glow: window.randomSecure() * Math.PI * 2,
                color: [0.7, 1.0, 0.5, 0.8],
                type: 'firefly',
                driftX: (window.randomSecure() - 0.5) * 40,
                driftY: (window.randomSecure() - 0.5) * 30
            });
        }
    }
}
