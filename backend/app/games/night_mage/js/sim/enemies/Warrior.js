import { chargeTick, tryCharge } from './charge.js';
import { Enemy } from './Enemy.js';
import { swingTick, trySwing } from './melee.js';

/** Marches up to the mage and swings the axe. Slow, tough, telegraphed. As a boss, it charges from afar. */
export class Warrior extends Enemy {
    think(world, dt) {
        if (chargeTick(this, world, dt)) return;
        if (swingTick(this, world)) return;
        if (trySwing(this, world.mage)) return;
        if (this.bossKit && tryCharge(this, world.mage)) return;
        const arrived = this.walkTo(this.approachX(world, this.stats.reach * 0.75), world, dt);
        if (arrived) this.faceMage(world.mage);
        this.state = arrived ? 'idle' : 'walk';
    }
}
