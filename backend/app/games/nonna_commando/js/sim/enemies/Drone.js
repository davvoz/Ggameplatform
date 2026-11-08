import { approach } from '../../core/MathX.js';
import { Ev } from '../Events.js';
import { Enemy } from './Enemy.js';

/**
 * A surveillance drone with a gift bow. Hovers to one side of Nonna, blinks
 * its red eye when it locks on, then dives where she was standing.
 */
export class Drone extends Enemy {
    side = 1;
    hoverY = 0;
    targetX = 0;
    targetY = 0;
    nextDive = 0;

    onWake(world) {
        this.side = this.x > world.player.body.x ? 1 : -1;
        this.hoverY = world.rng.int(60, 95);
        this.nextDive = this.wait(world, 110, 170);
        this.setState('hover');
    }

    think(world) {
        const pb = world.player.body;
        const ground = world.terrain.groundY(this.x);
        switch (this.state) {
            case 'hover': {
                const tx = pb.x + this.side * 70;
                const ty = ground - this.hoverY;
                this.vx = approach(this.vx, Math.max(-1.6, Math.min(1.6, (tx - this.x) * 0.04)), 0.08);
                this.vy = approach(this.vy, Math.max(-1.2, Math.min(1.2, (ty - this.y) * 0.05)), 0.08);
                this.anim = 'hover';
                if (this.t >= this.nextDive && world.player.alive) {
                    this.setState('lock');
                    world.events.emit(Ev.TELEGRAPH, this.x, this.y - 5, 0, 0, 'eye');
                }
                break;
            }
            case 'lock':
                this.vx *= 0.9;
                this.vy *= 0.9;
                this.anim = 'lock';
                this.targetX = pb.x;
                this.targetY = pb.y - 10;
                if (this.t >= 34) {
                    const dx = this.targetX - this.x;
                    const dy = this.targetY - this.y;
                    const len = Math.sqrt(dx * dx + dy * dy) || 1;
                    this.vx = (dx / len) * 3.3;
                    this.vy = (dy / len) * 3.3;
                    this.setState('dive');
                }
                break;
            case 'dive':
                this.anim = 'dive';
                if (this.touchesPlayer(world)) world.player.hurt(world, 'drone');
                if (this.y >= ground - 6 || this.t > 70) {
                    this.vy = -1.4;
                    this.side = -this.side;
                    this.nextDive = this.wait(world, 130, 190);
                    this.setState('hover');
                }
                break;
            default:
                this.setState('hover');
        }
    }

    onDeath(world) {
        world.events.emit(Ev.EXPLODE, this.x, this.y - 5, 10, 0, 'small');
    }
}
