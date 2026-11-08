import { Ev } from '../Events.js';
import { Enemy } from './Enemy.js';

const SHELL_GRAVITY = 0.15;
const FLIGHT = 72;

/**
 * Sits behind sandbags lobbing shells. A red cross marks where each shell will
 * land a second before it does. Shells can be shot down.
 */
export class Mortar extends Enemy {
    nextShot = 0;
    targetX = 0;

    onWake(world) {
        this.nextShot = this.wait(world, 40, 90);
        this.setState('wait');
    }

    think(world) {
        this.facePlayer(world);
        this.vx = 0;
        if (this.state === 'wait') {
            this.anim = 'idle';
            if (this.t >= this.nextShot && world.player.alive && this.x < world.camera.right) {
                this.targetX = world.player.body.x + world.player.body.vx * 30;
                this.setState('load');
            }
        } else if (this.state === 'load') {
            this.anim = 'load';
            if (this.t >= 30) this.#fire(world);
        } else {
            this.anim = 'recoil';
            if (this.t >= 20) this.setState('wait');
        }
    }

    #fire(world) {
        const x0 = this.x + this.facing * 4;
        const y0 = this.y - 16;
        const ty = world.terrain.groundY(this.targetX) - 4;
        const vx = (this.targetX - x0) / FLIGHT;
        const vy = (ty - y0) / FLIGHT - (SHELL_GRAVITY * FLIGHT) / 2;
        this.shoot(world, 'eShell', x0, y0, vx, vy);
        world.events.emit(Ev.TELEGRAPH, this.targetX, ty, FLIGHT, 0, 'target');
        this.nextShot = this.wait(world, 150, 210);
        this.setState('recoil');
    }
}
