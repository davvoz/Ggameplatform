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
            const height = 120 + Math.random() * 80;
            const capWidth = 80 + Math.random() * 60;
            const x = (i + 0.5) * this.canvasWidth / config.GIANT_MUSHROOM_COUNT;
            const hue = Math.random();

            // Stem
            layers.push({
                x: x - 10,
                y: groundY - height,
                width: 20 + Math.random() * 10,
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
                    0.3 + Math.random() * 0.2,
                    0.85
                ],
                type: 'simple_shape',
                shape: 'mushroom_cap',
                speed: 5 + i * 2,
                offset: 0,
                spots: Math.floor(3 + Math.random() * 5)
            });
        }
    }

    generateRegularMushrooms(layers) {
        const config = MUSHROOM_FOREST_CONFIG;
        const groundY = this.getGroundY(0.85);

        for (let i = 0; i < config.REGULAR_MUSHROOM_COUNT; i++) {
            const size = 15 + Math.random() * 25;
            const x = Math.random() * this.canvasWidth;
            const hue = Math.random();

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
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                radius: this.randomInRange(config.SPORE_MIN_RADIUS, config.SPORE_MAX_RADIUS),
                speed: 8 + Math.random() * 15,
                color: [0.9, 0.9, 0.7, 0.4 + Math.random() * 0.3],
                type: 'simple_particle',
                drift: (Math.random() - 0.5) * 20,
                wobble: Math.random() * Math.PI * 2
            });
        }
    }

    generateFireflies(particles) {
        const config = MUSHROOM_FOREST_CONFIG;
        
        for (let i = 0; i < config.FIREFLY_COUNT; i++) {
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: this.canvasHeight * 0.4 + Math.random() * this.canvasHeight * 0.4,
                radius: 2 + Math.random() * 2,
                speed: 18 + Math.random() * 25,
                glow: Math.random() * Math.PI * 2,
                color: [0.7, 1.0, 0.5, 0.8],
                type: 'firefly',
                driftX: (Math.random() - 0.5) * 40,
                driftY: (Math.random() - 0.5) * 30
            });
        }
    }
}
