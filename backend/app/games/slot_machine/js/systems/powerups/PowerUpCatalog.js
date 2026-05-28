import { ReelLockPowerUp }      from './ReelLockPowerUp.js';
import { WildReelPowerUp }      from './WildReelPowerUp.js';
import { ScatterMagnetPowerUp } from './ScatterMagnetPowerUp.js';
import { MegaMultiplierPowerUp } from './MegaMultiplierPowerUp.js';

/**
 * Registry of every powerup class. Fail-fast on unknown id.
 * Order here is the order shown in the HUD.
 */
const CLASSES = Object.freeze([
    ReelLockPowerUp,
    WildReelPowerUp,
    ScatterMagnetPowerUp,
    MegaMultiplierPowerUp
]);

export class PowerUpCatalog {
    constructor() {
        this._byId = new Map();
        for (const cls of CLASSES) {
            this._byId.set(cls.id, cls);
        }
    }

    /** Ordered list of powerup classes for HUD buttons. */
    all() {
        return CLASSES;
    }

    /** Returns the class, throws if id unknown. */
    classOf(id) {
        const cls = this._byId.get(id);
        if (!cls) throw new Error(`PowerUpCatalog: unknown powerup id "${id}"`);
        return cls;
    }

    create(id) {
        const Cls = this.classOf(id);
        return new Cls();
    }
}
