import { Entity, EntityKind } from './Entity.js';
import { GameConfig } from '../config/GameConfig.js';
import { SoundEvent } from '../audio/SoundEvent.js';

/**
 * Projectile: travels in a straight line toward a target point. On reaching it,
 * applies its payload (damage + optional onHit effect) to the target if alive,
 * else fizzles.
 */
export class Projectile extends Entity {
    constructor({ team, x, y, targetEntityId, targetX, targetY, speed, damage, onHitEffect, color, siegeBonus }) {
        super({ team, kind: EntityKind.PROJECTILE, x, y, hp: 1, radius: GameConfig.PROJECTILE.RADIUS });
        this._targetId = targetEntityId;
        this._targetX = targetX;
        this._targetY = targetY;
        this._speed = speed;
        this._damage = damage;
        this._onHitEffect = onHitEffect ?? null;
        this._color = color ?? '#fff';
        this._lifetime = 0;
        this._siegeBonus = siegeBonus ?? 1;
        this._angle = 0;
    }

    update(dt, world) {
        this.sprite?.update(dt);
        this._lifetime += dt;
        if (this._lifetime > GameConfig.PROJECTILE.MAX_LIFETIME) { this.markDead(); return; }
        const target = world.entityManager.getById(this._targetId);
        if (target && !target.isDead()) {
            this._targetX = target.x;
            this._targetY = target.y;
        }
        const dx = this._targetX - this.x;
        const dy = this._targetY - this.y;
        const dist = Math.hypot(dx, dy);
        const step = this._speed * dt;
        if (dist > 0) this._angle = Math.atan2(dy, dx);
        if (dist <= step + this.radius) {
            this._impact(target, world);
            this.markDead();
            return;
        }
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
    }

    _impact(target, world) {
        if (!target || target.isDead()) return;
        let dmg = this._damage;
        if (target.kind === EntityKind.TOWER) dmg *= this._siegeBonus;
        target.takeDamage(dmg, world, null);
        world?.sound?.play(SoundEvent.PROJECTILE_IMPACT);
        if (this._onHitEffect && !target.isDead()) {
            world.effects.applyOnHit(target, this._onHitEffect);
        }
    }

    get color() { return this._color; }
    get angle() { return this._angle; }
}
