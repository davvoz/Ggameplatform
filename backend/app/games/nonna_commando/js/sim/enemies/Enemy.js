import { EnemyDefs } from '../../config/Enemies.js';
import { View } from '../../config/Tuning.js';
import { Body, moveBody } from '../Body.js';
import { Ev } from '../Events.js';

/**
 * Base of every enemy. Handles waking up when the camera reaches it, the hit
 * flash, burning, dying (a short flight with confetti, it's a party after all)
 * and the drop. Subclasses only write `think`.
 *
 * @typedef {Object} HitInfo
 * @property {string} kind bullet | blast | rocket | flame | melee | explosion | chain | crush
 * @property {number} x
 * @property {number} y
 * @property {number} dirX direction the shot travels, -1 or 1 (0 for blasts)
 * @property {boolean} byPlayer
 */
export class Enemy extends Body {
    /** given by the world, in spawn order */
    id = 0;
    type;
    def;
    hp;
    maxHp;
    facing = -1;
    state = 'idle';
    /** ticks in the current state */
    t = 0;
    age = 0;
    awake = false;
    /** dying: no longer a target, playing its death */
    dead = false;
    /** gone: the world drops it at the end of the tick */
    remove = false;
    flash = 0;
    burnCooldown = 0;
    flying = false;
    /** arena wave this enemy belongs to */
    tag = '';
    /** pickup carried, dropped on death */
    drop = '';
    /** how it died, for the death animation: shot | blown | burnt | slipper */
    deathStyle = 'shot';
    /** in the air from an explosion or a fall: kills count as AIRBORNE */
    juggled = false;
    /** boss flag: big health bar, fixed points */
    isBoss = false;
    /** the camera has to see it for it to count in arena waves */
    countsForArena = true;
    /** what the renderer should draw, set by think() */
    anim = 'idle';
    /** short text above the head */
    speech = '';
    speechTicks = 0;

    /**
     * @param {string} type key of EnemyDefs
     * @param {number} x
     * @param {number} y feet
     * @param {Object} [opts]
     */
    constructor(type, x, y, opts = {}) {
        super();
        this.type = type;
        this.def = EnemyDefs[type];
        this.hp = this.def.hp * (opts.hpScale ?? 1);
        this.maxHp = this.hp;
        this.w = this.def.w;
        this.h = this.def.h;
        this.x = x;
        this.y = y;
        this.flying = !!this.def.flying;
        this.isBoss = !!this.def.boss;
        this.drop = opts.drop ?? '';
        this.tag = opts.tag ?? '';
        this.forceWake = !!opts.awake;
        this.opts = opts;
    }

    get alive() {
        return !this.dead && !this.remove;
    }

    /** Can be hit right now. */
    get targetable() {
        return this.alive && this.awake;
    }

    get meleeable() {
        return this.targetable && !!this.def.melee;
    }

    setState(state) {
        this.state = state;
        this.t = 0;
    }

    say(world, line, ticks = 60) {
        this.speech = line;
        this.speechTicks = ticks;
        world.events.emit(Ev.SPEECH, this.x, this.top, 0, 0, line, this);
    }

    /** @param {import('../World.js').World} world */
    update(world) {
        this.age++;
        this.t++;
        if (this.flash > 0) this.flash--;
        if (this.burnCooldown > 0) this.burnCooldown--;
        if (this.speechTicks > 0) this.speechTicks--;

        if (this.dead) {
            this.dyingUpdate(world);
            return;
        }
        if (!this.awake) {
            const visible = this.x - this.w / 2 < world.camera.right + View.wakeMargin;
            if (this.forceWake || visible) this.wake(world);
            else return;
        }
        if (this.x < world.camera.x - View.despawnMargin && !this.isBoss) {
            this.remove = true;
            return;
        }
        this.think(world);
        this.move(world);
    }

    /** First moment on screen. */
    wake(world) {
        this.awake = true;
        this.setState(this.opts.state ?? 'enter');
        this.onWake(world);
    }

    onWake(_world) {}

    /** @param {import('../World.js').World} _world */
    think(_world) {}

    move(world) {
        if (this.flying) {
            this.x += this.vx;
            this.y += this.vy;
            return;
        }
        const wasGround = this.onGround;
        moveBody(this, world.terrain, world.blockers);
        if (this.onGround) this.juggled = false;
        if (!wasGround && this.onGround) this.onLand(world);
    }

    onLand(_world) {}

    /**
     * Receive damage. Subclasses can refuse it (a shield) by returning 0.
     * @param {import('../World.js').World} world
     * @param {number} damage
     * @param {HitInfo} hit
     * @returns {number} damage taken
     */
    takeHit(world, damage, hit) {
        if (hit.kind === 'flame') {
            if (this.burnCooldown > 0) return 0;
            this.burnCooldown = 5;
            damage *= 5;
        }
        this.hp -= damage;
        this.flash = 4;
        return damage;
    }

    /** Called once when hp reaches 0. */
    die(world, hit) {
        this.dead = true;
        this.setState('dead');
        this.flying = false;
        this.onGround = false;
        this.platform = null;
        const dir = hit.dirX || (hit.x < this.x ? 1 : -1);
        this.deathStyle = hit.kind === 'flame' ? 'burnt'
            : hit.kind === 'melee' ? 'slipper'
                : hit.kind === 'explosion' || hit.kind === 'chain' || hit.kind === 'rocket' || hit.kind === 'blast' ? 'blown' : 'shot';
        this.vx = dir * (this.deathStyle === 'blown' ? 2.2 : 1.1);
        this.vy = this.deathStyle === 'blown' ? -4.2 : -2.4;
        if (this.drop) world.dropPickup(this.drop, this.x, this.y - this.h / 2);
        this.onDeath(world, hit);
    }

    onDeath(_world, _hit) {}

    /** How long the body stays on screen after death. */
    get corpseTicks() {
        return 48;
    }

    /** One tick of the death animation. */
    dyingUpdate(world) {
        this.x += this.vx;
        this.vy = Math.min(this.vy + 0.22, 6);
        this.y += this.vy;
        const gy = world.terrain.groundY(this.x);
        if (this.y >= gy) {
            this.y = gy;
            this.vy = 0;
            this.vx *= 0.7;
        }
        if (this.t > this.corpseTicks) this.remove = true;
    }

    // helpers for subclasses

    playerDx(world) {
        return world.player.body.x - this.x;
    }

    facePlayer(world) {
        this.facing = this.playerDx(world) < 0 ? -1 : 1;
    }

    /** Ticks scaled by difficulty, with seeded jitter. */
    wait(world, min, max) {
        return Math.round(world.rng.int(min, max) / world.difficulty);
    }

    /** Aimed unit vector from a point to the player's chest, its vertical part limited. */
    aimAtPlayer(world, fromX, fromY, maxSlope = 0.6) {
        const pb = world.player.body;
        let dx = pb.x - fromX;
        let dy = (pb.y - pb.h * 0.6) - fromY;
        if (Math.abs(dy) > Math.abs(dx) * maxSlope) dy = Math.sign(dy) * Math.abs(dx) * maxSlope;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        dx /= len;
        dy /= len;
        return [dx, dy];
    }

    touchesPlayer(world, slack = 0) {
        const pb = world.player.body;
        return Math.abs(pb.x - this.x) < (pb.w + this.w) / 2 + slack
            && pb.y - pb.h < this.y && this.y - this.h < pb.y;
    }

    shoot(world, kind, x, y, vx, vy, damage = 1) {
        const p = world.enemyShots.spawn(kind, 'enemy', x, y, vx, vy, damage);
        if (p) world.events.emit(Ev.ENEMY_SHOT, x, y, vx, vy, kind);
        return p;
    }
}
