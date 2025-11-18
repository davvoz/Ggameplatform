/**
 * RendererFactory - Factory Pattern for entity renderers
 * Single Responsibility: Renderer instantiation and mapping
 */
import { PlayerRenderer } from './PlayerRenderer.js';
import { PlatformRenderer } from './PlatformRenderer.js';
import { CollectibleRenderer } from './CollectibleRenderer.js';
import { ObstacleRenderer } from './ObstacleRenderer.js';
import { SafetyPlatformRenderer } from './SafetyPlatformRenderer.js';

export class RendererFactory {
    constructor(renderer) {
        this.renderer = renderer;
        this.renderers = new Map();
        this._initRenderers();
    }

    _initRenderers() {
        // Player
        this.renderers.set('player', new PlayerRenderer(this.renderer));
        
        // Platforms
        const platformRenderer = new PlatformRenderer(this.renderer);
        this.renderers.set('platform', platformRenderer);
        this.renderers.set('crumbling-platform', platformRenderer);
        this.renderers.set('spring-platform', platformRenderer);
        
        // Safety platforms
        const safetyPlatformRenderer = new SafetyPlatformRenderer(this.renderer);
        this.renderers.set('safety-platform', safetyPlatformRenderer);
        this.renderers.set('safetyPlatform', safetyPlatformRenderer);
        
        // Collectibles
        const collectibleRenderer = new CollectibleRenderer(this.renderer);
        this.renderers.set('collectible', collectibleRenderer);
        this.renderers.set('heart', collectibleRenderer);
        this.renderers.set('boost', collectibleRenderer);
        this.renderers.set('powerup', collectibleRenderer);
        
        // Bonuses (both with and without dash for compatibility)
        this.renderers.set('magnet', collectibleRenderer);
        this.renderers.set('magnet-bonus', collectibleRenderer);
        this.renderers.set('timeslow', collectibleRenderer);
        this.renderers.set('timeslow-bonus', collectibleRenderer);
        this.renderers.set('shield', collectibleRenderer);
        this.renderers.set('shield-bonus', collectibleRenderer);
        this.renderers.set('multiplier', collectibleRenderer);
        this.renderers.set('multiplier-bonus', collectibleRenderer);
        this.renderers.set('rainbow', collectibleRenderer);
        this.renderers.set('rainbow-bonus', collectibleRenderer);
        this.renderers.set('instantflight', collectibleRenderer);
        this.renderers.set('flight-bonus', collectibleRenderer);
        this.renderers.set('recharge', collectibleRenderer);
        this.renderers.set('recharge-bonus', collectibleRenderer);
        
        // Obstacles
        const obstacleRenderer = new ObstacleRenderer(this.renderer);
        this.renderers.set('spike', obstacleRenderer);
        this.renderers.set('enemy', obstacleRenderer);
    }

    /**
     * Get appropriate renderer for entity
     * @param {Object} entity - Entity to render
     * @returns {IEntityRenderer} Specific renderer instance
     */
    getRenderer(entity) {
        if (!entity || !entity.type) {
            console.warn('RendererFactory: Invalid entity', entity);
            return null;
        }

        const renderer = this.renderers.get(entity.type);
        
        if (!renderer) {
            console.warn(`RendererFactory: No renderer found for type "${entity.type}"`, entity);
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
