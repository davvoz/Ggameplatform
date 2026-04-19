import ShieldEffect from './ShieldEffect.js';
import SpeedBoostEffect from './SpeedBoostEffect.js';
import RapidFireEffect from './RapidFireEffect.js';
import DroneCompanionEffect from './DroneCompanionEffect.js';
import GlitchCloneEffect from './GlitchCloneEffect.js';
import DataDrainEffect from './DataDrainEffect.js';

class PowerUpManager {
    constructor() {
        this._effects = new Map();
        this._effects.set('shield', new ShieldEffect());
        this._effects.set('speed', new SpeedBoostEffect());
        this._effects.set('rapid', new RapidFireEffect());
        this._effects.set('drone_companion', new DroneCompanionEffect());
        this._effects.set('glitch_clone', new GlitchCloneEffect());
        this._effects.set('data_drain', new DataDrainEffect());
    }

    get(type) {
        return this._effects.get(type);
    }

    isActive(type) {
        return this._effects.get(type)?.active ?? false;
    }

    update(deltaTime, player, game) {
        for (const effect of this._effects.values()) {
            effect.update(deltaTime, player, game);
        }
    }

    deactivateAll() {
        for (const effect of this._effects.values()) {
            effect.active = false;
            effect.time = 0;
        }
    }
}

export default PowerUpManager;
