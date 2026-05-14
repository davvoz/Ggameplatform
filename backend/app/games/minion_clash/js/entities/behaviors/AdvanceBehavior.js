/**
 * Strategy interface for unit AI. Each behavior implementation defines how a
 * unit moves and selects targets.
 *
 * Contract: behavior.update(unit, dt, world) — returns nothing. Mutates unit.x/y
 * and optionally sets unit._currentTarget.
 */

import { GameConfig, opposingTeam } from '../../config/GameConfig.js';

/**
 * Default minion behavior: advance toward the enemy tower along the bridge,
 * but engage any enemy within attackRange.
 */
export class AdvanceBehavior {
    constructor({ goalX, goalY, bridgeY }) {
        this._goalX = goalX;
        this._goalY = goalY;
        this._bridgeY = bridgeY;
        this._scanTimer = 0;
    }

    update(unit, dt, world) {
        this._scanTimer -= dt;
        if (this._scanTimer <= 0 || !unit._currentTarget || unit._currentTarget.isDead()) {
            this._scanTimer = GameConfig.BATTLE.TARGET_SCAN_INTERVAL;
            unit._currentTarget = this._pickTarget(unit, world);
        }
        const target = unit._currentTarget;
        const distSq = target ? this._distSq(unit, target) : Infinity;
        const inRange = target && distSq <= unit.def.attackRange * unit.def.attackRange;

        if (inRange) {
            this._faceTarget(unit, target);
            return; // attack handled by AttackController
        }
        // movement target: nearest threat else the goal (waypoint via bridge)
        const moveTo = target ?? { x: this._goalX, y: this._goalY };
        this._moveToward(unit, dt, moveTo, world);
    }

    _pickTarget(unit, world) {
        return world.spatial.findNearestEnemy(unit, opposingTeam(unit.team), unit.def.attackRange + 60);
    }

    _moveToward(unit, dt, target, world) {
        const wp = this._waypoint(unit, target);
        const dx = wp.x - unit.x, dy = wp.y - unit.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.5) return;
        const speed = unit.def.moveSpeed * unit.moveSpeedFactor();
        const step = Math.min(dist, speed * dt);
        const nx = (dx / dist), ny = (dy / dist);
        // separation push from world (small, applied externally too)
        unit.x += nx * step;
        unit.y += ny * step;
        this._faceTarget(unit, { x: unit.x + nx, y: unit.y + ny });
    }

    /**
     * Route ground units through the bridge gap. Flying units skip this.
     */
    _waypoint(unit, target) {
        if (unit.def.tags?.includes('flying')) return target;
        const a = GameConfig.ARENA;
        const onPlayerSide = unit.y > this._bridgeY;
        const targetOnSameSide = (target.y > this._bridgeY) === onPlayerSide;
        if (targetOnSameSide) return target;
        // Pick nearest bridge entry x
        const bridgeCx = (a.BRIDGE_LEFT_X + a.BRIDGE_RIGHT_X) / 2;
        const desiredX = Math.max(a.BRIDGE_LEFT_X + 12, Math.min(a.BRIDGE_RIGHT_X - 12, bridgeCx));
        return { x: desiredX, y: this._bridgeY };
    }

    _distSq(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }
    _faceTarget(unit, t) {
        unit.facingX = Math.sign(t.x - unit.x) || unit.facingX || 1;
    }
}
