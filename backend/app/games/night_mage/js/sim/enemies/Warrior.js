import { Enemy } from './Enemy.js';
import { swingTick, trySwing } from './melee.js';

/** Marches up to the mage and swings the axe. Slow, tough, telegraphed. */
export class Warrior extends Enemy {
    think(world, dt) {
        if (swingTick(this, world)) return;
        if (trySwing(this, world.mage)) return;
        const arrived = this.walkTo(this.approachX(world, this.stats.reach * 0.75), world, dt);
        if (arrived) this.faceMage(world.mage);
        this.state = arrived ? 'idle' : 'walk';
    }
}
