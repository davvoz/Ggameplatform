/**
 * RenderingSystem - Orchestrates all rendering operations
 * Refactored following SOLID principles:
 * - Single Responsibility: Only coordinates rendering, delegates to specialized renderers
 * - Open/Closed: Extensible via RendererFactory, closed for modification
 * - Liskov Substitution: All renderers implement IEntityRenderer interface
 * - Interface Segregation: Specific interfaces for each renderer type
 * - Dependency Inversion: Depends on abstractions (IEntityRenderer), not concrete classes
 */
import { WebGLRenderer } from '../core/WebGLRenderer.js';
import { RendererFactory } from './renderers/RendererFactory.js';
import { BackgroundRenderer } from './renderers/BackgroundRenderer.js';
import { AnimationRenderer } from './renderers/AnimationRenderer.js';
import { ParticleRenderer } from './renderers/ParticleRenderer.js';
import { UIRenderer } from './renderers/UIRenderer.js';
import { PowerupUIRenderer } from './PowerupUIRenderer.js';

export class RenderingSystem {
    constructor(gl, canvasWidth, canvasHeight) {
        this.renderer = new WebGLRenderer(gl);
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Canvas 2D per testo
        this.textCanvas = document.getElementById('textCanvas');
        if (this.textCanvas) {
            this.textCanvas.width = canvasWidth;
            this.textCanvas.height = canvasHeight;
            this.textCtx = this.textCanvas.getContext('2d');
        } else {
            console.error('RenderingSystem: textCanvas not found!');
        }
        
        // Debug log
        if (!this.textCtx) {
            console.error('RenderingSystem: textCtx is null! UI buttons will not render.');
        }
        
        // Initialize specialized renderers
        this.factory = new RendererFactory(this.renderer, this.textCtx);
        this.backgroundRenderer = new BackgroundRenderer(this.renderer, canvasWidth, canvasHeight);
        this.animationRenderer = new AnimationRenderer(this.renderer, this.textCtx, canvasWidth, canvasHeight);
        this.particleRenderer = new ParticleRenderer(this.renderer);
        this.uiRenderer = new UIRenderer(this.renderer, this.textCtx, canvasWidth, canvasHeight);
        this.powerupUIRenderer = new PowerupUIRenderer(this.renderer, canvasWidth, canvasHeight);
    }

    // Setter methods for game state
    setBackground(layers, particles) {
        this.backgroundLayers = layers;
        this.backgroundParticles = particles;
    }

    setPowerupTimers(timers) {
        this.powerupTimers = timers;
    }

    setPlayer(player) {
        this.player = player;
    }

    setLevelUpAnimation(animation) {
        this.levelUpAnimation = animation;
    }
    
    setComboAnimation(animation) {
        this.comboAnimation = animation;
    }
    
    setFloatingTexts(texts) {
        this.floatingTexts = texts;
    }
    
    setAchievementNotifications(notifications) {
        this.achievementNotifications = notifications;
    }
    
    setScreenFlash(flash) {
        this.screenFlash = flash;
    }
    
    setCombo(combo) {
        this.currentCombo = combo || 0;
    }
    
    setLevelTransition(transition) {
        this.levelTransition = transition;
    }
    
    setDeathAnimation(animation) {
        this.deathAnimation = animation;
    }
    
    setTurboButton(turboButton) {
        this.turboButton = turboButton;
    }
    
    setFlightButton(flightButton) {
        this.flightButton = flightButton;
    }

    /**
     * Main render method - orchestrates all rendering in correct order
     * @param {WebGLRenderingContext} gl - WebGL context (not used, for compatibility)
     * @param {Array} entities - Flat array of all entities
     */
    render(gl, entities) {
        // Pulisci text canvas a ogni frame
        if (this.textCtx) {
            this.textCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        }

        // Build game state from internal data set via setters
        const gameState = {
            entities: entities || [],
            player: this.player,
            camera: { y: this.player?.y || 0 }
        };

        const context = this._buildRenderContext(gameState);
        
        // Rendering order (back to front):
        // 1. Background (layers, particles, ambient)
        if (this.backgroundLayers || this.backgroundParticles) {
            this.backgroundRenderer.backgroundLayers = this.backgroundLayers || [];
            this.backgroundRenderer.backgroundParticles = this.backgroundParticles || [];
            this.backgroundRenderer.render(context.time);
        }
        
        // 2. Entities (platforms, collectibles, obstacles, player)
        this._renderEntities(gameState, context);
        
        // 3. Animations
        this._renderAnimations();
        
        // 4. UI elements
        this._renderUI();
        
        // 5. Turbo/Flight buttons
        if (this.turboButton && this.player) {
            this.turboButton.render(this.renderer.gl, this, this.player);
        }
        if (this.flightButton && this.player) {
            this.flightButton.render(this.renderer.gl, this, this.player);
        }
    }

    /**
     * Render all game entities
     * @private
     */
    _renderEntities(gameState, context) {
        const entities = gameState.entities || [];
        
        // Separate entities by type for proper rendering order
        const platforms = [];
        const collectiblesAndPowerups = [];
        const particles = [];
        let player = null;
        
        // Viewport culling bounds
        const leftBound = -100;
        const rightBound = this.canvasWidth + 100;
        
        entities.forEach(entity => {
            if (!entity || !entity.type) return;
            
            // Skip offscreen entities for performance (except player)
            const x = entity.x || 0;
            const width = entity.width || entity.radius * 2 || 0;
            if (entity.type !== 'player' && (x + width < leftBound || x > rightBound)) {
                return;
            }
            
            // Categorize by type
            if (entity.type === 'player') {
                player = entity;
            } else if (entity.type.includes('particle') || entity.type.includes('Particle') || 
                       entity.type === 'sparkle' || entity.type === 'trail') {
                // All particle types (kebab-case, camelCase, and special particle types)
                particles.push(entity);
            } else if (entity.type.includes('platform') || entity.type === 'spike' || entity.type === 'enemy') {
                platforms.push(entity);
            } else {
                collectiblesAndPowerups.push(entity);
            }
        });
        
        // Render in correct order: platforms first, then collectibles, then particles
        platforms.forEach(entity => {
            this.factory.render(entity, context);
        });
        
        collectiblesAndPowerups.forEach(entity => {
            this.factory.render(entity, context);
        });
        
        // Render particles with batching optimization
        particles.forEach(p => {
            if (p.type === 'powerup-particle') {
                this.particleRenderer.renderPowerupParticle(p);
            } else if (p.type === 'boost-particle') {
                this.particleRenderer.renderBoostParticle(p);
            } else if (p.type === 'bonusParticle') {
                // Render bonus particles (from bonus collection effects)
                const color = p.color || [1.0, 0.8, 0.0, 1.0];
                const alpha = (p.life / p.maxLife) || 0.5;
                const finalColor = [...color];
                finalColor[3] = alpha;
                this.renderer.drawCircle(p.x, p.y, p.size || 3, finalColor);
            } else if (p.type === 'boostParticle') {
                // Render boost particles (from player boost effect)
                this.particleRenderer.renderBoostParticle(p);
            } else if (p.type === 'sparkle' || p.type === 'trail') {
                // Render sparkle/trail particles with color and fade
                const color = p.color || [1.0, 1.0, 1.0, 1.0];
                const alpha = p.alpha || ((p.life / p.maxLife) || 0.5);
                const finalColor = [...color];
                finalColor[3] = alpha;
                this.renderer.drawCircle(p.x, p.y, p.size || 2, finalColor);
            }
        });
        
        // Player always rendered last (on top)
        if (player) {
            this.factory.render(player, context);
        } else if (this.player) {
            // Fallback to player set via setter
            this.factory.render(this.player, context);
        }
    }

    /**
     * Render all animations
     * @private
     */
    _renderAnimations() {
        if (this.levelUpAnimation) {
            this.animationRenderer.renderLevelUpAnimation(this.levelUpAnimation);
        }
        
        if (this.comboAnimation) {
            this.animationRenderer.renderComboAnimation(this.comboAnimation);
        }
        
        if (this.levelTransition) {
            this.animationRenderer.renderLevelTransition(this.levelTransition);
        }
        
        if (this.deathAnimation) {
            this.animationRenderer.renderDeathAnimation(this.deathAnimation);
        }
        
        if (this.screenFlash) {
            this.animationRenderer.renderScreenFlash(this.screenFlash);
        }
    }

    /**
     * Render all UI elements
     * @private
     */
    _renderUI() {
        // Floating texts
        if (this.floatingTexts) {
            this.floatingTexts.forEach(text => {
                this.uiRenderer.renderFloatingText(text);
            });
        }
        
        // Achievement notifications
        if (this.achievementNotifications) {
            this.uiRenderer.renderAchievementNotifications(this.achievementNotifications);
        }
        
        // Powerup UI
        if (this.powerupTimers && this.powerupUIRenderer) {
            // Update player health for hearts display
            if (this.player && this.player.health !== undefined) {
                this.powerupUIRenderer.setPlayerHealth(this.player.health, this.player.maxHealth || 3);
            }
            this.powerupUIRenderer.render(this.powerupTimers, Date.now());
        }
    }

    /**
     * Build rendering context from game state
     * @private
     */
    _buildRenderContext(gameState) {
        return {
            camera: gameState.camera,
            time: Date.now() / 1000, // Convert to seconds
            scrollSpeed: gameState.scrollSpeed || 0,
            cameraY: gameState.camera?.y || 0,
            effects: {
                shake: gameState.screenShake || { x: 0, y: 0 },
                zoom: gameState.zoom || 1.0,
                tilt: gameState.cameraTilt || 0
            },
            player: gameState.player
        };
    }

    /**
     * Check if entity is visible on screen
     * @private
     */
    _isVisible(entity, context) {
        // Render all entities - visibility culling disabled for now to match original behavior
        return true;
    }

    /**
     * Update background animation state
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        this.backgroundRenderer.update(deltaTime);
        if (this.powerupUIRenderer) {
            this.powerupUIRenderer.update(deltaTime);
        }
    }

    /**
     * Update canvas dimensions
     */
    updateDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        
        // Update textCanvas dimensions
        if (this.textCanvas) {
            this.textCanvas.width = width;
            this.textCanvas.height = height;
        }
        
        this.backgroundRenderer.canvasWidth = width;
        this.backgroundRenderer.canvasHeight = height;
        this.animationRenderer.updateDimensions(width, height);
        this.uiRenderer.updateDimensions(width, height);
    }
}
