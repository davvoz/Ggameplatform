import { BaseThemeGenerator } from '../BaseThemeGenerator.js';
import { CRYSTAL_CAVE_CONFIG, THEME_NAMES } from '../ThemeConfigurations.js';

/**
 * Crystal Cave Theme Generator
 * Single Responsibility: Generate underground crystal cave with glowing particles
 */
export class CrystalCaveThemeGenerator extends BaseThemeGenerator {
    getThemeName() {
        return THEME_NAMES.CRYSTAL_CAVE;
    }

    getBaseColors() {
        return CRYSTAL_CAVE_CONFIG.BASE_COLORS;
    }

    generateLayers(layers) {
        this.generateCaveBackground(layers);
        this.generateHangingCrystals(layers);
        this.generateFloorCrystals(layers);
    }

    generateParticles(particles) {
        this.generateGlowDust(particles);
    }

    generateCaveBackground(layers) {
        layers.push({
            y: 0,
            height: this.canvasHeight,
            color: [0.1, 0.1, 0.15, 1.0],
            type: 'sky_gradient',
            speed: 0
        });
    }

    generateHangingCrystals(layers) {
        const config = CRYSTAL_CAVE_CONFIG;
        
        for (let i = 0; i < config.HANGING_CRYSTAL_COUNT; i++) {
            const size = 20 + Math.random() * 40;
            const x = (i + 0.5) * this.canvasWidth / config.HANGING_CRYSTAL_COUNT;
            const hue = Math.random();

            layers.push({
                x,
                y: 0,
                width: size * 0.4,
                height: size,
                color: [
                    0.3 + hue * 0.7,
                    0.5 + (1 - hue) * 0.5,
                    0.8 + Math.random() * 0.2,
                    0.7
                ],
                type: 'crystal',
                speed: 2 + i,
                glimmer: Math.random() * Math.PI * 2,
                offset: 0,
                hanging: true
            });
        }
    }

    generateFloorCrystals(layers) {
        const config = CRYSTAL_CAVE_CONFIG;
        const groundY = this.getGroundY(0.85);

        for (let i = 0; i < config.FLOOR_CRYSTAL_COUNT; i++) {
            const size = 15 + Math.random() * 35;
            const x = Math.random() * this.canvasWidth;
            const hue = Math.random();

            layers.push({
                x,
                y: groundY - size,
                width: size * 0.5,
                height: size,
                color: [
                    0.4 + hue * 0.6,
                    0.6 + (1 - hue) * 0.4,
                    0.9 + Math.random() * 0.1,
                    0.8
                ],
                type: 'crystal',
                speed: 3 + i * 1.5,
                glimmer: Math.random() * Math.PI * 2,
                offset: 0,
                hanging: false
            });
        }
    }

    generateGlowDust(particles) {
        const config = CRYSTAL_CAVE_CONFIG;
        
        for (let i = 0; i < config.GLOWDUST_COUNT; i++) {
            const hue = Math.random();
            
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                radius: this.randomInRange(config.GLOWDUST_MIN_RADIUS, config.GLOWDUST_MAX_RADIUS),
                speed: 10 + Math.random() * 20,
                glow: Math.random() * Math.PI * 2,
                color: [
                    0.5 + hue * 0.5,
                    0.7 + (1 - hue) * 0.3,
                    1.0,
                    0.6 + Math.random() * 0.3
                ],
                type: 'firefly',
                driftX: (Math.random() - 0.5) * 30,
                driftY: (Math.random() - 0.5) * 30
            });
        }
    }
}
