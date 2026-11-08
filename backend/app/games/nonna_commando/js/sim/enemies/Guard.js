import { Grunt } from './Grunt.js';

// literal unit vectors for -14, 0 and +14 degrees: no trigonometry in the rules
const SPREAD = [[0.9702957, -0.2419219], [1, 0], [0.9702957, 0.2419219]];

/**
 * The Supremo's palace guard: gilded breastplate, feather plume, a musket
 * that fires three shots in a fan. Slow and tough.
 */
export class Guard extends Grunt {
    speed = 0.45;
    aimTicks = 34;

    attack(world) {
        const mx = this.x + this.facing * 13;
        const my = this.y - 21;
        for (const [cx, cy] of SPREAD) this.shoot(world, 'eBullet', mx, my, cx * this.facing * 2.2, cy * 2.2);
    }

    scare() {
        // guards do not panic
    }
}
