import { Pool } from '../core/Pool.js';

/**
 * Every bullet, rocket, bomb and flame in flight. Kinds are data: adding a new
 * shot means one entry here and one drawing in the renderer.
 *
 * Fields of a kind:
 *  w, h        hitbox
 *  life        ticks before it fizzles
 *  pierce      targets it can pass through (1 = stops on the first)
 *  gravity     added to vy each tick
 *  drag        vx and vy multiplied by it each tick
 *  accel, max  rockets speed up along their direction
 *  homing      steering strength towards the nearest target
 *  ground      'die' | 'explode' | 'bounce' | 'pass' | 'follow'
 *  bounces     for 'bounce': ground hits before exploding
 *  explode     blast radius when it ends with a bang
 *  blast       damage of that blast
 *  shootable   player shots can destroy it (hp)
 *  burn        a target can be hit again by it after these ticks
 *  growth      the hitbox grows by this much per tick (flames)
 */
export const ShotKinds = Object.freeze({
    // the player's
    bullet: { w: 7, h: 6, life: 70, pierce: 1, ground: 'die' },
    heavyBullet: { w: 9, h: 6, life: 60, pierce: 1, ground: 'die' },
    blast: { w: 74, h: 38, life: 7, pierce: 99, ground: 'pass' },
    rocket: { w: 9, h: 6, life: 150, pierce: 1, accel: 0.24, max: 6.5, homing: 0.09, ground: 'explode', explode: 24, blast: 4 },
    flame: { w: 8, h: 8, life: 26, pierce: 99, drag: 0.93, gravity: -0.035, ground: 'pass', burn: 5, growth: 0.45 },
    meatball: { w: 7, h: 7, life: 240, gravity: 0.2, ground: 'bounce', bounces: 1, explode: 32, blast: 10 },

    // the enemies'
    eBullet: { w: 5, h: 5, life: 320, pierce: 1, ground: 'die' },
    eFast: { w: 8, h: 3, life: 120, pierce: 1, ground: 'die' },
    eSprinkle: { w: 4, h: 4, life: 200, pierce: 1, ground: 'die', gravity: 0.02 },
    eRocket: { w: 13, h: 6, life: 300, pierce: 1, accel: 0.05, max: 3.2, ground: 'explode', explode: 18, shootable: 1 },
    eMissile: { w: 11, h: 6, life: 260, pierce: 1, accel: 0.08, max: 2.8, homing: 0.05, ground: 'explode', explode: 18, shootable: 2 },
    eGrenade: { w: 6, h: 6, life: 90, gravity: 0.2, ground: 'bounce', bounces: 2, explode: 24 },
    eShell: { w: 8, h: 8, life: 400, gravity: 0.15, ground: 'explode', explode: 26, shootable: 2 },
    cherry: { w: 9, h: 9, life: 400, gravity: 0.17, ground: 'explode', explode: 24, shootable: 1 },
    scoop: { w: 10, h: 10, life: 400, gravity: 0.15, ground: 'explode', explode: 26, shootable: 2 },
    candyBomb: { w: 8, h: 8, life: 400, gravity: 0.2, ground: 'explode', explode: 22 },
    coinBomb: { w: 8, h: 8, life: 400, gravity: 0.18, ground: 'explode', explode: 22, shootable: 1 },
    wax: { w: 6, h: 8, life: 400, gravity: 0.13, ground: 'die' },
    eFlame: { w: 10, h: 10, life: 34, pierce: 99, drag: 0.95, gravity: -0.02, ground: 'pass', growth: 0.3 },
    glob: { w: 14, h: 10, life: 300, pierce: 1, ground: 'die' },
    wave: { w: 14, h: 12, life: 170, pierce: 99, ground: 'follow' },
});

export class Projectile {
    active = false;
    kind = '';
    /** @type {any} */ def = null;
    x = 0;
    y = 0;
    vx = 0;
    vy = 0;
    w = 0;
    h = 0;
    damage = 1;
    age = 0;
    life = 0;
    pierce = 1;
    bounces = 0;
    hp = 0;
    /** 'player' | 'enemy' */
    owner = 'player';
    /** shots fired by the player that count for accuracy */
    countsAccuracy = false;
    /** set once it has hit something, for accuracy */
    landed = false;
    /** @type {any[]} targets already hit (pierce) */
    hits = [];
    /** a free number the spawner may use (sweep step, variant...) */
    tag = 0;
    flash = 0;

    get left() { return this.x - this.w / 2; }
    get top() { return this.y - this.h / 2; }
}

export class Projectiles {
    pool;

    constructor(size) {
        this.pool = new Pool(() => new Projectile(), size);
    }

    get items() {
        return this.pool.items;
    }

    /**
     * @param {keyof typeof ShotKinds} kind
     * @returns {Projectile | null}
     */
    spawn(kind, owner, x, y, vx, vy, damage = 1) {
        const p = this.pool.acquire();
        if (!p) return null;
        const def = ShotKinds[kind];
        p.kind = kind;
        p.def = def;
        p.owner = owner;
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.w = def.w;
        p.h = def.h;
        p.damage = damage;
        p.age = 0;
        p.life = def.life;
        p.pierce = def.pierce ?? 1;
        p.bounces = def.bounces ?? 0;
        p.hp = def.shootable ?? 0;
        p.countsAccuracy = false;
        p.landed = false;
        p.hits.length = 0;
        p.tag = 0;
        p.flash = 0;
        return p;
    }

    clear() {
        this.pool.clear();
    }

    /**
     * @param {import('./World.js').World} world
     */
    update(world) {
        for (const p of this.pool.items) {
            if (!p.active) continue;
            this.#step(p, world);
        }
    }

    /** @param {Projectile} p */
    #step(p, world) {
        const d = p.def;
        p.age++;
        if (p.flash > 0) p.flash--;
        if (p.age > p.life) {
            if (d.explode && d.ground !== 'die') this.detonate(p, world);
            else p.active = false;
            return;
        }

        if (d.homing) this.#steer(p, world, d.homing);
        if (d.accel) {
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > 0 && speed < d.max) {
                const k = Math.min(d.max, speed + d.accel) / speed;
                p.vx *= k;
                p.vy *= k;
            }
        }
        if (d.gravity) p.vy += d.gravity;
        if (d.drag) {
            p.vx *= d.drag;
            p.vy *= d.drag;
        }
        if (d.growth) {
            p.w += d.growth;
            p.h += d.growth;
        }
        p.x += p.vx;
        p.y += p.vy;

        const gy = world.terrain.groundY(p.x);
        if (d.ground === 'follow') {
            p.y = gy - p.h / 2;
        } else if (p.y + p.h / 2 >= gy && d.ground !== 'pass') {
            this.#hitGround(p, world, gy);
        } else if (p.y < -120 || p.y > 400) {
            p.active = false;
        }
        if (p.active && (p.x < world.camera.x - 140 || p.x > world.camera.right + 140)) p.active = false;
    }

    #hitGround(p, world, gy) {
        const d = p.def;
        if (d.ground === 'bounce' && p.bounces > 0) {
            p.bounces--;
            p.y = gy - p.h / 2;
            p.vy = -Math.abs(p.vy) * 0.45;
            p.vx *= 0.6;
            return;
        }
        if (d.ground === 'die' && !d.explode) {
            world.events.emit('hit', p.x, gy, 0, 0, 'dirt');
            p.active = false;
            return;
        }
        p.y = gy - p.h / 2;
        this.detonate(p, world);
    }

    /** End a shot with its blast, if it has one. */
    detonate(p, world) {
        if (!p.active) return;
        p.active = false;
        const d = p.def;
        if (!d.explode) return;
        world.explode(p.x, p.y, d.explode, d.blast ?? p.damage, p.owner, p.kind === 'meatball' ? 'meatball' : 'fire');
    }

    #steer(p, world, strength) {
        const target = p.owner === 'player' ? world.nearestEnemy(p.x, p.y, p.vx) : world.player.body;
        if (!target) return;
        const tx = target.x - p.x;
        const ty = (target.y - target.h / 2) - p.y;
        const dist = Math.sqrt(tx * tx + ty * ty);
        if (dist < 1) return;
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        p.vx += ((tx / dist) * speed - p.vx) * strength;
        p.vy += ((ty / dist) * speed - p.vy) * strength;
        const now = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (now > 0) {
            p.vx *= speed / now;
            p.vy *= speed / now;
        }
    }
}
