/**
 * RendererFactory - Factory Pattern for entity renderers
 * Single Responsibility: Renderer instantiation and mapping
 */
import { PlayerRenderer } from './PlayerRenderer.js';
import { PlatformRenderer } from './PlatformRenderer.js';
import { CollectibleRenderer } from './CollectibleRenderer.js';
import { ObstacleRenderer } from './ObstacleRenderer.js';
import { SafetyPlatformRenderer } from './SafetyPlatformRenderer.js';
import { GoalFlagRenderer } from './GoalFlagRenderer.js';
import { EnemyRenderer } from './EnemyRenderer.js'; // NEW
import { ParticleRenderer } from './ParticleRenderer.js';

export class RendererFactory {
    constructor(renderer, textCtx = null) {
        this.renderer = renderer;
        this.textCtx = textCtx;
        this.renderers = new Map();
        this.labelRenderer = null; // Will be injected by RenderingSystem
        this._initRenderers();
    }

    /**
     * Inject label renderer into all entity renderers
     * @param {EntityLabelRenderer} labelRenderer - Centralized label renderer
     */
    injectLabelRenderer(labelRenderer) {
        this.labelRenderer = labelRenderer;
        
        // Inject into all existing renderers that support it
        for (const [key, renderer] of this.renderers.entries()) {
            if (renderer && typeof renderer.setLabelRenderer === 'function') {
                renderer.setLabelRenderer(labelRenderer);
            }
        }
    }

    _initRenderers() {
        // Player
        this.renderers.set('player', new PlayerRenderer(this.renderer, this.textCtx));
        
        // Platforms
        const platformRenderer = new PlatformRenderer(this.renderer);
        this.renderers.set('platform', platformRenderer);
        this.renderers.set('crumbling-platform', platformRenderer);
        this.renderers.set('spring-platform', platformRenderer);
        
        // Safety platforms
        const safetyPlatformRenderer = new SafetyPlatformRenderer(this.renderer);
        this.renderers.set('safety-platform', safetyPlatformRenderer);
        this.renderers.set('safetyPlatform', safetyPlatformRenderer);
        
        // Goal flag
        const goalFlagRenderer = new GoalFlagRenderer(this.renderer);
        goalFlagRenderer.renderer.textCtx = this.textCtx;
        this.renderers.set('goalFlag', goalFlagRenderer);
        
        // Collectibles
        const collectibleRenderer = new CollectibleRenderer(this.renderer, this.textCtx);
        this.renderers.set('collectible', collectibleRenderer);
        this.renderers.set('heart', collectibleRenderer);
        this.renderers.set('health', collectibleRenderer); // Bonus vita
        this.renderers.set('boost', collectibleRenderer);
        this.renderers.set('powerup', collectibleRenderer);
        
        // Bonuses (both with and without dash for compatibility)
        this.renderers.set('magnet', collectibleRenderer);
        this.renderers.set('magnet-bonus', collectibleRenderer);
        this.renderers.set('coinrain', collectibleRenderer);
        this.renderers.set('coinRain', collectibleRenderer);
        this.renderers.set('coinrain-bonus', collectibleRenderer);
        this.renderers.set('shield', collectibleRenderer);
        this.renderers.set('shield-bonus', collectibleRenderer);
        this.renderers.set('multiplier', collectibleRenderer);
        this.renderers.set('multiplier-bonus', collectibleRenderer);
        this.renderers.set('rainbow', collectibleRenderer);
        this.renderers.set('rainbow-bonus', collectibleRenderer);
        this.renderers.set('instantflight', collectibleRenderer);
        this.renderers.set('flightBonus', collectibleRenderer);
        this.renderers.set('flight-bonus', collectibleRenderer);
        this.renderers.set('recharge', collectibleRenderer);
        this.renderers.set('rechargeBonus', collectibleRenderer);
        this.renderers.set('recharge-bonus', collectibleRenderer);
        this.renderers.set('heartrecharge', collectibleRenderer);
        this.renderers.set('heartRechargeBonus', collectibleRenderer);
        this.renderers.set('heartrecharge-bonus', collectibleRenderer);
        
        // Obstacles
        const obstacleRenderer = new ObstacleRenderer(this.renderer);
        this.renderers.set('spike', obstacleRenderer);
        this.renderers.set('obstacle', obstacleRenderer); // Generic obstacle
        
        // NEW: Enemies (need textCtx for emoji rendering)
        const enemyRenderer = new EnemyRenderer();
        enemyRenderer.textCtx = this.textCtx; // Set textCtx manually
        this.renderers.set('enemy', enemyRenderer);
        
        // Particles
        const particleRenderer = new ParticleRenderer(this.renderer);
        this.renderers.set('projectile-hit', particleRenderer);
        this.renderers.set('enemy-defeat', particleRenderer);
        this.renderers.set('sparkle', particleRenderer);
    }

    /**
     * Get appropriate renderer for entity
     * @param {Object|string} entity - Entity to render or entity type string
     * @returns {IEntityRenderer} Specific renderer instance
     */
    getRenderer(entity) {
        // Support both entity objects and type strings
        if (typeof entity === 'string') {
            return this.renderers.get(entity);
        }
        
        if (!entity || !entity.type) {

            return null;
        }

        const renderer = this.renderers.get(entity.type);
        
        if (!renderer) {

            return null;
        }

        return renderer;
    }

    /**
     * Render entity using appropriate renderer
     * @param {Object} entity - Entity to render
     * @param {Object} context - Rendering context (camera, effects, etc.)
     */
    render(entity, context) {
        const renderer = this.getRenderer(entity);
        if (renderer) {
            renderer.render(entity, context);
        }
    }
}
