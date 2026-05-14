import { opposingTeam } from '../../config/GameConfig.js';

/**
 * Static behavior: never moves. Only used by buildings/banners.
 * Optionally targets nearest enemy within attackRange (if attackDamage > 0).
 */
export class StaticBehavior {
    update(unit, dt, world) {
        if (unit.def.attackDamage <= 0) return;
        const r = unit.def.attackRange;
        unit._currentTarget = world.spatial.findNearestEnemy(unit, opposingTeam(unit.team), r);
    }
}
