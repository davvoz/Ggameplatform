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
            const size = 25 + Math.random() * 40;
            const x = (i + 0.3 + Math.random() * 0.4) * this.canvasWidth / config.MUSHROOM_COUNT;

            layers.push({
                x,
                y: groundY - size,
                width: size,
                height: size,
                color: [
                    0.4 + Math.random() * 0.2,
                    0.6 + Math.random() * 0.3,
                    0.1,
                    0.75
                ],
                type: 'simple_shape',
                shape: 'mushroom_cap',
                speed: 4 + i * 1.8,
                offset: 0,
                spots: Math.floor(2 + Math.random() * 4),
                glowing: true
            });
        }
    }

    generateBubbles(particles) {
        const config = TOXIC_SWAMP_CONFIG;
        
        for (let i = 0; i < config.BUBBLE_COUNT; i++) {
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: this.canvasHeight * 0.7 + Math.random() * this.canvasHeight * 0.25,
                radius: 4 + Math.random() * 10,
                speed: 12 + Math.random() * 28,
                wobble: Math.random() * Math.PI * 2,
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
                x: Math.random() * this.canvasWidth,
                y: this.canvasHeight * 0.65 + Math.random() * this.canvasHeight * 0.15,
                radius: 20 + Math.random() * 30,
                speed: 8 + Math.random() * 15,
                color: [0.4, 0.5, 0.3, 0.25],
                type: 'smoke',
                expansion: 1.05,
                drift: (Math.random() - 0.5) * 20
            });
        }
    }

    generateToxicParticles(particles) {
        const config = TOXIC_SWAMP_CONFIG;
        
        for (let i = 0; i < config.TOXIC_PARTICLE_COUNT; i++) {
            const hue = Math.random();
            
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: this.canvasHeight * 0.5 + Math.random() * this.canvasHeight * 0.4,
                radius: 2 + Math.random() * 4,
                speed: 10 + Math.random() * 20,
                glow: Math.random() * Math.PI * 2,
                color: [
                    0.3 + hue * 0.3,
                    0.6 + (1 - hue) * 0.3,
                    0.1,
                    0.6 + Math.random() * 0.3
                ],
                type: 'firefly',
                driftX: (Math.random() - 0.5) * 35,
                driftY: (Math.random() - 0.5) * 25
            });
        }
    }
}
