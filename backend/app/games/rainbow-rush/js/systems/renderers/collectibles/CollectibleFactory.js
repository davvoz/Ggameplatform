/**
 * CollectibleFactory - Factory pattern for creating collectible renderers
 * Implements Factory Pattern for object creation
 */
import { CoinCollectible } from './CoinCollectible.js';
import { HeartCollectible } from './HeartCollectible.js';
import { BoostCollectible } from './BoostCollectible.js';
import { MagnetCollectible } from './MagnetCollectible.js';
import { CoinRainCollectible } from './CoinRainCollectible.js';
import { ShieldCollectible } from './ShieldCollectible.js';
import { MultiplierCollectible } from './MultiplierCollectible.js';
import { RainbowCollectible } from './RainbowCollectible.js';
import { FlightCollectible } from './FlightCollectible.js';
import { RechargeCollectible } from './RechargeCollectible.js';
import { HeartRechargeCollectible } from './HeartRechargeCollectible.js';
import { PowerupCollectible } from './PowerupCollectible.js';

export class CollectibleFactory {
    static renderers = new Map();

    /**
     * Create or retrieve a collectible renderer
     * @param {string} type - The type of collectible
     * @param {Object} renderer - WebGL renderer instance
     * @param {Object} textCtx - 2D canvas context for text/images
     * @returns {BaseCollectible} The appropriate collectible renderer
     */
    static getRenderer(type, renderer, textCtx = null) {
        if (!this.renderers.has(type)) {
            this.renderers.set(type, this.createRenderer(type, renderer, textCtx));
        }
        return this.renderers.get(type);
    }

    /**
     * Create a new renderer instance based on type
     */
    static createRenderer(type, renderer, textCtx) {
        const rendererMap = {
            'collectible': () => new CoinCollectible(renderer, textCtx),
            'heart': () => new HeartCollectible(renderer, textCtx),
            'health': () => new HeartCollectible(renderer, textCtx),
            'boost': () => new BoostCollectible(renderer, textCtx),
            'magnet': () => new MagnetCollectible(renderer, textCtx),
            'coinrain': () => new CoinRainCollectible(renderer, textCtx),
            'coinRain': () => new CoinRainCollectible(renderer, textCtx),
            'shield': () => new ShieldCollectible(renderer, textCtx),
            'multiplier': () => new MultiplierCollectible(renderer, textCtx),
            'rainbow': () => new RainbowCollectible(renderer, textCtx),
            'instantflight': () => new FlightCollectible(renderer, textCtx),
            'flightBonus': () => new FlightCollectible(renderer, textCtx),
            'recharge': () => new RechargeCollectible(renderer, textCtx),
            'rechargeBonus': () => new RechargeCollectible(renderer, textCtx),
            'heartrecharge': () => new HeartRechargeCollectible(renderer, textCtx),
            'heartRechargeBonus': () => new HeartRechargeCollectible(renderer, textCtx),
            'powerup': () => new PowerupCollectible(renderer, textCtx)
        };

        const factory = rendererMap[type];
        if (!factory) {
            throw new Error(`Unknown collectible type: ${type}`);
        }

        return factory();
    }

    /**
     * Clear all cached renderers
     */
    static clear() {
        this.renderers.clear();
    }

    /**
     * Set label renderer for all collectible renderers
     */
    static setLabelRenderer(labelRenderer) {
        for (const renderer of this.renderers.values()) {
            renderer.setLabelRenderer(labelRenderer);
        }
    }
}
