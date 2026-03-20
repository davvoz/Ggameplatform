import { BaseThemeGenerator } from '../BaseThemeGenerator.js';
import { TOXIC_SWAMP_CONFIG, THEME_NAMES } from '../ThemeConfigurations.js';

/**
 * Toxic Swamp Theme Generator
 * Single Responsibility: Generate toxic swamp theme with bubbles, mist, and poisonous atmosphere
 */
export class ToxicSwampThemeGenerator extends BaseThemeGenerator {
    getThemeName() {
        return THEME_NAMES.TOXIC_SWAMP;
    }

    getBaseColors() {
        return TOXIC_SWAMP_CONFIG.BASE_COLORS;
    }

    generateLayers(layers) {
        this.generateSkyGradient(layers);
        this.generateMushrooms(layers);
        this.generateGround(layers);
    }

    generateParticles(particles) {
        this.generateBubbles(particles);
        this.generateMist(particles);
        this.generateToxicParticles(particles);
    }

    generateSkyGradient(layers) {
        layers.push({
            y: 0,
            height: this.canvasHeight * 0.6,
            color: [0.3, 0.4, 0.2, 1.0],
            type: 'sky_gradient',
            speed: 0
        });
    }

    generateGround(layers) {
        const groundY = this.getGroundY(0.85);
        layers.push({
            y: groundY,
            height: this.canvasHeight - groundY,
            color: [0.2, 0.3, 0.15, 1.0],
            type: 'ground',
            speed: 0
        });
    }

    generateMushrooms(layers) {
        const config = TOXIC_SWAMP_CONFIG;
        const groundY = this.getGroundY(0.85);

        for (let i = 0; i < config.MUSHROOM_COUNT; i++) {
            const size = 25 + window.randomSecure() * 40;
            const x = (i + 0.3 + window.randomSecure() * 0.4) * this.canvasWidth / config.MUSHROOM_COUNT;

            layers.push({
                x,
                y: groundY - size,
                width: size,
                height: size,
                color: [
                    0.4 + window.randomSecure() * 0.2,
                    0.6 + window.randomSecure() * 0.3,
                    0.1,
                    0.75
                ],
                type: 'simple_shape',
                shape: 'mushroom_cap',
                speed: 4 + i * 1.8,
                offset: 0,
                spots: Math.floor(2 + window.randomSecure() * 4),
                glowing: true
            });
        }
    }

    generateBubbles(particles) {
        const config = TOXIC_SWAMP_CONFIG;
        
        for (let i = 0; i < config.BUBBLE_COUNT; i++) {
            particles.push({
                x: window.randomSecure() * this.canvasWidth,
                y: this.canvasHeight * 0.7 + window.randomSecure() * this.canvasHeight * 0.25,
                radius: 4 + window.randomSecure() * 10,
                speed: 12 + window.randomSecure() * 28,
                wobble: window.randomSecure() * Math.PI * 2,
                color: [0.5, 0.7, 0.2, 0.5],
                type: 'bubble',
                toxic: true
            });
        }
    }

    generateMist(particles) {
        const config = TOXIC_SWAMP_CONFIG;
        
        for (let i = 0; i < config.MIST_COUNT; i++) {
            particles.push({
                x: window.randomSecure() * this.canvasWidth,
                y: this.canvasHeight * 0.65 + window.randomSecure() * this.canvasHeight * 0.15,
                radius: 20 + window.randomSecure() * 30,
                speed: 8 + window.randomSecure() * 15,
                color: [0.4, 0.5, 0.3, 0.25],
                type: 'smoke',
                expansion: 1.05,
                drift: (window.randomSecure() - 0.5) * 20
            });
        }
    }

    generateToxicParticles(particles) {
        const config = TOXIC_SWAMP_CONFIG;
        
        for (let i = 0; i < config.TOXIC_PARTICLE_COUNT; i++) {
            const hue = window.randomSecure();
            
            particles.push({
                x: window.randomSecure() * this.canvasWidth,
                y: this.canvasHeight * 0.5 + window.randomSecure() * this.canvasHeight * 0.4,
                radius: 2 + window.randomSecure() * 4,
                speed: 10 + window.randomSecure() * 20,
                glow: window.randomSecure() * Math.PI * 2,
                color: [
                    0.3 + hue * 0.3,
                    0.6 + (1 - hue) * 0.3,
                    0.1,
                    0.6 + window.randomSecure() * 0.3
                ],
                type: 'firefly',
                driftX: (window.randomSecure() - 0.5) * 35,
                driftY: (window.randomSecure() - 0.5) * 25
            });
        }
    }
}
