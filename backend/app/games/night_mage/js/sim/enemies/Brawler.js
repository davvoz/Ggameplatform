import { WORLD } from '../../config/Tuning.js';
import { Enemy } from './Enemy.js';
import { swingTick, trySwing } from './melee.js';

/** Throws fireballs from afar, then closes in for a punch. */
export class Brawler extends Enemy {
    think(world, dt) {
        if (this.#throwing(world)) return;
        if (swingTick(this, world)) return;
        if (trySwing(this, world.mage)) return;
        if (this.#wantsToThrow(world.mage)) {
            this.faceMage(world.mage);
            this.setState('throw');
            return;
        }
        const arrived = this.walkTo(this.approachX(world, this.stats.reach * 0.7), world, dt);
        if (arrived) this.faceMage(world.mage);
        this.state = arrived ? 'idle' : 'walk';
    }

    #wantsToThrow(mage) {
        if (this.reload > 0 || this.x < 0 || this.x > WORLD.width) return false;
        return Math.abs(this.x - mage.x) > this.stats.throwRange || !this.levelWithMage(mage);
    }

    #throwing(world) {
        if (this.state !== 'throw') return false;
        if (this.stateTime * world.slow >= this.timing.throwWindup) {
            world.fire(this, this.stats.shot);
            this.reload = this.stats.reload;
            this.setState('recover');
        }
        return true;
    }
}
