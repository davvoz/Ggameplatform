import { PlayerTuning, ScoreTuning } from '../config/Tuning.js';
import { Pool } from '../core/Pool.js';
import { Ev } from './Events.js';

/**
 * Things to collect. Score items dropped in a fight blink and vanish: greed
 * pulls you into danger. Gold teeth are hidden, three per mission.
 *
 * kind: weapon | bombs | heal | score | tooth | life
 */
export const PickupTypes = Object.freeze({
    heavy: { kind: 'weapon', weapon: 'heavy' },
    shotgun: { kind: 'weapon', weapon: 'shotgun' },
    fireworks: { kind: 'weapon', weapon: 'fireworks' },
    flamer: { kind: 'weapon', weapon: 'flamer' },
    bombs: { kind: 'bombs', amount: 10 },
    espresso: { kind: 'heal', amount: 1, points: 100 },
    lasagna: { kind: 'heal', amount: 3, points: 1000 },
    coin: { kind: 'score', points: 100, life: 420 },
    candy: { kind: 'score', points: 300, life: 420 },
    cannolo: { kind: 'score', points: 500 },
    gift: { kind: 'score', points: 1000 },
    tooth: { kind: 'tooth', points: ScoreTuning.goldTooth },
    life: { kind: 'life' },
});

export class Pickup {
    active = false;
    type = '';
    x = 0;
    y = 0;
    vx = 0;
    vy = 0;
    w = 12;
    h = 12;
    age = 0;
    life = 0;
    onGround = false;
}

export class Pickups {
    pool = new Pool(() => new Pickup(), 64);

    get items() {
        return this.pool.items;
    }

    spawn(type, x, y, pop = true) {
        const p = this.pool.acquire();
        if (!p) return null;
        p.type = type;
        p.x = x;
        p.y = y;
        p.vx = 0;
        p.vy = pop ? -2.6 : 0;
        p.age = 0;
        p.life = PickupTypes[type]?.life ?? 0;
        p.onGround = false;
        return p;
    }

    /** @param {import('./World.js').World} world */
    update(world) {
        const player = world.player;
        const pb = player.body;
        for (const p of this.pool.items) {
            if (!p.active) continue;
            p.age++;
            if (p.life > 0 && p.age > p.life) {
                p.active = false;
                continue;
            }
            if (!p.onGround) {
                p.vy = Math.min(p.vy + 0.18, 4);
                const prev = p.y;
                p.y += p.vy;
                const surface = world.terrain.surfaceBelow(p.x, prev - 0.5);
                if (p.y >= surface && p.vy >= 0) {
                    p.y = surface;
                    p.onGround = true;
                }
            }
            if (p.x < world.camera.x - 40) {
                p.active = false;
                continue;
            }
            if (!player.alive || p.age < 12) continue;
            const reach = (pb.w + p.w) / 2;
            if (Math.abs(pb.x - p.x) < reach && p.y - p.h < pb.y && pb.y - pb.h < p.y) {
                this.#collect(world, p);
            }
        }
    }

    #collect(world, p) {
        const def = PickupTypes[p.type];
        const player = world.player;
        p.active = false;
        let points = 0;
        switch (def.kind) {
            case 'weapon':
                player.arsenal.equip(def.weapon);
                world.events.emit(Ev.WEAPON, p.x, p.y, 0, 0, def.weapon);
                break;
            case 'bombs':
                player.bombs = Math.min(PlayerTuning.maxBombs, player.bombs + def.amount);
                break;
            case 'heal':
                player.heal(def.amount);
                points = world.score.award(def.points, p.x, p.y - 12);
                break;
            case 'score':
                points = world.score.award(def.points, p.x, p.y - 12);
                break;
            case 'tooth':
                world.score.toothFound();
                points = world.score.award(def.points, p.x, p.y - 12, 'GOLD TOOTH!', false);
                break;
            case 'life':
                player.lives++;
                world.events.emit(Ev.EXTRA_LIFE, p.x, p.y);
                break;
            default:
                break;
        }
        world.events.emit(Ev.PICKUP, p.x, p.y - 6, points, 0, p.type);
    }
}
