import { Ev } from '../Events.js';
import { Enemy } from './Enemy.js';

/**
 * Kneels and fires a bottle rocket at shin height: jump it, or shoot it down
 * for a SWAT bonus. The fuse sparkles for a moment before each shot.
 */
export class Bazooka extends Enemy {
    nextShot = 0;
    range = 0;

    onWake(world) {
        this.range = world.rng.int(150, 210);
        this.nextShot = this.wait(world, 40, 80);
        if (this.state === 'enter') this.setState('advance');
    }

    think(world) {
        this.facePlayer(world);
        const dist = Math.abs(this.playerDx(world));
        switch (this.state) {
            case 'advance':
                this.anim = 'walk';
                this.h = 26;
                this.vx = dist > this.range ? this.facing * 0.6 : 0;
                if (this.vx === 0 || this.t > 160) this.setState('kneel');
                break;
            case 'kneel':
                this.vx = 0;
                this.h = this.def.h;
                this.anim = 'kneel';
                if (this.t >= this.nextShot && this.x < world.camera.right - 12 && world.player.alive) {
                    this.setState('aim');
                    world.events.emit(Ev.TELEGRAPH, this.x + this.facing * 14, this.y - 10, this.facing, 0, 'fuse');
                }
                if (dist > this.range + 80) this.setState('advance');
                break;
            case 'aim':
                this.anim = 'aim';
                if (this.t >= 34) {
                    this.shoot(world, 'eRocket', this.x + this.facing * 16, this.y - 10, this.facing * 1.1, 0, 1);
                    this.nextShot = this.wait(world, 120, 170);
                    this.setState('kneel');
                    this.vx = -this.facing * 0.8;
                }
                break;
            default:
                this.setState('advance');
        }
        if (this.state === 'kneel' && this.t < 8) this.anim = 'recoil';
        if (this.vx !== 0 && this.state === 'kneel') this.vx *= 0.8;
        if (Math.abs(this.vx) < 0.05 && this.state === 'kneel') this.vx = 0;
    }
}
