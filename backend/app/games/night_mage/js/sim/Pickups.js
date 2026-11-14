import { PICKUPS } from '../config/Tuning.js';

export const PICKUP_KINDS = Object.freeze(['heart', 'chain', 'frost', 'power', 'nova']);

/** How likely each gift is; hearts only when the mage is hurt. */
export function pickupWeights(mage) {
    return { heart: mage.hp < mage.maxHp ? 3 : 0, chain: 2, frost: 2, power: 2, nova: 1 };
}

/** A gift dropped by a fallen monster. It sinks to the ground and fades; tap it to take it. */
export class Pickup {
    constructor({ id, kind, x, y }) {
        this.id = id;
        this.kind = kind;
        this.x = x;
        this.y = y;
        this.life = PICKUPS.lifetime;
        this.landed = false;
        this.alive = true;
    }

    get blinking() {
        return this.life < PICKUPS.blinkFrom;
    }

    update(dt, terrain) {
        this.life -= dt;
        if (this.life <= 0) this.alive = false;
        if (this.landed) return;
        const fromY = this.y;
        this.y += PICKUPS.fallSpeed * dt;
        const ground = terrain.landing(this.x, fromY, this.y);
        if (ground) {
            this.y = ground.y;
            this.landed = true;
        }
    }
}
