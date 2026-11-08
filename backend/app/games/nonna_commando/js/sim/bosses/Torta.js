import { Ev } from '../Events.js';
import { Boss } from './Boss.js';

const TIER_HEIGHT = 24;

/**
 * TORTA MAXIMA: the Supremo's birthday cake, three tiers tall, on mechanical
 * chicken legs, with a frosting cannon for a mouth. Every third of its health
 * a tier blows off: it gets shorter, faster and angrier.
 *
 *  candles   the candles fire burning wax high in the air; shadows show where it falls
 *  cherries  shootable cherry bombs lobbed at Nonna
 *  stomp     a crouch, a jump, two shockwaves along the ground: jump them
 *  frosting  globs of frosting at chest height: crouch
 *  stampede  (last tier) runs across the arena
 */
export class Torta extends Boss {
    phases = [2 / 3, 1 / 3];
    attacks = [
        ['candles', 'cherries', 'frosting', 'stomp'],
        ['candles', 'cherries', 'stomp', 'frosting', 'cherries'],
        ['stampede', 'candles', 'stomp', 'frosting', 'cherries'],
    ];
    parTicks = 75 * 60;
    tiers = 3;
    home = 0;
    shotsLeft = 0;
    jumped = false;

    intro(world) {
        this.home = this.arenaRight - this.w / 2 - 6;
        this.facing = -1;
        this.anim = 'walk';
        if (this.t === 1) this.say(world, 'HAPPY BIRTHDAY!', 90);
        return this.walkTo(this.home, 0.8) && this.t > 90;
    }

    get topY() {
        return this.y - this.h;
    }

    candles(world) {
        this.vx = 0;
        this.anim = 'candles';
        const drops = 4 + this.phase;
        if (this.t === 1) world.events.emit(Ev.TELEGRAPH, this.x, this.topY, 0, 0, 'candles');
        if (this.t === 40) {
            const px = world.player.body.x;
            for (let i = 0; i < drops; i++) {
                const tx = Math.max(this.arenaLeft + 12, Math.min(this.arenaRight - 12, px + (i - (drops - 1) / 2) * 34));
                const flight = 80 + i * 6;
                this.lob(world, 'wax', this.x - 20 + i * 8, this.topY - 4, tx, flight, 0.13);
                world.events.emit(Ev.TELEGRAPH, tx, world.terrain.groundY(tx), flight, 0, 'shadow');
            }
        }
        return this.t >= 70;
    }

    cherries(world) {
        this.vx = 0;
        this.anim = 'cherries';
        if (this.t === 1) this.shotsLeft = 3 + (this.phase > 1 ? 1 : 0);
        if (this.t >= 20 && this.t % 22 === 0 && this.shotsLeft > 0) {
            this.shotsLeft--;
            const tx = world.player.body.x + world.rng.int(-30, 30);
            this.lob(world, 'cherry', this.x - 10, this.topY + 6, tx, 58, 0.17);
        }
        return this.shotsLeft === 0 && this.t > 100;
    }

    frosting(world) {
        this.vx = 0;
        this.anim = this.t < 30 ? 'mouthOpen' : 'frosting';
        if (this.t === 1) world.events.emit(Ev.TELEGRAPH, this.x - this.w / 2, this.y - 22, 0, 0, 'glow');
        const count = 3 + this.phase;
        if (this.t >= 30 && (this.t - 30) % 20 === 0 && (this.t - 30) / 20 < count) {
            this.shoot(world, 'glob', this.x - this.w / 2, this.y - 23, -2.4, 0);
        }
        return this.t > 30 + count * 20 + 10;
    }

    stomp(world) {
        if (this.t === 1) this.jumped = false;
        if (this.t < 26) {
            this.anim = 'crouch';
            this.vx = 0;
            return false;
        }
        if (!this.jumped) {
            this.jumped = true;
            this.vy = -5.2;
            this.onGround = false;
            const target = Math.max(this.arenaLeft + 60, Math.min(this.arenaRight - 50, world.player.body.x));
            this.vx = (target - this.x) / 44;
            this.anim = 'jump';
            return false;
        }
        if (this.onGround) {
            this.vx = 0;
            if (this.anim === 'jump') {
                this.anim = 'land';
                this.shockwave(world, this.x, 2.2 + this.phase * 0.3);
            }
            return this.walkTo(this.home, 0.9) || this.t > 220;
        }
        return false;
    }

    stampede(world) {
        this.anim = 'run';
        if (this.t === 1) this.say(world, 'MORE CAKE!', 50);
        const left = this.arenaLeft + 40;
        if (this.t < 160 && this.x > left + 1) {
            this.walkTo(left, 2.6);
            return false;
        }
        this.anim = 'walk';
        return this.walkTo(this.home, 1.3);
    }

    onPhase(world) {
        this.tiers--;
        this.h -= TIER_HEIGHT;
        world.events.emit(Ev.EXPLODE, this.x, this.y - this.h - 10, 34, 0, 'confetti');
        world.events.emit(Ev.PROP_BREAK, this.x, this.y - this.h - 10, 0, 0, 'tier');
        this.say(world, this.tiers === 2 ? 'MY TOP TIER!' : 'I AM MOSTLY SPONGE!', 70);
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
