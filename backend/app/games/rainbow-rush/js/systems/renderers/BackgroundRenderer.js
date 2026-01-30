/**
 * BackgroundRenderer - Modern OOP implementation
 * Follows SOLID principles and SonarQube best practices
 * 
 * Single Responsibility: Coordinates background rendering using specialized renderers
 * Open/Closed: Easy to extend with new renderer types via factories
 * Liskov Substitution: All renderers follow base interfaces
 * Interface Segregation: Separate interfaces for layers and particles
 * Dependency Inversion: Depends on abstractions (factories) not concrete implementations
 */

import { LayerRendererFactory } from './background/LayerRendererFactory.js';
import { ParticleRendererFactory } from './background/ParticleRendererFactory.js';
import { AMBIENT_PARTICLE_CONFIG, GRADIENT_CONFIG } from './background/BackgroundRendererConfig.js';

export class BackgroundRenderer {
    constructor(renderer, canvasWidth, canvasHeight) {
        this.renderer = renderer;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Dependency Injection - inject factories
        this.layerFactory = new LayerRendererFactory(renderer);
        this.particleFactory = new ParticleRendererFactory(renderer);
        
        // State
        this.backgroundLayers = [];
        this.backgroundParticles = [];
        this.ambientParticles = [];
        this.backgroundColor = GRADIENT_CONFIG.DEFAULT_BG_COLOR;
        
        this.initAmbientParticles();
    }

    /**
     * Set background layers and particles
     * @param {Array} layers - Background layers
     * @param {Array} particles - Background particles
     */
    setBackground(layers, particles) {
        this.backgroundLayers = layers;
        this.backgroundParticles = particles;
    }

    /**
     * Set background color
     * @param {Array} color - RGBA color array
     */
    setBackgroundColor(color) {
        this.backgroundColor = color;
    }

    /**
     * Update canvas dimensions and reinitialize particles
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    updateDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.initAmbientParticles();
    }

    /**
     * Initialize ambient particles (stars, energy)
     * Follows configuration from BackgroundRendererConfig
     */
    initAmbientParticles() {
        this.ambientParticles = [];
        this.createStarParticles();
        this.createEnergyParticles();
    }

    createStarParticles() {
        const config = AMBIENT_PARTICLE_CONFIG.STARS;
        
        for (let i = 0; i < config.COUNT; i++) {
            this.ambientParticles.push({
                type: 'star',
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                size: config.SIZE,
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: config.TWINKLE_SPEED,
                brightness: config.BRIGHTNESS,
                color: [...config.COLOR],
                radius: config.SIZE
            });
        }
    }

    createEnergyParticles() {
        const config = AMBIENT_PARTICLE_CONFIG.ENERGY;
        
        for (let i = 0; i < config.COUNT; i++) {
            this.ambientParticles.push({
                type: 'energy',
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                size: config.MIN_SIZE + Math.random() * (config.MAX_SIZE - config.MIN_SIZE),
                vx: (Math.random() - 0.5) * config.SPEED,
                vy: (Math.random() - 0.5) * config.SPEED,
                life: 1.0,
                maxLife: config.MIN_LIFE + Math.random() * (config.MAX_LIFE - config.MIN_LIFE),
                color: [
                    0.4 + Math.random() * 0.6,
                    0.5 + Math.random() * 0.5,
                    0.8 + Math.random() * 0.2
                ],
                radius: config.MIN_SIZE + Math.random() * (config.MAX_SIZE - config.MIN_SIZE)
            });
        }
    }

    /**
     * Update particle positions and states
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        this.ambientParticles.forEach(particle => {
            if (particle.type === 'energy') {
                this.updateEnergyParticle(particle, deltaTime);
            }
        });
    }

    updateEnergyParticle(particle, deltaTime) {
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        particle.life -= deltaTime;
        
        if (particle.life <= 0) {
            this.resetEnergyParticle(particle);
        }
        
        this.wrapParticlePosition(particle);
    }

    resetEnergyParticle(particle) {
        particle.x = Math.random() * this.canvasWidth;
        particle.y = Math.random() * this.canvasHeight;
        particle.vx = (Math.random() - 0.5) * AMBIENT_PARTICLE_CONFIG.ENERGY.SPEED;
        particle.vy = (Math.random() - 0.5) * AMBIENT_PARTICLE_CONFIG.ENERGY.SPEED;
        particle.life = particle.maxLife;
    }

    wrapParticlePosition(particle) {
        if (particle.x < 0) particle.x = this.canvasWidth;
        if (particle.x > this.canvasWidth) particle.x = 0;
        if (particle.y < 0) particle.y = this.canvasHeight;
        if (particle.y > this.canvasHeight) particle.y = 0;
    }

    /**
     * Main render method - orchestrates all rendering
     * @param {number} time - Current time in seconds
     */
    render(time) {
        const context = this.createRenderContext(time);
        
        this.renderBaseBackground();
        this.renderLayers(context);
        this.renderParticles(context);
        this.renderAmbientParticles(context);
    }

    createRenderContext(time) {
        return {
            time,
            canvasWidth: this.canvasWidth,
            canvasHeight: this.canvasHeight
        };
    }

    renderBaseBackground() {
        this.renderer.drawRect(
            0, 0,
            this.canvasWidth,
            this.canvasHeight,
            this.backgroundColor
        );
    }

    /**
     * Render all background layers using strategy pattern
     * @param {Object} context - Rendering context
     */
    renderLayers(context) {
        for (const layer of this.backgroundLayers) {
            const layerRenderer = this.layerFactory.getRenderer(layer.type);
            
            if (layerRenderer) {
                layerRenderer.render(layer, context);
            } else {

            }
        }
    }

    /**
     * Render all background particles using strategy pattern
     * @param {Object} context - Rendering context
     */
    renderParticles(context) {
        for (const particle of this.backgroundParticles) {
            const particleRenderer = this.particleFactory.getRenderer(particle.type);
            
            if (particleRenderer) {
                particleRenderer.render(particle, context);
            } else {

            }
        }
    }

    /**
     * Render ambient particles (stars, energy)
     * @param {Object} context - Rendering context
     */
    renderAmbientParticles(context) {
        for (const particle of this.ambientParticles) {
            const particleRenderer = this.particleFactory.getRenderer(particle.type);
            
            if (particleRenderer) {
                particleRenderer.render(particle, context);
            }
        }
    }

    /**
     * Register custom layer renderer
     * Allows extending functionality without modifying core code
     * @param {BaseLayerRenderer} renderer - Custom renderer
     */
    registerLayerRenderer(renderer) {
        this.layerFactory.registerRenderer(renderer);
    }

    /**
     * Register custom particle renderer
     * Allows extending functionality without modifying core code
     * @param {BaseParticleRenderer} renderer - Custom renderer
     */
    registerParticleRenderer(renderer) {
        this.particleFactory.registerRenderer(renderer);
    }
}
