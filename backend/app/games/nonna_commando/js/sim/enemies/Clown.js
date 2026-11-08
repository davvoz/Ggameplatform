import { Ev } from '../Events.js';
import { Enemy } from './Enemy.js';

/**
 * Hired for the party, paid in dynamite. Runs at Nonna honking and goes off on
 * contact. Killed, he still goes off: a clown in a crowd is a free CHAIN, a
 * clown at point blank is a bad idea.
 */
export class Clown extends Enemy {
    speed = 1.9;
    fuse = 0;

    onWake(world) {
        this.speed = 1.75 + world.rng.next() * 0.45;
        this.setState('run');
        world.events.emit(Ev.HONK, this.x, this.y - 20);
        if (world.rng.chance(0.4)) this.say(world, 'HONK!', 40);
    }

    think(world) {
        this.facePlayer(world);
        if (this.state === 'run') {
            this.anim = 'run';
            this.vx = this.facing * this.speed;
            if (this.onGround && this.blocked) this.vy = -3.5;
            if (this.touchesPlayer(world, 2) && world.player.alive) this.setState('lit');
        } else if (this.state === 'lit') {
            this.anim = 'lit';
            this.vx *= 0.8;
            if (this.t >= 10) {
                this.hp = 0;
                world.killEnemy(this, { kind: 'self', x: this.x, y: this.y, dirX: 0, byPlayer: false });
            }
        }
    }

    onDeath(world) {
        world.explode(this.x, this.y - 12, 26, 4, 'neutral', 'confetti');
    }
}
