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
            const size = 20 + window.randomSecure() * 40;
            const x = (i + 0.5) * this.canvasWidth / config.HANGING_CRYSTAL_COUNT;
            const hue = window.randomSecure();

            layers.push({
                x,
                y: 0,
                width: size * 0.4,
                height: size,
                color: [
                    0.3 + hue * 0.7,
                    0.5 + (1 - hue) * 0.5,
                    0.8 + window.randomSecure() * 0.2,
                    0.7
                ],
                type: 'crystal',
                speed: 2 + i,
                glimmer: window.randomSecure() * Math.PI * 2,
                offset: 0,
                hanging: true
            });
        }
    }

    generateFloorCrystals(layers) {
        const config = CRYSTAL_CAVE_CONFIG;
        const groundY = this.getGroundY(0.85);

        for (let i = 0; i < config.FLOOR_CRYSTAL_COUNT; i++) {
            const size = 15 + window.randomSecure() * 35;
            const x = window.randomSecure() * this.canvasWidth;
            const hue = window.randomSecure();

            layers.push({
                x,
                y: groundY - size,
                width: size * 0.5,
                height: size,
                color: [
                    0.4 + hue * 0.6,
                    0.6 + (1 - hue) * 0.4,
                    0.9 + window.randomSecure() * 0.1,
                    0.8
                ],
                type: 'crystal',
                speed: 3 + i * 1.5,
                glimmer: window.randomSecure() * Math.PI * 2,
                offset: 0,
                hanging: false
            });
        }
    }

    generateGlowDust(particles) {
        const config = CRYSTAL_CAVE_CONFIG;
        
        for (let i = 0; i < config.GLOWDUST_COUNT; i++) {
            const hue = window.randomSecure();
            
            particles.push({
                x: window.randomSecure() * this.canvasWidth,
                y: window.randomSecure() * this.canvasHeight,
                radius: this.randomInRange(config.GLOWDUST_MIN_RADIUS, config.GLOWDUST_MAX_RADIUS),
                speed: 10 + window.randomSecure() * 20,
                glow: window.randomSecure() * Math.PI * 2,
                color: [
                    0.5 + hue * 0.5,
                    0.7 + (1 - hue) * 0.3,
                    1.0,
                    0.6 + window.randomSecure() * 0.3
                ],
                type: 'firefly',
                driftX: (window.randomSecure() - 0.5) * 30,
                driftY: (window.randomSecure() - 0.5) * 30
            });
        }
    }
}
