import { INVADER, WORLD } from '../../config/Tuning.js';

const SPAWN_TIME = 0.45;
/** How much of the step's speed-up the wind-ups take. */
const WINDUP_SPEEDUP = 0.5;
const SAME_LEVEL = 30;
const LEDGE_STEP = 14;

/**
 * @typedef {Object} EnemyWorld What a monster may see and do on its turn.
 * @property {import('../Mage.js').Mage} mage
 * @property {import('../Terrain.js').Terrain} terrain
 * @property {number} slow speed factor (frost)
 * @property {(enemy: Enemy, kind: string) => void} fire throws a shot at the mage
 * @property {(enemy: Enemy, damage: number) => void} strike a melee blow on the mage
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

    get body() {
        return this.stats.body;
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

    /** Is it winding up a blow or a throw (the red "!")? A bolt now is critical. */
    get telegraphing() {
        return this.state === 'windup' || this.state === 'throw';
    }

    /**
     * A bolt lands. A swing already wound up still lands, unless the bolt
     * `interrupts` it (a critical hit).
     * @returns {boolean} true when it kills
     */
    hurt(damage, fromX, interrupts = false) {
        if (!this.alive) return false;
        this.hp = Math.max(0, this.hp - damage);
        this.flash = 0.12;
        if (this.hp === 0) return true;
        if (this.stats.stagger && (interrupts || this.state !== 'windup')) {
            this.x += (this.x < fromX ? -1 : 1) * (this.stats.knockback ?? 0);
            this.setState('stagger');
        }
        return false;
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
        if (this.state === 'spawn') {
            if (this.stateTime >= SPAWN_TIME) this.setState(this.flying ? 'fly' : 'walk');
            return;
        }
        if (this.state === 'stagger' && this.stateTime >= this.stats.stagger) this.setState('walk');
        // every subclass writes `think`: the behaviour of one tick
        if (this.state !== 'stagger' && this.state !== 'fall') this.think(world, dt);
        if (!this.flying) this.fall(world, dt);
    }

    // ── helpers for walkers ────────────────────────────────────────────

    /** Is the mage on this monster's level (not on a ledge above or below)? */
    levelWithMage(mage) {
        return Math.abs(this.y - mage.feetY) <= SAME_LEVEL;
    }

    faceMage(mage) {
        if (mage.x !== this.x) this.facing = mage.x < this.x ? -1 : 1;
    }

    /** Walk towards `targetX`, at most one step. @returns {boolean} arrived */
    walkTo(targetX, world, dt) {
        const step = this.speed * world.slow * dt;
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
