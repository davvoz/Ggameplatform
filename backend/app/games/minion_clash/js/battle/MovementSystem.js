import { GameConfig } from '../config/GameConfig.js';
import { EntityKind } from '../entities/Entity.js';

/**
 * Soft-body separation: pushes overlapping units apart so blobs don't fully
 * stack. Skips towers (immovable) and projectiles. Cheap O(n*k) using spatial
 * index queries with small radius.
 */
export class MovementSystem {
    constructor(spatial) { this._spatial = spatial; }

    update(entityManager, dt) {
        const force = GameConfig.BATTLE.SEPARATION_FORCE;
        for (const e of entityManager.list()) {
            if (e.kind !== EntityKind.UNIT && e.kind !== EntityKind.HERO) continue;
            this._separateOne(e, force, dt);
            this._clampX(e);
        }
    }

    _separateOne(e, force, dt) {
        const queryR = e.radius * 2 + 4;
        const others = this._spatial.queryAll(e.x, e.y, queryR);
        for (const o of others) {
            if (o === e) continue;
            if (o.kind === EntityKind.PROJECTILE || o.kind === EntityKind.TOWER) continue;
            this._pushApart(e, o, force, dt);
        }
    }

    _pushApart(e, o, force, dt) {
        const dx = e.x - o.x, dy = e.y - o.y;
        const distSq = dx * dx + dy * dy;
        const min = e.radius + o.radius;
        if (distSq >= min * min || distSq < 0.0001) return;
        const dist = Math.sqrt(distSq);
        const overlap = (min - dist) / min;
        const push = force * overlap * dt;
        e.x += (dx / dist) * push;
        e.y += (dy / dist) * push;
    }

    _clampX(e) {
        if (e.x < 12) e.x = 12;
        else if (e.x > GameConfig.VIEW_WIDTH - 12) e.x = GameConfig.VIEW_WIDTH - 12;
    }
}
