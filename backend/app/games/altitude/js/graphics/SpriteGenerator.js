/**
 * SpriteGenerator - Facade for procedural pixel-art sprite generation.
 * Delegates to specialized drawer classes (SRP) while maintaining
 * the original static API for full backward compatibility.
 */

import { SpriteCache } from './sprite-generation/SpriteCache.js';
import { PlayerSpriteDrawer } from './sprite-generation/PlayerSpriteDrawer.js';
import { PlatformSpriteDrawer } from './sprite-generation/PlatformSpriteDrawer.js';
import { EnemySpriteDrawer } from './sprite-generation/EnemySpriteDrawer.js';
import { CollectibleSpriteDrawer } from './sprite-generation/CollectibleSpriteDrawer.js';
import { PowerUpSpriteDrawer } from './sprite-generation/PowerUpSpriteDrawer.js';
import { ShieldSpriteDrawer } from './sprite-generation/ShieldSpriteDrawer.js';

export class SpriteGenerator {
    static #cache = new SpriteCache();
    static FRAME_SIZE = 64;

    static get(key) {
        return SpriteGenerator.#cache.get(key);
    }

    static generateAll() {
        const drawers = [
            ['player', new PlayerSpriteDrawer()],
            ['platforms', new PlatformSpriteDrawer()],
            ['enemies', new EnemySpriteDrawer()],
            ['collectibles', new CollectibleSpriteDrawer()],
            ['powerups', new PowerUpSpriteDrawer()],
            ['shield', new ShieldSpriteDrawer()],
        ];

        for (const [key, drawer] of drawers) {
            SpriteGenerator.#cache.set(key, drawer.generate());
        }
    }
}
