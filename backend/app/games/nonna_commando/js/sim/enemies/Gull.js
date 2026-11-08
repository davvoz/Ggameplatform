import { sinX } from '../../core/MathX.js';
import { Enemy } from './Enemy.js';

/**
 * Harbour seagull, drafted, issued a helmet. Flies in on a wave, makes one
 * swoop at Nonna and keeps going. Flocks are easy points with the machinegun.
 */
export class Gull extends Enemy {
    baseY = 0;
    phase = 0;
    swooped = false;

    onWake(world) {
        this.baseY = this.y;
        this.phase = world.rng.next() * 6;
        this.setState('fly');
        this.facing = -1;
    }

    think(world) {
        const pb = world.player.body;
        if (this.state === 'fly') {
            this.anim = 'fly';
            this.vx = -1.5;
            this.vy = 0;
            this.y = this.baseY + sinX(this.age * 0.08 + this.phase) * 8;
            const dx = pb.x - this.x;
            if (!this.swooped && dx < 0 && dx > -90 && world.player.alive) {
                const dy = pb.y - 14 - this.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                this.vx = (dx / len) * 2.8;
                this.vy = (dy / len) * 2.8;
                this.swooped = true;
                this.setState('swoop');
            }
        } else if (this.state === 'swoop') {
            this.anim = 'swoop';
            if (this.touchesPlayer(world)) world.player.hurt(world, 'gull');
            if (this.t > 30) this.vy -= 0.12;
            if (this.y < -30) this.remove = true;
        }
    }
}
