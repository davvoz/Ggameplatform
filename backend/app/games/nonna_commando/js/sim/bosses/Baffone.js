import { Ev } from '../Events.js';
import { Boss } from './Boss.js';

/**
 * Capitano Baffone, head of the palace guard: two metres of moustache and a
 * gatling gun. The gatling spins up loudly and fires at chest height: crouch.
 * He leaps at Nonna and lands with shockwaves: jump. He tosses grenades.
 */
export class Baffone extends Boss {
    phases = [0.5];
    attacks = [['gatling', 'leap', 'grenades'], ['gatling', 'leap', 'gatling', 'grenades', 'leap']];
    parTicks = 50 * 60;
    home = 0;
    jumped = false;
    landedAt = 0;
    shotsLeft = 0;

    intro(world) {
        this.home = this.arenaRight - 70;
        this.facing = -1;
        this.anim = 'walk';
        if (this.t === 1) this.say(world, 'NOBODY CRASHES THIS PARTY!', 100);
        return this.walkTo(this.home, 0.9) && this.t > 100;
    }

    restTick(world) {
        this.vx = 0;
        this.facePlayer(world);
    }

    gatling(world) {
        this.vx = 0;
        this.facePlayer(world);
        if (this.t === 1) {
            world.events.emit(Ev.TELEGRAPH, this.x + this.facing * 20, this.y - 22, 0, 0, 'spin');
            world.events.emit(Ev.TELEGRAPH, this.x, this.y, 0, 0, 'duck');
        }
        this.anim = this.t < 44 ? 'spin' : 'gatling';
        const count = this.phase > 0 ? 34 : 24;
        if (this.t >= 44 && (this.t - 44) % 4 === 0 && (this.t - 44) / 4 < count) {
            const wobble = ((this.t >> 2) % 3 - 1) * 0.06;
            this.shoot(world, 'eBullet', this.x + this.facing * 22, this.y - 22, this.facing * 3.2, wobble);
        }
        return this.t > 44 + count * 4 + 16;
    }

    leap(world) {
        if (this.t === 1) this.jumped = false;
        if (this.t < 22) {
            this.anim = 'crouch';
            this.vx = 0;
            this.facePlayer(world);
            return false;
        }
        if (!this.jumped) {
            this.jumped = true;
            this.vy = -5.6;
            this.onGround = false;
            const target = Math.max(this.arenaLeft + 30, Math.min(this.arenaRight - 30, world.player.body.x));
            this.vx = (target - this.x) / 46;
            this.anim = 'jump';
            this.say(world, 'HUP!', 30);
            return false;
        }
        if (this.onGround) {
            if (this.anim === 'jump') {
                this.anim = 'land';
                this.vx = 0;
                this.landedAt = this.t;
                this.shockwave(world, this.x, 2.6);
            }
            return this.t - this.landedAt > 30 || this.t > 200;
        }
        return false;
    }

    grenades(world) {
        this.vx = 0;
        this.facePlayer(world);
        this.anim = 'throw';
        if (this.t === 1) this.shotsLeft = 3 + this.phase;
        if (this.t >= 20 && this.t % 18 === 0 && this.shotsLeft > 0) {
            this.shotsLeft--;
            const pb = world.player.body;
            const vx = Math.max(-3.4, Math.min(3.4, (pb.x - this.x) / 50 + (this.shotsLeft - 1) * 0.5));
            this.shoot(world, 'eGrenade', this.x, this.y - 40, vx, -3.8);
        }
        return this.shotsLeft === 0 && this.t > 90;
    }

    move(world) {
        if (this.onGround && this.vy >= 0) {
            this.x += this.vx;
            this.y = world.terrain.groundY(this.x);
            return;
        }
        this.vy += 0.24;
        this.x += this.vx;
        this.y += this.vy;
        const gy = world.terrain.groundY(this.x);
        if (this.y >= gy) {
            this.y = gy;
            this.vy = 0;
            this.onGround = true;
        }
    }
}
