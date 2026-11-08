import { Grunt } from './Grunt.js';

/**
 * A grunt with a crate of grenades shaped like party favours. They arc and
 * bounce, then go off: keep moving.
 */
export class Grenadier extends Grunt {
    aimTicks = 30;

    attack(world) {
        const pb = world.player.body;
        const flight = 56;
        const vx = Math.max(-3.2, Math.min(3.2, (pb.x - this.x) / flight));
        this.shoot(world, 'eGrenade', this.x + this.facing * 6, this.y - 24, vx, -3.6);
    }
}
