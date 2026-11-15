import { BOSS, WORLD } from '../../config/Tuning.js';
import { Enemy } from './Enemy.js';

const CONTACT = 46;
const CLIMB = 70;
/** A bat boss hangs at least this far inside the screen. */
const PERCH_MARGIN = 80;

/** A triangle wave in [-1, 1] with period 1, so no trigonometry is needed. */
function triangle(phase) {
    const t = phase - Math.floor(phase);
    return t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
}

/** Swoops at the mage, bobbing; bites once and is gone. A bat boss flies off and dives again. */
export class Bat extends Enemy {
    constructor(spec) {
        super(spec);
        this.baseY = spec.y;
        this.age = 0;
    }

    think(world, dt) {
        if (this.state === 'soar') this.#soar(world, dt);
        else if (this.state === 'perch') this.#hang(world);
        else this.#dive(world, dt);
    }

    #dive(world, dt) {
        const { mage } = world;
        this.age += dt * world.slow;
        const target = mage.chest;
        this.walkTo(target.x, world, dt);
        const climb = CLIMB * world.slow * dt;
        this.baseY += Math.max(-climb, Math.min(climb, target.y - this.baseY));
        const { amplitude, period } = this.stats.bob;
        this.y = this.baseY + amplitude * triangle(this.age / period);
        if (Math.abs(this.x - target.x) < CONTACT && Math.abs(this.y - target.y) < CONTACT) this.#bite(world);
    }

    #bite(world) {
        world.strike(this, this.damage);
        if (this.bossKit) {
            this.#flyOff(world.mage);
            return;
        }
        this.hp = 0;
        this.expended = true;
    }

    /** Up and away, on past the mage the way it was flying, out of reach of its own bite. */
    #flyOff(mage) {
        const { away, height } = BOSS.swoop;
        const x = mage.x + this.facing * away;
        this.perch = { x: Math.min(WORLD.width - PERCH_MARGIN, Math.max(PERCH_MARGIN, x)), y: height };
        this.setState('soar');
    }

    #soar(world, dt) {
        const step = this.speed * BOSS.swoop.pace * world.slow * dt;
        const dx = this.perch.x - this.x;
        const dy = this.perch.y - this.y;
        const distance = Math.hypot(dx, dy);
        if (dx !== 0) this.facing = dx < 0 ? -1 : 1;
        if (distance > step) {
            this.x += (dx / distance) * step;
            this.y += (dy / distance) * step;
            return;
        }
        ({ x: this.x, y: this.y } = this.perch);
        this.setState('perch');
    }

    /** It hangs a moment, then dives again. */
    #hang(world) {
        this.faceMage(world.mage);
        if (this.stateTime * world.slow < BOSS.swoop.rest) return;
        this.baseY = this.y;
        this.setState('fly');
    }
}
