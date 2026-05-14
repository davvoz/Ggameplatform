import { Entity, EntityKind } from './Entity.js';
import { AttackController, buildAttackStrategy } from './attacks/AttackController.js';
import { AdvanceBehavior } from './behaviors/AdvanceBehavior.js';
import { StaticBehavior } from './behaviors/StaticBehavior.js';
import { GameConfig, opposingTeam } from '../config/GameConfig.js';

/**
 * Generic minion — fully data-driven from a unit definition.
 *
 * Composition:
 *  - behavior  (movement / targeting)  : AdvanceBehavior or StaticBehavior
 *  - attack    (damage delivery)       : Melee/Ranged/Null
 *  - aura      (passive area effect)   : optional, applied each frame by EffectSystem
 */
export class Unit extends Entity {
    constructor({ team, x, y, def }) {
        super({ team, kind: EntityKind.UNIT, x, y, hp: def.hp, radius: def.radius });
        this.def = def;
        this.facingX = team === 'player' ? -1 : 1;
        this._currentTarget = null;

        this._buildBehavior(team);
        this._attackController = new AttackController(buildAttackStrategy(def));

        // Per-frame buff state (recomputed by EffectSystem each tick).
        // We snapshot the *base* damage; AttackController reads owner.def.attackDamage,
        // so we wrap the def with a dynamic accessor when buffs are present.
        this._baseAttackDamage = def.attackDamage;
        this._buffMult = 1;
    }

    _buildBehavior(team) {
        if (this.def.tags?.includes('static')) {
            this.behavior = new StaticBehavior();
            return;
        }
        const a = GameConfig.ARENA;
        // Attackers head toward the opposing tower position.
        const goalX = team === 'player' ? a.ENEMY_TOWER_X : a.PLAYER_TOWER_X;
        const goalY = team === 'player' ? a.ENEMY_TOWER_Y : a.PLAYER_TOWER_Y;
        this.behavior = new AdvanceBehavior({
            goalX, goalY, bridgeY: a.BRIDGE_Y_CENTER
        });
    }

    update(dt, world) {
        this.updateEffects(dt, world);
        this.sprite?.update(dt);
        if (this.isDead()) return;
        // self regen
        if (this.def.hpRegen > 0) this.heal(this.def.hpRegen * dt);
        // taunt: shield maiden pulls nearby enemies' targeting (best-effort soft taunt)
        if (this.def.tags?.includes('taunt')) this._broadcastTaunt(world);
        this.behavior.update(this, dt, world);
        this._attackController.update(this, dt, world);
    }

    _broadcastTaunt(world) {
        const r = this.def.tauntRadius ?? 80;
        const enemies = world.spatial.queryByTeam(this.x, this.y, r, opposingTeam(this.team));
        for (const e of enemies) { if (e.kind === EntityKind.UNIT) e._currentTarget = this; }
    }

    onDeath(world) {
        const od = this.def.onDeath;
        if (!od) return;
        if (od.type === 'summon') {
            world.spawn.spawnUnitsAt(this.team, od.unitId, od.count ?? 1, this.x, this.y, 18);
        }
    }
}
