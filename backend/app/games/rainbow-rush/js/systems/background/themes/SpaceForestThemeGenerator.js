import { BaseThemeGenerator } from '../BaseThemeGenerator.js';
import { SPACE_FOREST_CONFIG, THEME_NAMES } from '../ThemeConfigurations.js';

/**
 * Space Forest Theme Generator
 * Single Responsibility: Generate hybrid space-forest theme with cosmic trees
 * Hybrid: Combines forest elements with space/nebula effects
 */
export class SpaceForestThemeGenerator extends BaseThemeGenerator {
    getThemeName() {
        return THEME_NAMES.SPACE_FOREST;
    }

    getBaseColors() {
        return SPACE_FOREST_CONFIG.BASE_COLORS;
    }

    generateLayers(layers) {
        this.generateSkyGradient(layers);
        this.generateNebulae(layers);
        this.generatePlanets(layers);
        this.generateTrees(layers);
        this.generateGround(layers);
    }

    generateParticles(particles) {
        this.generateStars(particles);
        this.generateFireflies(particles);
    }

    generateSkyGradient(layers) {
        layers.push({
            y: 0,
            height: this.canvasHeight * 0.7,
            color: [0.1, 0.15, 0.25, 1.0],
            type: 'sky_gradient',
            speed: 0
        });
    }

    generateGround(layers) {
        const groundY = this.getGroundY(0.85);
        layers.push({
            y: groundY,
            height: this.canvasHeight - groundY,
            color: [0.15, 0.25, 0.15, 1.0],
            type: 'ground',
            speed: 0
        });
    }

    generateNebulae(layers) {
        const config = SPACE_FOREST_CONFIG;
        
        for (let i = 0; i < config.NEBULA_COUNT; i++) {
            const hue = Math.random();
            
            layers.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight * 0.5,
                width: 180 + Math.random() * 120,
                color: [
                    0.3 + hue * 0.6,
                    0.5 - hue * 0.3,
                    0.7 + Math.random() * 0.3,
                    0.15
                ],
                type: 'nebula',
                speed: 2 + i * 1.5,
                offset: 0
            });
        }
    }

    generatePlanets(layers) {
        const config = SPACE_FOREST_CONFIG;
        
        for (let i = 0; i < config.PLANET_COUNT; i++) {
            const radius = 25 + Math.random() * 40;
            const hue = Math.random();
            
            layers.push({
                x: (i + 1) * this.canvasWidth / (config.PLANET_COUNT + 1),
                y: this.getSkyY(0.2 + Math.random() * 0.3),
                radius,
                color: [
                    0.4 + hue * 0.5,
                    0.5 + (1 - hue) * 0.4,
                    0.6 + Math.random() * 0.3,
                    0.7
                ],
                type: 'planet',
                speed: 4 + i * 2,
                offset: 0
            });
        }
    }

    generateTrees(layers) {
        const config = SPACE_FOREST_CONFIG;
        const groundY = this.getGroundY(0.85);

        for (let i = 0; i < config.TREE_COUNT; i++) {
            const width = 50 + Math.random() * 70;
            const height = 100 + Math.random() * 120;
            const x = (i + 0.5) * this.canvasWidth / config.TREE_COUNT;
            const hue = Math.random();

            layers.push({
                x,
                y: groundY - height,
                width,
                height,
                color: [
                    0.2 + hue * 0.3,
                    0.3 + (1 - hue) * 0.4,
                    0.4 + Math.random() * 0.3,
                    0.7
                ],
                type: 'tree',
                speed: 5 + i * 2,
                swayPhase: Math.random() * Math.PI * 2,
                offset: 0,
                cosmic: true,
                glowColor: [
                    0.4 + hue * 0.6,
                    0.6 + (1 - hue) * 0.4,
                    0.8,
                    0.3
                ]
            });
        }
    }

    generateStars(particles) {
        const config = SPACE_FOREST_CONFIG;
        
        for (let i = 0; i < config.STAR_COUNT; i++) {
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight * 0.7,
                radius: 1 + Math.random() * 2,
                twinkle: Math.random() * Math.PI * 2,
                color: [0.9 + Math.random() * 0.1, 0.9 + Math.random() * 0.1, 1.0, 0.6 + Math.random() * 0.4],
                type: 'star'
            });
        }
    }

    generateFireflies(particles) {
        const config = SPACE_FOREST_CONFIG;
        
        for (let i = 0; i < config.FIREFLY_COUNT; i++) {
            const hue = Math.random();
            
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: this.canvasHeight * 0.4 + Math.random() * this.canvasHeight * 0.4,
                radius: 2 + Math.random() * 3,
                speed: 18 + Math.random() * 28,
                glow: Math.random() * Math.PI * 2,
                color: [
                    0.5 + hue * 0.5,
                    0.8 - hue * 0.3,
                    1.0,
                    0.8
                ],
                type: 'firefly',
                driftX: (Math.random() - 0.5) * 45,
                driftY: (Math.random() - 0.5) * 35
            });
        }
    }
}
