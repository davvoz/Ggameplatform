/**
 * Status effects. Pure data objects — applied each frame by Entity.updateEffects.
 * Each has `update(dt, target, world)` and an `expired` flag.
 */
export class SlowEffect {
    constructor({ factor, duration }) {
        this.slowFactor = factor;
        this._remaining = duration;
        this.expired = false;
    }
    update(dt) {
        this._remaining -= dt;
        if (this._remaining <= 0) this.expired = true;
    }
}

export class DotEffect {
    constructor({ damagePerSecond, duration }) {
        this._dps = damagePerSecond;
        this._remaining = duration;
        this.expired = false;
    }
    update(dt, target, world) {
        if (this._remaining <= 0) { this.expired = true; return; }
        target.takeDamage(this._dps * dt, world, null, true);
        this._remaining -= dt;
    }
}
