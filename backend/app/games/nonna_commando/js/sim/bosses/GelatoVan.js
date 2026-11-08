import { Ev } from '../Events.js';
import { Boss } from './Boss.js';

// a fan of sprinkles, literal vectors from 100 to 150 degrees
const FAN = [[-0.17, -0.98], [-0.34, -0.94], [-0.5, -0.87], [-0.64, -0.77], [-0.77, -0.64], [-0.87, -0.5]];

/**
 * An armoured ice cream van playing its jingle too loud. Lobs scoops (shoot
 * them down), sprays a fountain of sprinkles, and reverses into you.
 */
export class GelatoVan extends Boss {
    phases = [0.5];
    attacks = [['scoops', 'sprinkles', 'reverse'], ['scoops', 'sprinkles', 'reverse', 'sprinkles']];
    parTicks = 45 * 60;
    home = 0;
    shotsLeft = 0;

    intro(world) {
        this.home = this.arenaRight - this.w / 2 - 6;
        this.facing = -1;
        this.anim = 'drive';
        if (this.t === 1) world.events.emit(Ev.MUSIC, 0, 0, 0, 0, 'jingle');
        return this.walkTo(this.home, 1.5) && this.t > 30;
    }

    scoops(world) {
        this.vx = 0;
        this.anim = 'scoop';
        if (this.t === 1) this.shotsLeft = 3 + this.phase;
        if (this.t >= 24 && this.t % 26 === 0 && this.shotsLeft > 0) {
            this.shotsLeft--;
            const tx = world.player.body.x + (this.shotsLeft % 2 === 0 ? -20 : 20);
            this.lob(world, 'scoop', this.x - 8, this.y - 40, tx, 62, 0.15);
            world.events.emit(Ev.TELEGRAPH, tx, world.terrain.groundY(tx), 62, 0, 'target');
        }
        return this.shotsLeft === 0 && this.t > 110;
    }

    sprinkles(world) {
        this.vx = 0;
        this.anim = this.t < 30 ? 'jingle' : 'spray';
        if (this.t === 1) world.events.emit(Ev.TELEGRAPH, this.x - 20, this.y - 42, 0, 0, 'glow');
        const waves = 2 + this.phase;
        if (this.t >= 30 && (this.t - 30) % 24 === 0 && (this.t - 30) / 24 < waves) {
            const k = 2.5 + ((this.t - 30) / 24) * 0.35;
            for (const [fx, fy] of FAN) this.shoot(world, 'eSprinkle', this.x - 20, this.y - 42, fx * k * 1.4, fy * k);
        }
        return this.t > 30 + waves * 24 + 30;
    }

    reverse(world) {
        if (this.t === 1) {
            this.say(world, 'BEEP BEEP BEEP', 50);
            world.events.emit(Ev.TELEGRAPH, this.x, this.y - 20, 0, 0, 'snort');
        }
        if (this.t < 40) {
            this.anim = 'rev';
            this.vx = 0;
            return false;
        }
        if (this.t < 400 && this.x > this.arenaLeft + 50) {
            this.anim = 'drive';
            this.vx = -(3 + this.phase * 0.6);
            if (this.x + this.vx <= this.arenaLeft + 50) {
                this.t = 400;
                world.events.emit(Ev.SHAKE, 0, 0, 5, 12);
            }
            return false;
        }
        this.anim = 'drive';
        return this.walkTo(this.home, 1.6);
    }

    move(world) {
        this.x += this.vx;
        this.y = world.terrain.groundY(this.x);
    }
}
