import { overlaps } from '../core/MathX.js';
import { Ev } from './Events.js';

const KIND_OF_SHOT = {
    bullet: 'bullet',
    heavyBullet: 'bullet',
    blast: 'blast',
    rocket: 'rocket',
    flame: 'flame',
    meatball: 'explosion',
};

/**
 * Resolves who hit whom in a tick: player shots against enemy shots, enemies,
 * props and hostages' streamers; enemy shots against the player. Plain loops
 * over pooled arrays: there are never enough objects to need a grid.
 */
export class Combat {
    /** reused for every hit, so resolving allocates nothing */
    #hit = { kind: '', x: 0, y: 0, dirX: 0, byPlayer: true };

    /** @param {import('./World.js').World} world */
    resolve(world) {
        for (const p of world.playerShots.items) {
            if (p.active) this.#playerShot(world, p);
        }
        this.#enemyShots(world);
    }

    /** @param {import('./Projectiles.js').Projectile} p */
    #playerShot(world, p) {
        const pl = p.left;
        const pt = p.top;

        // shoot down rockets, shells and cherry bombs
        if (p.kind !== 'flame') {
            for (const e of world.enemyShots.items) {
                if (!e.active || e.hp <= 0) continue;
                if (!overlaps(pl, pt, p.w, p.h, e.left, e.top, e.w, e.h)) continue;
                e.hp -= p.kind === 'blast' ? 99 : 1;
                e.flash = 3;
                this.#landed(world, p);
                if (e.hp <= 0) {
                    world.score.award(200, e.x, e.y - 8, 'SWAT!');
                    world.events.emit(Ev.SWAT, e.x, e.y);
                    world.enemyShots.detonate(e, world);
                    e.active = false;
                }
                if (p.kind !== 'blast') {
                    this.#spend(world, p);
                    if (!p.active) return;
                }
            }
        }

        for (const enemy of world.enemies) {
            if (!enemy.targetable) continue;
            if (!overlaps(pl, pt, p.w, p.h, enemy.left, enemy.top, enemy.w, enemy.h)) continue;
            if (p.hits.includes(enemy)) continue;
            if (p.kind === 'meatball') {
                world.playerShots.detonate(p, world);
                return;
            }
            const hit = this.#hitFrom(p);
            p.hits.push(enemy);
            world.damageEnemy(enemy, p.damage, hit);
            this.#landed(world, p);
            if (p.kind === 'rocket') {
                world.playerShots.detonate(p, world);
                return;
            }
            this.#spend(world, p);
            if (!p.active) return;
        }

        for (const prop of world.props) {
            if (!prop.active || p.kind === 'meatball') continue;
            if (!overlaps(pl, pt, p.w, p.h, prop.left, prop.top, prop.w, prop.h)) continue;
            if (p.hits.includes(prop)) continue;
            p.hits.push(prop);
            prop.damage(world, p.kind === 'flame' ? p.damage * 3 : p.damage, p.kind);
            this.#landed(world, p);
            if (p.kind === 'rocket') {
                world.playerShots.detonate(p, world);
                return;
            }
            this.#spend(world, p);
            if (!p.active) return;
        }

        for (const h of world.hostages) {
            if (!h.tied) continue;
            if (overlaps(pl, pt, p.w, p.h, h.x - h.w / 2, h.y - h.h, h.w, h.h)) h.free(world);
        }
    }

    #hitFrom(p) {
        const hit = this.#hit;
        hit.kind = KIND_OF_SHOT[p.kind] ?? 'bullet';
        hit.x = p.x;
        hit.y = p.y;
        hit.dirX = p.kind === 'blast' ? p.tag : (p.vx > 0.01 ? 1 : p.vx < -0.01 ? -1 : 0);
        hit.byPlayer = true;
        return hit;
    }

    #spend(world, p) {
        p.pierce--;
        if (p.pierce <= 0) {
            p.active = false;
            world.events.emit(Ev.HIT, p.x, p.y, p.vx > 0 ? 1 : -1, 0, 'spark');
        }
    }

    #landed(world, p) {
        if (p.countsAccuracy && !p.landed) {
            p.landed = true;
            world.score.shotLanded();
        }
    }

    #enemyShots(world) {
        const player = world.player;
        if (!player.vulnerable) return;
        const b = player.body;
        // a slightly forgiving hitbox: grazes don't count
        const bl = b.x - b.w / 2 + 2;
        const bt = b.y - b.h + 3;
        const bw = b.w - 4;
        const bh = b.h - 4;
        for (const e of world.enemyShots.items) {
            if (!e.active) continue;
            if (!overlaps(bl, bt, bw, bh, e.left, e.top, e.w, e.h)) continue;
            if (e.def.explode) {
                world.enemyShots.detonate(e, world);
            } else if (e.pierce < 99) {
                e.active = false;
                player.hurt(world, e.kind);
            } else {
                player.hurt(world, e.kind);
            }
            if (!player.vulnerable) return;
        }
    }
}
