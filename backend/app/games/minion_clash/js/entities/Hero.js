import { Entity, EntityKind } from './Entity.js';
import { AttackController, buildAttackStrategy } from './attacks/AttackController.js';
import { PatrolBehavior } from './behaviors/PatrolBehavior.js';

/**
 * Hero — like a Unit but uses PatrolBehavior anchored at the home tower
 * and respawns after death (handled by TeamController).
 */
export class Hero extends Entity {
    constructor({ team, x, y, def, homeX, homeY }) {
        super({ team, kind: EntityKind.HERO, x, y, hp: def.hp, radius: def.radius });
        this.def = def;
        this.facingX = team === 'player' ? -1 : 1;
        this._currentTarget = null;
        this.behavior = new PatrolBehavior({ homeX, homeY });
        this._attackController = new AttackController(buildAttackStrategy(def));
    }

    update(dt, world) {
        this.updateEffects(dt, world);
        this.sprite?.update(dt);
        if (this.isDead()) return;
        if (this.def.hpRegen > 0) this.heal(this.def.hpRegen * dt);
        this.behavior.update(this, dt, world);
        this._attackController.update(this, dt, world);
    }
}
