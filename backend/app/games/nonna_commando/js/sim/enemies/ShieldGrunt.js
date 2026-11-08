import { Ev } from '../Events.js';
import { Grunt } from './Grunt.js';

/**
 * Hides behind a giant silver serving tray. Bullets from the front just clang:
 * go round him, lob a meatball over, burn him, or smack him with the slipper.
 * Enough clangs and the tray breaks.
 */
export class ShieldGrunt extends Grunt {
    tray;
    speed = 0.42;

    constructor(type, x, y, opts) {
        super(type, x, y, opts);
        this.tray = this.def.tray;
    }

    get hasTray() {
        return this.tray > 0;
    }

    takeHit(world, damage, hit) {
        const frontal = hit.dirX !== 0 && hit.dirX === -this.facing;
        const blockable = hit.kind === 'bullet' || hit.kind === 'rocket';
        if (this.hasTray && frontal && blockable && this.state !== 'stab') {
            this.tray--;
            world.events.emit(Ev.CLANG, this.x + this.facing * 8, hit.y, this.facing);
            if (this.tray === 0) {
                world.events.emit(Ev.PROP_BREAK, this.x + this.facing * 8, this.y - 14, 0, 0, 'tray');
                this.speed = 0.9;
                this.say(world, 'MY TRAY!', 50);
            }
            world.score.keepAlive();
            return 0;
        }
        return super.takeHit(world, damage, hit);
    }

    /** No gun: he walks into you and shoves. */
    advance(world) {
        const dx = this.playerDx(world);
        const dist = Math.abs(dx);
        const level = Math.abs(world.player.body.y - this.y) < 20;
        if (dist < 30 && level && world.player.alive) {
            this.vx = 0;
            this.setState('windup');
            return;
        }
        this.vx = dist > 20 ? this.facing * this.speed : 0;
        this.anim = this.vx === 0 ? 'idle' : 'walk';
    }

    scare(world, fromX) {
        if (!this.hasTray) super.scare(world, fromX);
    }
}
