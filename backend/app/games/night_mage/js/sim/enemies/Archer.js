import { WORLD } from '../../config/Tuning.js';
import { Enemy } from './Enemy.js';

const SCREEN_MARGIN = 48;

/** Keeps her distance on her ledge and shoots arrows (which can be tapped down). */
export class Archer extends Enemy {
    think(world, dt) {
        const { mage } = world;
        if (this.#shooting(world)) return;
        const arrived = this.walkTo(this.#post(world), world, dt);
        const onScreen = this.x >= SCREEN_MARGIN && this.x <= WORLD.width - SCREEN_MARGIN;
        if (arrived) this.faceMage(mage);
        if (arrived && onScreen && this.reload === 0) {
            this.faceMage(mage);
            this.setState('windup');
            return;
        }
        this.state = arrived ? 'idle' : 'walk';
    }

    #shooting(world) {
        const { stats } = this;
        if (this.state === 'windup') {
            if (this.stateTime * world.slow >= this.timing.windup) {
                world.fire(this, stats.shot);
                this.reload = stats.reload;
                this.setState('recover');
            }
            return true;
        }
        if (this.state === 'recover') {
            if (this.stateTime * world.slow >= stats.recover) this.setState('idle');
            return true;
        }
        return false;
    }

    /** Where she wants to stand: inside her range, on her ledge, on the screen. */
    #post({ mage, terrain }) {
        const [near, far] = this.stats.range;
        const side = this.x < mage.x ? -1 : 1;
        const gap = Math.abs(this.x - mage.x);
        const wanted = Math.min(far, Math.max(near, gap));
        let x = mage.x + side * wanted;
        const ledge = terrain.ledgeOf(this.layer, this.x);
        if (ledge) x = Math.min(ledge.maxX - SCREEN_MARGIN / 2, Math.max(ledge.minX + SCREEN_MARGIN / 2, x));
        return Math.min(WORLD.width - SCREEN_MARGIN, Math.max(SCREEN_MARGIN, x));
    }
}
