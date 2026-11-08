import { Ev } from '../Events.js';
import { Enemy } from './Enemy.js';

/**
 * A gun nest decorated with bunting. Tracks Nonna, glows, then fires a
 * three round burst. Tough: worth a weapon or a meatball.
 */
export class Turret extends Enemy {
    nextBurst = 0;
    shots = 0;
    aimX = -1;
    aimY = 0;

    onWake(world) {
        this.nextBurst = this.wait(world, 50, 90);
        this.setState('track');
    }

    think(world) {
        this.vx = 0;
        const mx = this.x;
        const my = this.y - 14;
        if (this.state === 'track') {
            [this.aimX, this.aimY] = this.aimAtPlayer(world, mx, my, 1.2);
            this.facing = this.aimX < 0 ? -1 : 1;
            this.anim = 'idle';
            if (this.t >= this.nextBurst && world.player.alive && this.x < world.camera.right - 8) {
                this.setState('charge');
                world.events.emit(Ev.TELEGRAPH, mx + this.aimX * 14, my + this.aimY * 14, 0, 0, 'glow');
            }
        } else if (this.state === 'charge') {
            this.anim = 'charge';
            if (this.t >= 28) {
                this.shots = 3;
                this.setState('burst');
            }
        } else if (this.state === 'burst') {
            this.anim = 'fire';
            if (this.t % 8 === 1 && this.shots > 0) {
                this.shots--;
                this.shoot(world, 'eBullet', mx + this.aimX * 14, my + this.aimY * 14, this.aimX * 2.6, this.aimY * 2.6);
            }
            if (this.shots === 0 && this.t > 20) {
                this.nextBurst = this.wait(world, 100, 140);
                this.setState('track');
            }
        }
    }

    move() {
        // bolted to the ground
    }

    onDeath(world) {
        world.explode(this.x, this.y - 10, 20, 0, 'player', 'fire');
        this.vx = 0;
        this.vy = -1;
    }
}
