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
import { LevelProgressBarRenderer } from './renderers/LevelProgressBarRenderer.js';
import { HUDRenderer } from './HUDRenderer.js';

export class RenderingSystem {
    constructor(gl, canvasWidth, canvasHeight) {
        this.renderer = new WebGLRenderer(gl);
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Canvas 2D per testo - deve avere le STESSE dimensioni del gameCanvas
        this.textCanvas = document.getElementById('textCanvas');
        const gameCanvas = document.getElementById('gameCanvas');
        
        if (this.textCanvas && gameCanvas) {
            // Copia le stesse dimensioni del gameCanvas (sia internal che CSS)
            this.textCanvas.width = gameCanvas.width;
            this.textCanvas.height = gameCanvas.height;
            this.textCanvas.style.width = gameCanvas.style.width;
            this.textCanvas.style.height = gameCanvas.style.height;
            this.textCtx = this.textCanvas.getContext('2d');
        } else {
            console.error('RenderingSystem: textCanvas or gameCanvas not found!');
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
        this.levelProgressBarRenderer = new LevelProgressBarRenderer(this.renderer, this.textCtx);
        this.hudRenderer = new HUDRenderer(this.renderer, this.textCtx, canvasWidth, canvasHeight);
        
        // HUD state
        this.currentScore = 0;
        this.currentLevel = 1;
        this.isPaused = false;
    }

    // Setter methods for game state
    setBackground(layers, particles, backgroundColor) {
        this.backgroundLayers = layers;
        this.backgroundParticles = particles;
        if (backgroundColor && this.backgroundRenderer) {
            this.backgroundRenderer.setBackgroundColor(backgroundColor);
        }
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
    
    setLevelProgressBar(progressBar) {
        this.levelProgressBar = progressBar;
    }
    
    setScore(score) {
        this.currentScore = score;
    }
    
    setLevel(level) {
        this.currentLevel = level;
    }
    
    setIsPaused(isPaused) {
        this.isPaused = isPaused;
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
        
        // Rendering normale del gioco
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
        
        // Render level progress bar
        if (this.levelProgressBar) {
            this.levelProgressBarRenderer.render(this.levelProgressBar);
        }
        
        // 6. Turbo/Flight buttons
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
        
        // AGGRESSIVE viewport culling bounds - più stretti
        const leftBound = -50;
        const rightBound = this.canvasWidth + 50;
        const topBound = -50;
        const bottomBound = this.canvasHeight + 50;
        
        entities.forEach(entity => {
            if (!entity || !entity.type) return;
            
            // Skip offscreen entities for performance (except player)
            const x = entity.x || 0;
            const y = entity.y || 0;
            const width = entity.width || (entity.radius ? entity.radius * 2 : 0);
            const height = entity.height || (entity.radius ? entity.radius * 2 : 0);
            
            if (entity.type !== 'player') {
                if (x + width < leftBound || x > rightBound || 
                    y + height < topBound || y > bottomBound) {
                    return;
                }
            }
            
            // Categorize by type
            if (entity.type === 'player') {
                player = entity;
            } else if (entity.type === 'goalFlag') {
                // Goal flag sempre visibile e renderizzato con le piattaforme
                platforms.push(entity);
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
        
        // OPTIMIZED: Batch render particles by type to reduce context switches
        const powerupParticles = [];
        const boostParticles = [];
        const otherParticles = [];
        
        particles.forEach(p => {
            if (p.type === 'powerup-particle') {
                powerupParticles.push(p);
            } else if (p.type === 'boost-particle' || p.type === 'boostParticle') {
                boostParticles.push(p);
            } else {
                otherParticles.push(p);
            }
        });
        
        // Batch render each type
        powerupParticles.forEach(p => this.particleRenderer.renderPowerupParticle(p));
        boostParticles.forEach(p => this.particleRenderer.renderBoostParticle(p));
        
        // Render other particles in single pass
        otherParticles.forEach(p => {
            const color = p.color || [1.0, 0.8, 0.0, 1.0];
            const alpha = p.alpha || ((p.life / p.maxLife) || 0.5);
            const finalColor = [...color];
            finalColor[3] = alpha;
            this.renderer.drawCircle(p.x, p.y, p.size || 2, finalColor);
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
        
        // HUD (pause button, score, level)
        if (this.hudRenderer) {
            this.hudRenderer.render(this.currentScore, this.currentLevel, this.isPaused);
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
            canvasWidth: this.canvasWidth,
            canvasHeight: this.canvasHeight,
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
        if (this.hudRenderer) {
            this.hudRenderer.update(deltaTime, this.currentScore, this.currentLevel);
        }
    }

    /**
     * Update canvas dimensions
     */
    updateDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        
        // Update textCanvas to match gameCanvas EXACTLY (no DPR)
        const gameCanvas = document.getElementById('gameCanvas');
        if (this.textCanvas && gameCanvas) {
            // Copy exact dimensions from gameCanvas
            this.textCanvas.width = gameCanvas.width;
            this.textCanvas.height = gameCanvas.height;
            this.textCanvas.style.width = gameCanvas.style.width;
            this.textCanvas.style.height = gameCanvas.style.height;
        }
        
        this.backgroundRenderer.updateDimensions(width, height);
        
        if (this.hudRenderer) {
            this.hudRenderer.updateDimensions(width, height);
        }
        this.animationRenderer.updateDimensions(width, height);
        this.uiRenderer.updateDimensions(width, height);
        
        // Update powerup UI renderer dimensions
        if (this.powerupUIRenderer) {
            this.powerupUIRenderer.updateDimensions(width, height);
        }
        
        // Update level progress bar dimensions
        if (this.levelProgressBar) {
            this.levelProgressBar.updateDimensions(width, height);
        }
    }

    /**
     * Resize handler called by GameEngine
     */
    resize(canvasWidth, canvasHeight) {
        // canvasWidth/canvasHeight are now LOGICAL pixels (no DPR)
        this.updateDimensions(canvasWidth, canvasHeight);
        console.log(`📐 RenderingSystem resized: ${canvasWidth}x${canvasHeight}px`);
    }
}
