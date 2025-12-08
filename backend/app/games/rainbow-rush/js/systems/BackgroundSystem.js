/**
 * BackgroundSystem - Modern OOP implementation
 * Follows SOLID principles and SonarQube best practices
 * 
 * Single Responsibility: Manages background themes and transitions
 * Open/Closed: Easy to add new themes via factory
 * Liskov Substitution: All generators follow base interface
 * Interface Segregation: Clear separation of concerns
 * Dependency Inversion: Depends on factory abstraction
 */

import { ThemeGeneratorFactory } from './background/ThemeGeneratorFactory.js';
import { THEME_NAMES, DEFAULT_THEME_SEQUENCE, TRANSITION_CONFIG } from './background/ThemeConfigurations.js';

export { THEME_NAMES as BackgroundThemes };

export class BackgroundSystem {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Dependency Injection - inject factory
        this.themeFactory = new ThemeGeneratorFactory(canvasWidth, canvasHeight);
        
        // Current state
        this.currentTheme = THEME_NAMES.SKY;
        this.animationTime = 0;
        this.layers = [];
        this.particles = [];
        this.baseColors = [];
        
        // Transition state
        this.transitionState = this.createTransitionState();
        
        // Theme sequence for level progression
        this.themeSequence = [...DEFAULT_THEME_SEQUENCE];
        
        // Initialize first theme (async but non-blocking)
        this.initializeTheme().catch(err => console.error('Theme init error:', err));
    }

    createTransitionState() {
        return {
            isTransitioning: false,
            progress: 0,
            duration: TRANSITION_CONFIG.DURATION,
            nextTheme: null,
            oldLayers: [],
            oldParticles: [],
            oldBaseColors: null,
            newLayers: [],
            newParticles: [],
            newBaseColors: null
        };
    }

    /**
     * Set level and trigger theme change if needed
     * @param {number} level - Current level number
     */
    setLevel(level) {
        const themeIndex = (level - 1) % this.themeSequence.length;
        const newTheme = this.themeSequence[themeIndex];
        
        if (newTheme !== this.currentTheme) {
            this.startTransition(newTheme);
        }
    }

    /**
     * Start transition to new theme
     * @param {string} newTheme - Name of new theme
     */
    startTransition(newTheme) {
        if (this.transitionState.isTransitioning) {
            return; // Avoid overlapping transitions
        }
        
        if (!this.themeFactory.hasTheme(newTheme)) {
            console.warn(`Theme ${newTheme} not available`);
            return;
        }

        this.transitionState.isTransitioning = true;
        this.transitionState.progress = 0;
        this.transitionState.nextTheme = newTheme;
        
        // Save current state
        this.saveCurrentState();
        
        // Generate new theme
        this.generateNewThemeState(newTheme);
    }

    saveCurrentState() {
        this.transitionState.oldLayers = [...this.layers];
        this.transitionState.oldParticles = [...this.particles];
        this.transitionState.oldBaseColors = [...this.baseColors];
    }

    async generateNewThemeState(themeName) {
        const themeData = await this.themeFactory.generateTheme(themeName);
        
        if (themeData) {
            this.transitionState.newLayers = themeData.layers;
            this.transitionState.newParticles = themeData.particles;
            this.transitionState.newBaseColors = themeData.baseColors;
        }
    }

    /**
     * Initialize current theme (async)
     */
    async initializeTheme() {
        const themeData = await this.themeFactory.generateTheme(this.currentTheme);
        
        if (themeData) {
            this.layers = themeData.layers;
            this.particles = themeData.particles;
            this.baseColors = themeData.baseColors;
        } else {
            console.error(`Failed to initialize theme: ${this.currentTheme}`);
            this.layers = [];
            this.particles = [];
            this.baseColors = [[0.4, 0.7, 1.0, 1.0], [0.6, 0.85, 1.0, 1.0]];
        }
    }

    /**
     * Update animation state
     * @param {number} deltaTime - Time since last update in seconds
     * @param {number} cameraSpeed - Camera scroll speed for parallax effect
     */
    update(deltaTime, cameraSpeed = 0) {
        this.animationTime += deltaTime;
        
        if (this.transitionState.isTransitioning) {
            this.updateTransition(deltaTime);
        }
        
        this.updateLayers(deltaTime, cameraSpeed);
        this.updateParticles(deltaTime, cameraSpeed);
    }

    updateLayers(deltaTime, cameraSpeed) {
        this.layers.forEach(layer => {
            if (!layer.offset) {
                layer.offset = 0;
            }
            
            // Apply parallax effect based on layer speed
            const layerSpeed = layer.speed || 0;
            const parallaxFactor = layerSpeed * 0.1; // Adjust parallax strength
            layer.offset += (cameraSpeed * parallaxFactor) * deltaTime;
            
            // Wrap offset for seamless scrolling (optional, depends on layer type)
            if (layer.offset > this.canvasWidth * 2) {
                layer.offset = 0;
            }
        });
    }

    updateTransition(deltaTime) {
        this.transitionState.progress += deltaTime / this.transitionState.duration;
        
        if (this.transitionState.progress >= 1.0) {
            this.completeTransition();
        }
    }

    completeTransition() {
        this.currentTheme = this.transitionState.nextTheme;
        this.layers = this.transitionState.newLayers;
        this.particles = this.transitionState.newParticles;
        this.baseColors = this.transitionState.newBaseColors;
        
        this.transitionState = this.createTransitionState();
    }

    updateParticles(deltaTime, cameraSpeed) {
        this.particles.forEach(particle => {
            this.updateParticlePosition(particle, deltaTime, cameraSpeed);
        });
    }

    updateParticlePosition(particle, deltaTime, cameraSpeed) {
        if (!particle.speed) return;

        switch (particle.type) {
            case 'cloud':
            case 'bird':
            case 'fish':
                // Move left with speed + parallax camera effect
                particle.x -= (particle.speed + cameraSpeed) * deltaTime;
                if (particle.x < -100) {
                    particle.x = this.canvasWidth + 100;
                    particle.y = Math.random() * this.canvasHeight * (particle.type === 'fish' ? 0.8 : 0.6);
                }
                // Update animation phases
                if (particle.type === 'bird') {
                    particle.wingPhase = (particle.wingPhase || 0) + deltaTime * 5;
                } else if (particle.type === 'fish') {
                    particle.swimPhase = (particle.swimPhase || 0) + deltaTime * 4;
                }
                break;
                
            case 'bubble':
                // Rise up with wobble
                particle.y -= particle.speed * deltaTime;
                particle.wobble = (particle.wobble || 0) + deltaTime * 2;
                particle.x += Math.sin(particle.wobble) * 15 * deltaTime;
                particle.x -= cameraSpeed * deltaTime; // Camera parallax
                if (particle.y < this.canvasHeight * 0.3) {
                    particle.y = this.canvasHeight;
                    particle.x = Math.random() * this.canvasWidth;
                }
                break;
                
            case 'snowflake':
                // Fall down with drift
                particle.y += particle.speed * deltaTime;
                particle.drift = particle.drift || (Math.random() - 0.5) * 20;
                particle.x += particle.drift * deltaTime;
                particle.x -= cameraSpeed * deltaTime; // Camera parallax
                if (particle.y > this.canvasHeight + 20) {
                    particle.y = -20;
                    particle.x = Math.random() * this.canvasWidth;
                }
                break;
                
            case 'sand':
            case 'ember':
                particle.x -= (particle.speed + cameraSpeed) * deltaTime;
                if (particle.type === 'ember') {
                    particle.y -= particle.speed * deltaTime * 0.5; // Rise up
                    // Horizontal drift for embers
                    if (particle.horizontalDrift) {
                        particle.x += particle.horizontalDrift * deltaTime * 0.3;
                    }
                }
                if (particle.x < 0 || (particle.type === 'ember' && particle.y < 0)) {
                    particle.x = this.canvasWidth;
                    particle.y = this.canvasHeight * (0.5 + Math.random() * 0.5);
                }
                break;
                
            case 'smoke':
                particle.y -= particle.speed * deltaTime; // Rise up
                particle.x += (particle.drift || 0) * deltaTime;
                particle.x -= cameraSpeed * deltaTime; // Camera parallax
                particle.expansion = (particle.expansion || 1) + deltaTime * 0.5;
                particle.color[3] = Math.max(0, particle.color[3] - deltaTime * 0.3);
                
                if (particle.color[3] <= 0 || particle.y < 0) {
                    // Respawn
                    particle.x = this.canvasWidth * 0.65 + (Math.random() - 0.5) * 60;
                    particle.y = this.canvasHeight * 0.35 - 20;
                    particle.expansion = 1;
                    particle.color[3] = 0.4;
                }
                break;
                
            case 'star':
                particle.x -= (particle.speed || 10 + cameraSpeed) * deltaTime;
                particle.twinkle = (particle.twinkle || 0) + deltaTime * 2;
                if (particle.x < 0) {
                    particle.x = this.canvasWidth;
                    particle.y = Math.random() * this.canvasHeight;
                }
                break;
                
            case 'leaf':
                particle.y += particle.speed * deltaTime;
                particle.x += particle.drift * deltaTime;
                particle.x -= cameraSpeed * deltaTime; // Camera parallax
                particle.rotation = (particle.rotation || 0) + (particle.rotationSpeed || 1) * deltaTime;
                if (particle.y > this.canvasHeight) {
                    particle.y = -10;
                    particle.x = Math.random() * this.canvasWidth;
                }
                break;
        }
    }

    /**
     * Get current layers for rendering
     * @returns {Array} Current layers
     */
    getLayers() {
        if (this.transitionState.isTransitioning) {
            return this.interpolateLayers();
        }
        return this.layers;
    }

    /**
     * Get current particles for rendering
     * @returns {Array} Current particles
     */
    getParticles() {
        if (this.transitionState.isTransitioning) {
            return this.interpolateParticles();
        }
        return this.particles;
    }

    /**
     * Get current base colors
     * @returns {Array} Base colors for gradient
     */
    getBaseColors() {
        if (this.transitionState.isTransitioning) {
            return this.interpolateColors(
                this.transitionState.oldBaseColors,
                this.transitionState.newBaseColors,
                this.transitionState.progress
            );
        }
        return this.baseColors;
    }

    /**
     * Get background color (alias for compatibility)
     * @returns {Array} First base color as RGBA array
     */
    getBackgroundColor() {
        const colors = this.getBaseColors();
        return colors && colors.length > 0 ? colors[0] : [0.4, 0.7, 1.0, 1.0];
    }

    interpolateLayers() {
        // During transition, blend old and new layers based on progress
        const progress = this.easeInOutQuad(this.transitionState.progress);
        
        // Simple approach: fade out old, fade in new
        const oldLayersWithAlpha = this.transitionState.oldLayers.map(layer => ({
            ...layer,
            color: this.applyAlpha(layer.color, 1 - progress)
        }));
        
        const newLayersWithAlpha = this.transitionState.newLayers.map(layer => ({
            ...layer,
            color: this.applyAlpha(layer.color, progress)
        }));
        
        return [...oldLayersWithAlpha, ...newLayersWithAlpha];
    }

    interpolateParticles() {
        const progress = this.easeInOutQuad(this.transitionState.progress);
        
        const oldParticlesWithAlpha = this.transitionState.oldParticles.map(p => ({
            ...p,
            color: this.applyAlpha(p.color, 1 - progress)
        }));
        
        const newParticlesWithAlpha = this.transitionState.newParticles.map(p => ({
            ...p,
            color: this.applyAlpha(p.color, progress)
        }));
        
        return [...oldParticlesWithAlpha, ...newParticlesWithAlpha];
    }

    interpolateColors(colors1, colors2, t) {
        if (!colors1 || !colors2) return colors1 || colors2 || [];
        
        return colors1.map((color1, index) => {
            const color2 = colors2[index] || color1;
            return [
                color1[0] + (color2[0] - color1[0]) * t,
                color1[1] + (color2[1] - color1[1]) * t,
                color1[2] + (color2[2] - color1[2]) * t,
                color1[3] + (color2[3] - color1[3]) * t
            ];
        });
    }

    applyAlpha(color, alpha) {
        return [...color.slice(0, 3), color[3] * alpha];
    }

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    /**
     * Register custom theme generator
     * @param {BaseThemeGenerator} generator - Custom generator
     */
    registerThemeGenerator(generator) {
        this.themeFactory.registerGenerator(generator);
    }

    /**
     * Update canvas dimensions
     * @param {number} width - New width
     * @param {number} height - New height
     */
    updateDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.themeFactory.updateDimensions(width, height);
        this.initializeTheme();
    }

    /**
     * Get available themes
     * @returns {Array<string>} Array of theme names
     */
    getAvailableThemes() {
        return this.themeFactory.getAvailableThemes();
    }
}
