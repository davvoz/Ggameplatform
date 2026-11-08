import { Enemy } from './Enemy.js';

const TRACK_TICKS = 52;
const LOCK_TICKS = 22;

/**
 * Smokes on a balcony until he sees Nonna. Then a red laser follows her; when
 * it stops moving, the shot comes a moment later along that line. Move.
 */
export class Sniper extends Enemy {
    aimX = -1;
    aimY = 0;
    nextShot = 0;

    onWake(world) {
        this.nextShot = this.wait(world, 40, 80);
        this.setState('idle');
    }

    get muzzleX() { return this.x + this.facing * 10; }
    get muzzleY() { return this.y - 19; }

    get laserOn() {
        return this.state === 'aim';
    }

    get laserLocked() {
        return this.state === 'aim' && this.t >= TRACK_TICKS;
    }

    think(world) {
        this.vx = 0;
        if (this.state === 'idle') {
            this.facePlayer(world);
            this.anim = 'smoke';
            if (this.t >= this.nextShot && world.player.alive && this.x < world.camera.right - 8) this.setState('aim');
        } else if (this.state === 'aim') {
            this.anim = 'aim';
            if (this.t < TRACK_TICKS) {
                this.facePlayer(world);
                [this.aimX, this.aimY] = this.aimAtPlayer(world, this.muzzleX, this.muzzleY, 3);
            }
            if (this.t >= TRACK_TICKS + LOCK_TICKS) {
                this.shoot(world, 'eFast', this.muzzleX, this.muzzleY, this.aimX * 5.5, this.aimY * 5.5);
                this.nextShot = this.wait(world, 110, 160);
                this.setState('idle');
            }
        }
    }
}
