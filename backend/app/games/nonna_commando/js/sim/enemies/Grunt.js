import { Ev } from '../Events.js';
import { Enemy } from './Enemy.js';

const PANIC_LINES = ['MAMMA!', 'NOT THE FACE!', 'I QUIT!', 'NONNA NO!', 'I JUST SERVE CAKE!'];

/**
 * The Supremo's conscript: party hat strapped to the helmet, rifle, no
 * enthusiasm. Placed grunts are busy celebrating until they notice Nonna.
 *
 * States: enter, party, surprised, advance, aim, recover, windup, stab, panic.
 * Standing grunts shoot at chest height: crouching ducks the shot.
 */
export class Grunt extends Enemy {
    range;
    nextShot;
    speed = 0.7;
    aimTicks = 26;
    panicDir = 1;
    panicTicks = 0;

    constructor(type, x, y, opts) {
        super(type, x, y, opts);
        this.range = 0;
        this.nextShot = 0;
    }

    onWake(world) {
        this.range = world.rng.int(70, 150);
        this.nextShot = this.wait(world, 30, 90);
        if (this.state === 'party') this.anim = 'party';
    }

    /** Something scary landed nearby. */
    scare(world, fromX) {
        if (!this.targetable || this.state === 'panic' || this.state === 'party') return;
        this.panicDir = this.x < fromX ? -1 : 1;
        this.panicTicks = world.rng.int(50, 85);
        this.setState('panic');
        if (world.rng.chance(0.6)) this.say(world, PANIC_LINES[world.rng.int(0, PANIC_LINES.length - 1)]);
    }

    think(world) {
        if (this.state !== 'panic') this.facePlayer(world);
        switch (this.state) {
            case 'enter': return this.#enter();
            case 'party': return this.#party(world);
            case 'surprised': return this.#surprised();
            case 'advance': return this.advance(world);
            case 'aim': return this.#aim(world);
            case 'recover': return this.#recover();
            case 'windup': return this.#windup(world);
            case 'stab': return this.#stab();
            case 'panic': return this.#panic(world);
            default: return this.advance(world);
        }
    }

    #enter() {
        this.anim = this.onGround ? 'walk' : 'fall';
        this.vx = this.onGround ? this.facing * this.speed * 1.4 : this.vx;
        if ((this.onGround && this.t > 24) || this.t > 200) this.setState('advance');
    }

    #party(world) {
        this.vx = 0;
        this.anim = 'party';
        const near = Math.abs(this.playerDx(world)) < 165;
        if (near || this.hp < this.maxHp) {
            this.say(world, '!', 30);
            this.setState('surprised');
        }
    }

    #surprised() {
        this.vx = 0;
        this.anim = 'surprised';
        if (this.t >= 20) this.setState('advance');
    }

    /** Close in, keep a distance, shoot when ready. */
    advance(world) {
        const dx = this.playerDx(world);
        const dist = Math.abs(dx);
        const pb = world.player.body;
        const level = Math.abs(pb.y - this.y) < 20;

        if (dist < 28 && level && world.player.alive) {
            this.vx = 0;
            this.setState('windup');
            return;
        }
        if (dist > this.range + 16) this.vx = this.facing * this.speed;
        else if (dist < this.range - 50 && this.x < world.camera.right - 30) this.vx = -this.facing * this.speed * 0.6;
        else this.vx = 0;
        this.anim = this.vx === 0 ? 'idle' : 'walk';

        const onScreen = this.x > world.camera.x + 10 && this.x < world.camera.right - 10;
        if (this.t >= this.nextShot && this.onGround && onScreen && world.player.alive) {
            this.vx = 0;
            this.setState('aim');
        }
    }

    #aim(world) {
        this.vx = 0;
        this.anim = 'aim';
        if (this.t < this.aimTicks) return;
        this.attack(world);
        this.nextShot = this.wait(world, 70, 130);
        this.setState('recover');
    }

    /** The shot itself: overridden by grenadiers. */
    attack(world) {
        const mx = this.x + this.facing * 12;
        const my = this.y - 19;
        const [dx, dy] = this.aimAtPlayer(world, mx, my, 0.35);
        this.shoot(world, 'eBullet', mx, my, dx * 2.3, dy * 2.3);
    }

    #recover() {
        this.vx = 0;
        this.anim = this.t < 10 ? 'recoil' : 'idle';
        if (this.t >= 24) this.setState('advance');
    }

    #windup(world) {
        this.vx = 0;
        this.anim = 'windup';
        if (this.t < 18) return;
        if (this.touchesPlayer(world, 12)) world.player.hurt(world, 'bayonet');
        world.events.emit(Ev.MELEE, this.x + this.facing * 12, this.y - 14, this.facing, 0, 'enemy');
        this.setState('stab');
    }

    #stab() {
        this.vx = 0;
        this.anim = 'stab';
        if (this.t >= 26) this.setState('advance');
    }

    #panic(world) {
        this.facing = this.panicDir;
        this.vx = this.panicDir * 1.6;
        this.anim = 'panic';
        if (this.blocked || this.x > world.camera.right - 6) this.panicDir = -this.panicDir;
        if (this.t >= this.panicTicks) this.setState('advance');
    }
}
