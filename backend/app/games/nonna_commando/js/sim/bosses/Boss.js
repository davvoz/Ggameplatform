import { Ev } from '../Events.js';
import { Enemy } from '../enemies/Enemy.js';

const DEATH_TICKS = 130;

/**
 * Base of mini bosses and bosses: an entrance, a loop of telegraphed attacks
 * picked from a list, phases at health thresholds and a long explosive death.
 *
 * Subclasses provide `attacks` (names of methods run while in that state),
 * `phases` (hp fractions where the boss changes) and the attack methods. Each
 * attack method returns true when it is over.
 */
export class Boss extends Enemy {
    /** the arena, set when the boss wakes */
    arenaLeft = 0;
    arenaRight = 0;
    phase = 0;
    /** hp fractions below which the next phase starts, highest first */
    phases = [];
    /** attack names for each phase */
    attacks = [['idle']];
    #queue = [];
    fightTicks = 0;
    /** ticks to beat for the full speed bonus */
    parTicks = 60 * 60;
    rest = 0;
    contactDamage = true;

    get name() {
        return this.def.name;
    }

    onWake(world) {
        this.arenaLeft = world.camera.lockX === Infinity ? world.camera.x : world.camera.lockX;
        this.arenaRight = this.arenaLeft + 384;
        world.events.emit(Ev.BOSS_INTRO, this.x, this.y, 0, 0, this.name, this);
        this.setState('intro');
    }

    think(world) {
        this.fightTicks++;
        if (this.contactDamage && this.state !== 'intro' && this.touchesPlayer(world, -2)) world.player.hurt(world, 'crush');
        if (this.state === 'intro') {
            if (this.intro(world)) this.#next(world);
            return;
        }
        if (this.state === 'rest') {
            this.anim = 'idle';
            this.restTick(world);
            if (this.t >= this.rest) this.#next(world);
            return;
        }
        const method = this[this.state];
        if (typeof method !== 'function' || method.call(this, world)) {
            this.rest = this.restTicks(world);
            this.setState('rest');
        }
        this.#stayInArena(world);
    }

    /** Safety net: whatever an attack does, the boss stays where it can be fought. */
    #stayInArena(world) {
        const half = this.w / 2;
        if (this.x < this.arenaLeft + half - 10) {
            this.x = this.arenaLeft + half - 10;
            if (this.vx < 0) this.vx = 0;
        } else if (this.x > this.arenaRight - half + 10) {
            this.x = this.arenaRight - half + 10;
            if (this.vx > 0) this.vx = 0;
        }
        if (this.flying) {
            const ground = world.terrain.groundY(this.x);
            if (this.y < 30 + this.h * 0.3) this.y = 30 + this.h * 0.3;
            if (this.y > ground - 4) this.y = ground - 4;
        }
    }

    /** Entrance: true when it is over. */
    intro(_world) {
        return this.t > 60;
    }

    /** What to do while resting between attacks. */
    restTick(_world) {
        this.vx = 0;
    }

    restTicks(world) {
        return this.wait(world, 40, 70) - this.phase * 10;
    }

    #next(world) {
        if (this.#queue.length === 0) {
            const list = this.attacks[Math.min(this.phase, this.attacks.length - 1)];
            // shuffle a fresh bag: every attack comes once before any repeats
            this.#queue = [...list];
            for (let i = this.#queue.length - 1; i > 0; i--) {
                const j = world.rng.int(0, i);
                [this.#queue[i], this.#queue[j]] = [this.#queue[j], this.#queue[i]];
            }
        }
        this.setState(this.#queue.pop());
    }

    takeHit(world, damage, hit) {
        if (this.state === 'intro') return 0;
        const taken = super.takeHit(world, damage, hit);
        world.score.keepAlive();
        while (this.phase < this.phases.length && this.hp <= this.maxHp * this.phases[this.phase] && this.hp > 0) {
            this.phase++;
            this.#queue.length = 0;
            world.events.emit(Ev.BOSS_PHASE, this.x, this.y - this.h / 2, this.phase, 0, this.type, this);
            world.events.emit(Ev.SHAKE, 0, 0, 5, 20);
            // a new phase interrupts whatever it was doing: attacks are written for one body
            this.vx = 0;
            this.rest = 40;
            this.setState('rest');
            this.onPhase(world, this.phase);
        }
        return taken;
    }

    onPhase(_world, _phase) {}

    die(world, hit) {
        this.dead = true;
        this.setState('dead');
        this.vx = 0;
        this.deathStyle = 'boss';
        world.events.emit(Ev.SHAKE, 0, 0, 6, 40);
        world.clearEnemyShots();
        this.onDeath(world, hit);
    }

    get corpseTicks() {
        return DEATH_TICKS;
    }

    dyingUpdate(world) {
        if (!this.flying) {
            const gy = world.terrain.groundY(this.x);
            this.vy = Math.min(this.vy + 0.2, 5);
            this.y = Math.min(gy, this.y + this.vy);
        } else {
            this.vy = Math.min(this.vy + 0.05, 2.5);
            this.y += this.vy;
            this.x += this.vx;
        }
        if (this.t % 9 === 0 && this.t < DEATH_TICKS - 20) {
            const ex = this.x + world.rng.int(-this.w / 2, this.w / 2);
            const ey = this.y - world.rng.int(4, this.h);
            world.events.emit(Ev.EXPLODE, ex, ey, 18, 0, 'fire');
        }
        if (this.t === DEATH_TICKS - 20) {
            world.events.emit(Ev.EXPLODE, this.x, this.y - this.h / 2, 60, 0, 'big');
            world.events.emit(Ev.SHAKE, 0, 0, 9, 30);
        }
        if (this.t > DEATH_TICKS) {
            this.remove = true;
            world.bossDefeated(this);
        }
    }

    // helpers

    /** Lob a shot so it lands at tx after `flight` ticks. */
    lob(world, kind, x0, y0, tx, flight, gravity) {
        const ty = world.terrain.groundY(tx) - 4;
        const vx = (tx - x0) / flight;
        const vy = (ty - y0) / flight - (gravity * flight) / 2;
        return this.shoot(world, kind, x0, y0, vx, vy);
    }

    /** Send shockwaves both ways along the ground from x. */
    shockwave(world, x, speed = 2.4) {
        const y = world.terrain.groundY(x);
        this.shoot(world, 'wave', x - 16, y - 6, -speed, 0);
        this.shoot(world, 'wave', x + 16, y - 6, speed, 0);
        world.events.emit(Ev.SHOCKWAVE, x, y);
        world.events.emit(Ev.SHAKE, 0, 0, 4, 14);
    }

    /** Walk toward an x; true when there. */
    walkTo(x, speed) {
        const d = x - this.x;
        if (Math.abs(d) <= speed) {
            this.x = x;
            this.vx = 0;
            return true;
        }
        this.vx = Math.sign(d) * speed;
        return false;
    }
}
