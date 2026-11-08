import { Ev } from '../Events.js';
import { Boss } from './Boss.js';

/**
 * A pink tank built like a pig, party hat on the turret. Lobs shells from its
 * snout, sprays the ground with a low machinegun (jump), and charges after a
 * loud snort (get out of the way, or jump on top of the moment).
 */
export class Panzerpig extends Boss {
    phases = [0.5];
    attacks = [['shells', 'sweepLow', 'charge'], ['shells', 'sweepLow', 'charge', 'shells']];
    parTicks = 45 * 60;
    home = 0;
    shotsLeft = 0;

    intro() {
        this.home = this.arenaRight - this.w / 2 - 6;
        this.anim = 'drive';
        this.facing = -1;
        return this.walkTo(this.home, 1.2) && this.t > 40;
    }

    shells(world) {
        this.vx = 0;
        if (this.t === 1) {
            this.shotsLeft = this.phase > 0 ? 3 : 2;
            world.events.emit(Ev.TELEGRAPH, this.x - 30, this.y - 30, 0, 0, 'snout');
        }
        this.anim = 'aimHigh';
        if (this.t >= 30 && (this.t - 30) % 34 === 0 && this.shotsLeft > 0) {
            this.shotsLeft--;
            const pb = world.player.body;
            const tx = pb.x + (this.shotsLeft - 1) * 26;
            this.lob(world, 'eShell', this.x - 30, this.y - 30, tx, 64, 0.15);
            world.events.emit(Ev.TELEGRAPH, tx, world.terrain.groundY(tx), 64, 0, 'target');
            this.anim = 'fireHigh';
        }
        return this.shotsLeft === 0 && this.t > 30 + 34 * 2 + 10;
    }

    sweepLow(world) {
        this.vx = 0;
        this.anim = this.t < 26 ? 'aimLow' : 'fireLow';
        if (this.t === 1) {
            world.events.emit(Ev.TELEGRAPH, this.x - 34, this.y - 7, 0, 0, 'glow');
            world.events.emit(Ev.TELEGRAPH, this.x, this.y, 0, 0, 'jump');
        }
        const count = this.phase > 0 ? 12 : 9;
        if (this.t >= 26 && (this.t - 26) % 6 === 0 && (this.t - 26) / 6 < count) {
            this.shoot(world, 'eBullet', this.x - 34, this.y - 7, -2.8, 0);
        }
        return this.t >= 26 + count * 6 + 20;
    }

    charge(world) {
        if (this.t === 1) {
            this.say(world, 'OINK!!', 40);
            world.events.emit(Ev.TELEGRAPH, this.x, this.y - 20, 0, 0, 'snort');
        }
        if (this.t < 34) {
            this.anim = 'snort';
            this.vx = this.t < 20 ? 0.6 : 0;
            return false;
        }
        if (this.state === 'charge' && this.x > this.arenaLeft + 48 && this.vx <= 0 && this.t < 200) {
            this.anim = 'charge';
            this.vx = -(this.phase > 0 ? 3.6 : 3.1);
            if (this.x + this.vx <= this.arenaLeft + 48) {
                this.vx = 0;
                world.events.emit(Ev.SHAKE, 0, 0, 5, 12);
                this.t = 200;
            }
            return false;
        }
        this.anim = 'drive';
        this.facing = -1;
        return this.walkTo(this.home, 1.4);
    }

    move(world) {
        this.x += this.vx;
        this.y = world.terrain.groundY(this.x);
    }

    onDeath(world) {
        world.events.emit(Ev.SPEECH, this.x, this.y - 40, 0, 0, 'SQUEEEE!', this);
    }
}
