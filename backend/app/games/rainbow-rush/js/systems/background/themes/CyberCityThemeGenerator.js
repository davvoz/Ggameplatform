import { BaseThemeGenerator } from '../BaseThemeGenerator.js';
import { CYBER_CITY_CONFIG, THEME_NAMES } from '../ThemeConfigurations.js';

/**
 * Cyber City Theme Generator
 * Single Responsibility: Generate cyberpunk city theme with neon lights and flying vehicles
 */
export class CyberCityThemeGenerator extends BaseThemeGenerator {
    getThemeName() {
        return THEME_NAMES.CYBER_CITY;
    }

    getBaseColors() {
        return CYBER_CITY_CONFIG.BASE_COLORS;
    }

    generateLayers(layers) {
        this.generateSkyGradient(layers);
        this.generateGridLines(layers);
        this.generateBuildings(layers);
        this.generateGround(layers);
    }

    generateParticles(particles) {
        this.generateNeonParticles(particles);
        this.generateFlyingVehicles(particles);
    }

    generateSkyGradient(layers) {
        layers.push({
            y: 0,
            height: this.canvasHeight * 0.6,
            color: [0.1, 0.1, 0.2, 1.0],
            type: 'sky_gradient',
            speed: 0
        });
    }

    generateGround(layers) {
        const groundY = this.getGroundY(0.85);
        layers.push({
            y: groundY,
            height: this.canvasHeight - groundY,
            color: [0.05, 0.05, 0.1, 1.0],
            type: 'ground',
            speed: 0
        });
    }

    generateGridLines(layers) {
        const config = CYBER_CITY_CONFIG;
        
        for (let i = 0; i < config.GRID_LINE_COUNT; i++) {
            layers.push({
                y: this.canvasHeight * (0.4 + i * 0.05),
                color: [0.3, 0.0, 0.5, 0.15 - i * 0.01],
                type: 'simple_shape',
                shape: 'line',
                speed: 15 + i * 5,
                offset: 0,
                thickness: 1
            });
        }
    }

    generateBuildings(layers) {
        const config = CYBER_CITY_CONFIG;
        const groundY = this.getGroundY(0.85);

        for (let i = 0; i < config.BUILDING_COUNT; i++) {
            const width = 40 + Math.random() * 60;
            const height = 120 + Math.random() * 180;
            const x = (i + 0.5) * this.canvasWidth / config.BUILDING_COUNT;
            const hue = Math.random();

            layers.push({
                x: x - width / 2,
                y: groundY - height,
                width,
                height,
                color: [0.1, 0.1, 0.15, 0.8],
                type: 'simple_shape',
                shape: 'rectangle',
                speed: 6 + i * 2,
                offset: 0,
                neonColor: [
                    0.4 + hue * 0.6,
                    0.2 + (1 - hue) * 0.6,
                    0.8 + Math.random() * 0.2,
                    0.6
                ],
                windows: true
            });
        }
    }

    generateNeonParticles(particles) {
        const config = CYBER_CITY_CONFIG;
        
        for (let i = 0; i < config.NEON_PARTICLE_COUNT; i++) {
            const hue = Math.random();
            
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: this.canvasHeight * 0.3 + Math.random() * this.canvasHeight * 0.5,
                radius: 2 + Math.random() * 4,
                speed: 15 + Math.random() * 35,
                glow: Math.random() * Math.PI * 2,
                color: [
                    0.5 + hue * 0.5,
                    0.3 + (1 - hue) * 0.5,
                    0.9 + Math.random() * 0.1,
                    0.7 + Math.random() * 0.3
                ],
                type: 'firefly',
                driftX: (Math.random() - 0.5) * 50,
                driftY: (Math.random() - 0.5) * 30
            });
        }
    }

    generateFlyingVehicles(particles) {
        const config = CYBER_CITY_CONFIG;
        
        for (let i = 0; i < config.FLYING_VEHICLE_COUNT; i++) {
            const hue = Math.random();
            
            particles.push({
                x: Math.random() * this.canvasWidth,
                y: this.canvasHeight * 0.3 + Math.random() * this.canvasHeight * 0.4,
                speed: 45 + Math.random() * 65,
                size: 8 + Math.random() * 12,
                color: [
                    0.6 + hue * 0.4,
                    0.4 + (1 - hue) * 0.4,
                    0.9,
                    0.8
                ],
                type: 'creature',
                trailColor: [
                    0.5 + hue * 0.5,
                    0.3 + (1 - hue) * 0.5,
                    0.9,
                    0.4
                ]
            });
        }
    }
}
