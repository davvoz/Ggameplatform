import { BOSS, INVADER, WORLD } from '../../config/Tuning.js';
import { BossKit } from './BossKit.js';

const SPAWN_TIME = 0.45;
/** How much of the step's speed-up the wind-ups take. */
const WINDUP_SPEEDUP = 0.5;
const SAME_LEVEL = 30;
const LEDGE_STEP = 14;
/** The states where a monster telegraphs (the red "!"): a bolt then is critical. */
const TELEGRAPHS = new Set(['windup', 'throw', 'rally']);
/** The timings a boss's fury shortens. */
const FURY_TIMED = Object.freeze(['windup', 'throwWindup', 'recover', 'reload', 'rally', 'volleyGap']);

function scaleBody({ halfWidth, height }, scale) {
    return { halfWidth: halfWidth * scale, height: height * scale };
}

/**
 * @typedef {Object} EnemyWorld What a monster may see and do on its turn.
 * @property {import('../Mage.js').Mage} mage
 * @property {import('../Terrain.js').Terrain} terrain
 * @property {number} slow speed factor (frost)
 * @property {(enemy: Enemy, kind: string) => void} fire throws a shot at the mage
 * @property {(enemy: Enemy, damage: number) => void} strike a melee blow on the mage
 * @property {(enemy: Enemy, count: number) => void} summon a boss calls bats to its side
 * @property {(enemy: Enemy) => void} roar a boss grows furious
 */

/**
 * A monster. Walkers stand on a layer of the terrain (`y` is their feet),
 * flyers float (`y` is their centre). Subclasses write `think`.
 */
export class Enemy {
    /** @param {{id: number, kind: string, stats: object, x: number, y: number, layer?: number, power?: object, invader?: object}} spec */
    constructor({ id, kind, stats, x, y, layer = 0, power = {}, invader = null }) {
        this.id = id;
        this.kind = kind;
        this.stats = stats;
        this.x = x;
        this.y = y;
        this.layer = layer;
        this.vy = 0;
        this.maxHp = Math.max(1, Math.round(stats.hp * (power.hp ?? 1)));
        this.hp = this.maxHp;
        this.speed = stats.speed * (power.speed ?? 1);
        /**
         * Its stats with the swing and the throw sped up by half as much as its
         * step (late waves strike sooner): the behaviour and the drawing time them on it.
         */
        const tempo = 1 + ((power.speed ?? 1) - 1) * WINDUP_SPEEDUP;
        this.timing = { ...stats, windup: stats.windup / tempo, throwWindup: stats.throwWindup / tempo };
        this.invader = invader;
        /** What only bosses do (fury, bats, volleys, the charge, the swoop); null for the others. */
        this.bossKit = invader ? new BossKit(invader.level) : null;
        if (invader) Object.assign(this.timing, { rally: BOSS.charge.rally, volleyGap: BOSS.volleyGap });
        /** Its body box: invaders are drawn bigger, and hit and tapped as big as they look. */
        this.body = invader ? scaleBody(stats.body, INVADER.lookScale) : stats.body;
        /** Invaders stand their ground: a critical hit pushes them back less. */
        this.knockback = (stats.knockback ?? 0) * (invader ? INVADER.knockback : 1);
        this.facing = x < WORLD.width / 2 ? 1 : -1;
        this.state = 'spawn';
        this.stateTime = 0;
        this.reload = 0;
        this.flash = 0;
        /** Damage this monster did to the mage (for invaders' reports). */
        this.damageDone = 0;
    }

    get alive() {
        return this.hp > 0;
    }

    get flying() {
        return Boolean(this.stats.flying);
    }

    /** Middle of the body: bolts aim here. */
    get center() {
        return this.flying ? { x: this.x, y: this.y } : { x: this.x, y: this.y - this.body.height * 0.5 };
    }

    /** Hearts a blow of it takes. */
    get damage() {
        return this.stats.damage;
    }

    /** Where its shots leave: its `muzzle`, turned the way it faces (invaders are drawn bigger). */
    get muzzle() {
        const { forward, up } = this.stats.muzzle;
        const scale = this.invader ? INVADER.lookScale : 1;
        return { x: this.x + this.facing * forward * scale, y: this.y - up * scale };
    }

    /** Is (x, y) within `pad` of the body box? */
    touches(x, y, pad = 0) {
        const { halfWidth, height } = this.body;
        const top = this.flying ? this.y - height / 2 : this.y - height;
        const bottom = this.flying ? this.y + height / 2 : this.y;
        return Math.abs(x - this.x) <= halfWidth + pad && y >= top - pad && y <= bottom + pad;
    }

    /** Is it winding up a blow, a throw or a charge (the red "!")? A bolt now is critical. */
    get telegraphing() {
        return TELEGRAPHS.has(this.state);
    }

    /**
     * A bolt lands. A swing already wound up still lands, unless the bolt
     * `interrupts` it (a critical hit). Invaders shrug off plain bolts: only
     * a critical hit staggers them, and none once they are furious (only the
     * shield's shove still does).
     * @returns {boolean} true when it kills
     */
    hurt(damage, fromX, interrupts = false) {
        if (!this.alive) return false;
        this.hp = Math.max(0, this.hp - damage);
        this.flash = 0.12;
        if (this.hp === 0) return true;
        this.bossKit?.wounded(this.hp / this.maxHp);
        if (this.#staggeredBy(interrupts)) {
            this.x += (this.x < fromX ? -1 : 1) * this.knockback;
            this.setState('stagger');
        }
        return false;
    }

    #staggeredBy(interrupts) {
        if (!this.stats.stagger) return false;
        if (this.bossKit) return interrupts && !this.bossKit.furious;
        return interrupts || this.state !== 'windup';
    }

    /** Pushed back by the shield: a step away and a stagger, whatever it was doing. */
    shove(fromX, distance) {
        this.x += (this.x < fromX ? -1 : 1) * distance;
        this.flash = 0.12;
        this.setState('stagger');
    }

    setState(state) {
        this.state = state;
        this.stateTime = 0;
    }

    /** @param {EnemyWorld} world */
    update(world, dt) {
        this.stateTime += dt;
        this.flash = Math.max(0, this.flash - dt);
        this.reload = Math.max(0, this.reload - dt * world.slow);
        if (this.bossKit) this.#bossTurn(world);
        if (this.state === 'spawn') {
            if (this.stateTime >= SPAWN_TIME) this.setState(this.flying ? 'fly' : 'walk');
            return;
        }
        if (this.state === 'stagger' && this.stateTime >= this.stats.stagger) this.setState('walk');
        // every subclass writes `think`: the behaviour of one tick
        if (this.state !== 'stagger' && this.state !== 'fall') this.think(world, dt);
        if (!this.flying) this.fall(world, dt);
    }

    /** A boss acts on what the last hits earned: its fury, its bats. */
    #bossTurn(world) {
        const { roar, bats } = this.bossKit.take();
        if (roar) {
            this.#enrage();
            world.roar(this);
        }
        if (bats > 0) world.summon(this, bats);
    }

    /** Furious: a quicker step, shorter wind-ups, rests and reloads. */
    #enrage() {
        this.speed *= BOSS.furySpeed;
        const timing = { ...this.timing };
        for (const key of FURY_TIMED) if (timing[key] !== undefined) timing[key] /= BOSS.furyTempo;
        this.timing = timing;
    }

    // ── helpers for walkers ────────────────────────────────────────────

    /** Is the mage on this monster's level (not on a ledge above or below)? */
    levelWithMage(mage) {
        return Math.abs(this.y - mage.feetY) <= SAME_LEVEL;
    }

    faceMage(mage) {
        if (mage.x !== this.x) this.facing = mage.x < this.x ? -1 : 1;
    }

    /** Walk towards `targetX`, at most one step (`pace` times its own). @returns {boolean} arrived */
    walkTo(targetX, world, dt, pace = 1) {
        const step = this.speed * pace * world.slow * dt;
        const gap = targetX - this.x;
        if (Math.abs(gap) <= step) {
            this.x = targetX;
            return true;
        }
        this.facing = gap < 0 ? -1 : 1;
        this.x += this.facing * step;
        return false;
    }

    /**
     * Where a walker heads to reach the mage: straight to it on the same
     * level, or off its ledge when it stands above.
     */
    approachX(world, stopAt) {
        const { mage, terrain } = world;
        const ledge = this.y < mage.feetY - SAME_LEVEL ? terrain.ledgeOf(this.layer, this.x) : null;
        if (ledge) return this.#ledgeExit(ledge, terrain, mage);
        return mage.x + (this.x < mage.x ? -stopAt : stopAt);
    }

    /**
     * Off the end of the ledge nearer to the mage (it does not depend on where
     * the walker is, so it never dithers), among the ends it can drop from.
     * With none (the ledge runs off the screen on that side), it stops over
     * the mage, on screen: it shoots from there and the player can reach it.
     */
    #ledgeExit(ledge, terrain, mage) {
        const left = terrain.dropsOff(ledge, true) ? ledge.minX - LEDGE_STEP : null;
        const right = terrain.dropsOff(ledge, false) ? ledge.maxX + LEDGE_STEP : null;
        if (left !== null && right !== null) {
            return Math.abs(mage.x - ledge.minX) < Math.abs(ledge.maxX - mage.x) ? left : right;
        }
        if (left !== null || right !== null) return left ?? right;
        const margin = this.body.halfWidth;
        return Math.min(Math.max(mage.x, ledge.minX, margin), ledge.maxX, terrain.width - margin);
    }

    /** Gravity for walkers: off a ledge they drop to the next surface. */
    fall(world, dt) {
        const { terrain } = world;
        const surface = this.state === 'fall' ? null : terrain.surfaceOn(this.layer, this.x);
        if (surface != null && Math.abs(surface - this.y) <= LEDGE_STEP) {
            this.y = surface;
            return;
        }
        if (this.state !== 'fall') this.setState('fall');
        const fromY = this.y;
        this.vy += WORLD.gravity * dt;
        this.y += this.vy * dt;
        const landing = terrain.landing(this.x, fromY, this.y);
        if (landing) this.#land(landing);
        else if (this.y > terrain.height) this.#land({ layer: terrain.floorLayerAt(this.x), y: terrain.floorAt(this.x) });
    }

    #land({ layer, y }) {
        this.layer = layer;
        this.y = y;
        this.vy = 0;
        this.setState('walk');
    }
}
