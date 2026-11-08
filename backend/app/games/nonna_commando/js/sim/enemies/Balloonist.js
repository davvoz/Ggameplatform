import { sinX } from '../../core/MathX.js';
import { Ev } from '../Events.js';
import { Style } from '../ScoreKeeper.js';
import { Grunt } from './Grunt.js';

const BALLOON_SPACE = 22;

/**
 * Paratroopers could not get parachutes for the party, so they come down on
 * birthday balloons. Pop all of them and the grunt falls: a kill with the POP
 * bonus. Shoot the man and he dies the normal way. If he lands, the balloons
 * fly off and he fights like any grunt.
 */
export class Balloonist extends Grunt {
    balloons;
    floating = true;

    constructor(type, x, y, opts) {
        super(type, x, y, opts);
        this.balloons = this.def.balloons;
        this.h = this.def.h + BALLOON_SPACE;
        this.flying = true;
    }

    onWake(world) {
        super.onWake(world);
        this.setState('float');
        this.nextShot = this.wait(world, 50, 90);
    }

    think(world) {
        if (this.state === 'float') return this.#float(world);
        if (this.state === 'drop') return this.#falling();
        return super.think(world);
    }

    #float(world) {
        this.facePlayer(world);
        this.anim = 'float';
        this.vy = 0.55;
        this.vx = sinX(this.age * 0.045) * 0.35;
        if (this.t >= this.nextShot && this.y > 40) {
            const mx = this.x + this.facing * 8;
            const my = this.y - 16;
            const [dx, dy] = this.aimAtPlayer(world, mx, my, 2);
            this.shoot(world, 'eBullet', mx, my, dx * 2, dy * 2);
            this.nextShot = this.t + this.wait(world, 90, 140);
        }
        const ground = world.terrain.surfaceBelow(this.x, this.y - 2);
        if (this.y >= ground) this.#land(world);
    }

    #land(world) {
        this.floating = false;
        this.flying = false;
        this.h = this.def.h;
        this.y = world.terrain.surfaceBelow(this.x, this.y - 2);
        this.vy = 0;
        world.events.emit(Ev.POP, this.x, this.y - this.def.h - 10, this.balloons, 0, 'release');
        this.balloons = 0;
        this.setState('advance');
    }

    #falling() {
        this.anim = 'drop';
        this.vx *= 0.98;
    }

    onLand(world) {
        if (this.state !== 'drop') return;
        // he hit the ground after the last balloon popped
        this.hp = 0;
        world.killEnemy(this, { kind: 'crush', x: this.x, y: this.y, dirX: 0, byPlayer: true }, [Style.POP]);
    }

    takeHit(world, damage, hit) {
        if (this.floating && hit.y < this.y - this.def.h - 2 && hit.kind !== 'explosion' && hit.kind !== 'chain') {
            this.balloons--;
            world.events.emit(Ev.POP, this.x + (this.balloons - 1) * 5, this.y - this.def.h - 12, 1);
            world.score.keepAlive();
            if (this.balloons <= 0) {
                this.floating = false;
                this.flying = false;
                this.h = this.def.h;
                this.vy = 0;
                this.juggled = true;
                this.say(world, 'AAAAH!', 40);
                this.setState('drop');
            }
            return 0;
        }
        return super.takeHit(world, damage, hit);
    }
}
