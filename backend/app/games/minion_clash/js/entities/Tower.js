import { Entity, EntityKind } from './Entity.js';
import { opposingTeam } from '../config/GameConfig.js';

/**
 * Static defensive structure. Picks nearest enemy in attackRange, fires
 * ranged projectile via AttackController.
 */
export class Tower extends Entity {
    constructor({ team, x, y, def }) {
        super({ team, kind: EntityKind.TOWER, x, y, hp: def.hp, radius: def.radius });
        this.def = def;
        this._attackTimer = 0;
        this._scanTimer = 0;
        this._target = null;
    }

    update(dt, world) {
        this.sprite?.update(dt);
        this._attackTimer = Math.max(0, this._attackTimer - dt);
        this._scanTimer -= dt;
        if (this._scanTimer <= 0 || !this._target || this._target.isDead()
            || this._distSq(this._target) > this.def.attackRange * this.def.attackRange) {
            this._scanTimer = 0.25;
            this._target = world.spatial.findNearestEnemy(this, opposingTeam(this.team), this.def.attackRange);
        }
        if (this._target && this._attackTimer === 0) {
            world.combat.fireProjectile({
                team: this.team, fromX: this.x, fromY: this.y,
                target: this._target, damage: this.def.attackDamage,
                speed: this.def.projectileSpeed, color: '#ffd166',
                sprite: this.def.projectileSprite ?? null
            });
            this.playAnim('attack');
            this._attackTimer = this.def.attackInterval;
        }
    }

    onDeath(_world) {
        this.deathTimestamp = performance.now();
    }

    _distSq(other) {
        const dx = other.x - this.x, dy = other.y - this.y;
        return dx * dx + dy * dy;
    }
}
