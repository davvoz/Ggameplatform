import { GameConfig } from '../config/GameConfig.js';

/**
 * Mana pool with capped regen. Both teams use one of these.
 */
export class ManaPool {
    constructor({ start, max, regenPerSec }) {
        this._max = max;
        this._regen = regenPerSec;
        this._value = start;
    }
    update(dt) {
        if (this._value < this._max) {
            this._value = Math.min(this._max, this._value + this._regen * dt);
        }
    }
    get value() { return this._value; }
    get max() { return this._max; }
    canConsume(cost) { return this._value + 0.0001 >= cost; }
    consume(cost) {
        if (!this.canConsume(cost)) throw new Error('ManaPool: insufficient mana');
        this._value -= cost;
    }
    static fromConfig(modifierMult = 1) {
        const c = GameConfig.BATTLE;
        return new ManaPool({ start: c.START_MANA, max: c.MAX_MANA, regenPerSec: c.MANA_REGEN_PER_SEC * modifierMult });
    }
}
