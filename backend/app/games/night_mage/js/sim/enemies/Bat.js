import { Enemy } from './Enemy.js';

const CONTACT = 46;
const CLIMB = 70;

/** A triangle wave in [-1, 1] with period 1, so no trigonometry is needed. */
function triangle(phase) {
    const t = phase - Math.floor(phase);
    return t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
}

/** Swoops at the mage, bobbing; bites once and is gone. */
export class Bat extends Enemy {
    constructor(spec) {
        super(spec);
        this.baseY = spec.y;
        this.age = 0;
    }

    think(world, dt) {
        const { mage } = world;
        this.age += dt * world.slow;
        const target = mage.chest;
        this.walkTo(target.x, world, dt);
        const climb = CLIMB * world.slow * dt;
        this.baseY += Math.max(-climb, Math.min(climb, target.y - this.baseY));
        const { amplitude, period } = this.stats.bob;
        this.y = this.baseY + amplitude * triangle(this.age / period);
        if (Math.abs(this.x - target.x) < CONTACT && Math.abs(this.y - target.y) < CONTACT) {
            world.strike(this, this.damage);
            this.hp = 0;
            this.expended = true;
        }
    }
}
