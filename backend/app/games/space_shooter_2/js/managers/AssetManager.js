import { generateShipSprites } from './assets/Ship.js';
import { generateEnemySprites } from './assets/Enemies.js';
import { generateBossSprites } from './assets/Bosses.js';
import { generateMiniBossSprites } from './assets/MiniBoss.js';
import { generatePerkDeviceSprites } from './assets/Perk.js';
import Bullet from '../entities/Bullet.js';

/**
 * AssetManager - handles loading and storing all game sprites in memory for easy access.
 * This includes player ships, enemies, bosses, mini-bosses, and perk devices.
 * Each sprite is generated programmatically and stored in a dictionary for retrieval by name.
 */
class AssetManager {
    constructor() {
        this.sprites = {};
        this.loaded = false;
    }

    async load() {
        await generateShipSprites(this.sprites);
        await generateEnemySprites(this.sprites);
        await generateBossSprites(this.sprites);
        await generateMiniBossSprites(this.sprites);
        generatePerkDeviceSprites(this.sprites);
        await Bullet.loadSprites();
        this.loaded = true;
    }

    getSprite(name) {
        return this.sprites[name] || null;
    }

}

export default AssetManager;
