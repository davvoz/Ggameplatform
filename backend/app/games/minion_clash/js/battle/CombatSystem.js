import { Projectile } from '../entities/Projectile.js';

/**
 * CombatSystem: projectile factory & helper for direct attacks.
 * Decouples Unit/Tower from Projectile construction.
 */
export class CombatSystem {
    constructor(entityManager, assets) {
        this._em = entityManager;
        this._assets = assets ?? null;
    }

    fireProjectile({ team, fromX, fromY, target, damage, speed, onHitEffect, color, siegeBonus, sprite }) {
        if (!target) return;
        const p = new Projectile({
            team, x: fromX, y: fromY,
            targetEntityId: target.id, targetX: target.x, targetY: target.y,
            speed, damage, onHitEffect, color, siegeBonus
        });
        if (this._assets && sprite) {
            p.setSprite(this._assets.createAnimator(sprite));
        }
        this._em.add(p);
    }
}
