import { approach, sinX, cosX } from '../../core/MathX.js';
import { Ev } from '../Events.js';
import { Boss } from './Boss.js';

// five-way fan pointing down, literal unit vectors
const RAIN = [[-0.5, 0.87], [-0.26, 0.97], [0, 1], [0.26, 0.97], [0.5, 0.87]];
const MECH_H = 104;
const JET_W = 30;
const JET_H = 30;

/**
 * THE SUPREMO, in a golden throne that stands up and walks.
 *
 *  Phase 1, the throne mech: shoulder cannons, clowns from the door, stomps.
 *  Phase 2, the chest opens: a laser at one of two heights (the glow shows
 *           which: low means jump, high means crouch) and shootable missiles.
 *  Phase 3, the mech falls apart and the Supremo flies out on a jetpack
 *           throne, raining gold coins and bullets.
 */
export class ThroneMech extends Boss {
    phases = [0.62, 0.26];
    attacks = [
        ['cannons', 'summon', 'stomp', 'cannons'],
        ['laser', 'missiles', 'stomp', 'laser', 'cannons'],
        ['coins', 'rain', 'swoop', 'rain'],
    ];
    parTicks = 120 * 60;
    home = 0;
    jumped = false;
    shotsLeft = 0;
    /** laser: height above ground of the beam and when it fires */
    laserY = 0;
    laserLive = false;
    orbit = 0;

    intro(world) {
        this.home = this.arenaRight - 44;
        this.facing = -1;
        this.anim = 'walk';
        if (this.t === 1) this.say(world, 'WHO DARES CRASH MY PARTY?!', 110);
        if (this.t === 120) this.say(world, 'GUARDS! ...GUARDS?', 80);
        return this.walkTo(this.home, 0.6) && this.t > 200;
    }

    get jetpack() {
        return this.phase >= 2;
    }

    restTick(world) {
        if (this.jetpack) {
            this.anim = 'jet';
            this.#hover(world, 1.2);
            return;
        }
        this.vx = 0;
        this.anim = 'idle';
    }

    cannons(world) {
        this.vx = 0;
        this.anim = 'cannons';
        if (this.t === 1) {
            this.shotsLeft = 3 + this.phase;
            world.events.emit(Ev.TELEGRAPH, this.x - 30, this.y - 86, 0, 0, 'glow');
        }
        if (this.t >= 30 && this.t % 26 === 4 && this.shotsLeft > 0) {
            this.shotsLeft--;
            for (const side of [-30, 22]) {
                const mx = this.x + side;
                const my = this.y - 88;
                const [dx, dy] = this.aimAtPlayer(world, mx, my, 3);
                this.shoot(world, 'eBullet', mx, my, dx * 2.4, dy * 2.4);
                this.shoot(world, 'eBullet', mx, my, dx * 2.4 - dy * 0.5, dy * 2.4 + dx * 0.5);
            }
        }
        return this.shotsLeft === 0 && this.t > 120;
    }

    summon(world) {
        this.vx = 0;
        this.anim = 'door';
        if (this.t === 1) this.say(world, 'SEND IN THE CLOWNS!', 70);
        if ((this.t === 30 || this.t === 60) && world.countAlive('clown') < 3) {
            world.spawnEnemy('clown', this.x - 30, this.y, { awake: false });
        }
        return this.t > 90;
    }

    stomp(world) {
        if (this.t === 1) this.jumped = false;
        if (this.t < 30) {
            this.anim = 'crouch';
            this.vx = 0;
            return false;
        }
        if (!this.jumped) {
            this.jumped = true;
            this.vy = -4.4;
            this.onGround = false;
            this.vx = (Math.max(this.arenaLeft + 70, Math.min(this.arenaRight - 60, world.player.body.x)) - this.x) / 36;
            this.anim = 'jump';
            return false;
        }
        if (this.onGround && this.anim === 'jump') {
            this.anim = 'land';
            this.vx = 0;
            this.shockwave(world, this.x, 2.5);
            this.shockwave(world, this.x, 1.5);
        }
        if (this.onGround && this.t > 40) {
            this.anim = 'walk';
            return this.walkTo(this.home, 1) || this.t > 260;
        }
        return false;
    }

    laser(world) {
        this.vx = 0;
        if (this.t === 1) {
            this.laserY = world.rng.chance(0.5) ? 8 : 22;
            this.laserLive = false;
            world.events.emit(Ev.TELEGRAPH, this.x - 20, this.y - this.laserY, this.laserY, 0, 'laser');
        }
        this.anim = this.t < 56 ? 'chargeLaser' : 'laser';
        this.laserLive = this.t >= 56 && this.t < 96;
        if (this.laserLive) {
            const pb = world.player.body;
            const beamY = this.y - this.laserY;
            if (pb.x < this.x && beamY > pb.y - pb.h && beamY - 3 < pb.y) world.player.hurt(world, 'laser');
            if (this.t === 56) world.events.emit(Ev.SHAKE, 0, 0, 3, 40);
        }
        return this.t >= 110;
    }

    missiles(world) {
        this.vx = 0;
        this.anim = 'missiles';
        if (this.t === 1) this.shotsLeft = 4;
        if (this.t >= 24 && this.t % 16 === 0 && this.shotsLeft > 0) {
            this.shotsLeft--;
            this.shoot(world, 'eMissile', this.x + 10, this.y - 100, -0.8 + this.shotsLeft * 0.5, -2.2);
        }
        return this.shotsLeft === 0 && this.t > 110;
    }

    coins(world) {
        this.anim = 'jet';
        this.#hover(world, 1.6);
        if (this.t % 20 === 0 && this.t < 130) {
            this.shoot(world, 'coinBomb', this.x, this.y + 2, this.vx * 0.5 + (world.player.body.x - this.x) * 0.01, 0);
        }
        return this.t > 150;
    }

    rain(world) {
        this.anim = this.t < 24 ? 'jetCharge' : 'jet';
        this.#hover(world, 0.6);
        if (this.t === 1) world.events.emit(Ev.TELEGRAPH, this.x, this.y + 4, 0, 0, 'glow');
        if (this.t >= 24 && this.t % 22 === 2 && this.t < 24 + 22 * 4) {
            for (const [dx, dy] of RAIN) this.shoot(world, 'eBullet', this.x, this.y + 2, dx * 2.1, dy * 2.1);
        }
        return this.t > 24 + 22 * 4 + 10;
    }

    swoop(world) {
        this.anim = 'jet';
        if (this.t === 1) {
            this.say(world, 'BOW TO ME!', 40);
            world.events.emit(Ev.TELEGRAPH, this.x, this.y, 0, 0, 'duck');
        }
        if (this.t < 30) {
            this.#hover(world, 1);
            return false;
        }
        // a low pass across the arena, high enough to duck under: crouch
        const ground = world.terrain.groundY(this.x);
        const dir = this.x > (this.arenaLeft + this.arenaRight) / 2 ? -1 : 1;
        if (this.t === 30) this.orbit = dir;
        this.vx = approach(this.vx, this.orbit * 2.6, 0.15);
        this.vy = approach(this.vy, (ground - 21 - this.y) * 0.08, 0.2);
        const done = this.orbit < 0 ? this.x < this.arenaLeft + 40 : this.x > this.arenaRight - 40;
        if (done || this.t > 220) {
            this.vy = -1.5;
            return true;
        }
        return false;
    }

    #hover(world, speed) {
        const px = world.player.body.x;
        const cx = (this.arenaLeft + this.arenaRight) / 2;
        const tx = cx + sinX(this.age * 0.018) * 120 + (px - cx) * 0.2;
        const ty = 70 + cosX(this.age * 0.031) * 22;
        this.vx = approach(this.vx, Math.max(-speed * 1.5, Math.min(speed * 1.5, (tx - this.x) * 0.04)), 0.1);
        this.vy = approach(this.vy, Math.max(-speed, Math.min(speed, (ty - this.y) * 0.05)), 0.1);
        this.facing = px < this.x ? -1 : 1;
    }

    onPhase(world, phase) {
        this.laserLive = false;
        if (phase === 1) {
            this.say(world, 'YOU RUINED MY SUIT!', 70);
        } else if (phase === 2) {
            world.events.emit(Ev.EXPLODE, this.x, this.y - 50, 50, 0, 'big');
            world.events.emit(Ev.PROP_BREAK, this.x, this.y - 50, 0, 0, 'mech');
            this.say(world, 'PLAN B! JETPACK!', 80);
            this.flying = true;
            this.w = JET_W;
            this.h = JET_H;
            this.y -= MECH_H - JET_H;
            this.vy = -2;
        }
    }

    move(world) {
        if (this.jetpack) {
            this.x += this.vx;
            this.y += this.vy;
            return;
        }
        if (this.onGround && this.vy >= 0) {
            this.x += this.vx;
            this.y = world.terrain.groundY(this.x);
            return;
        }
        this.vy += 0.22;
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
