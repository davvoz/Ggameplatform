import { GameConfig, opposingTeam } from '../../config/GameConfig.js';

/**
 * Hero behavior: patrols around the home tower. Engages any enemy within
 * detection radius. After kill (or if no targets), returns to patrol.
 */
export class PatrolBehavior {
    constructor({ homeX, homeY, patrolRadius = 90, detectRadius = 220 }) {
        this._homeX = homeX;
        this._homeY = homeY;
        this._patrolRadius = patrolRadius;
        this._detectRadius = detectRadius;
        this._patrolAngle = Math.random() * Math.PI * 2;
        this._patrolPoint = this._nextPatrolPoint();
        this._scanTimer = 0;
    }

    update(unit, dt, world) {
        this._scanTimer -= dt;
        if (this._scanTimer <= 0 || !unit._currentTarget || unit._currentTarget.isDead()) {
            this._scanTimer = GameConfig.BATTLE.TARGET_SCAN_INTERVAL;
            unit._currentTarget = world.spatial.findNearestEnemy(unit, opposingTeam(unit.team), this._detectRadius);
        }
        const target = unit._currentTarget;
        if (target) {
            const dsq = this._distSq(unit, target);
            const inRange = dsq <= unit.def.attackRange * unit.def.attackRange;
            if (inRange) { this._face(unit, target); return; }
            this._moveToward(unit, dt, target);
            return;
        }
        // Patrol
        if (this._distSq(unit, this._patrolPoint) < 6 * 6) {
            this._patrolPoint = this._nextPatrolPoint();
        }
        this._moveToward(unit, dt, this._patrolPoint);
    }

    _nextPatrolPoint() {
        this._patrolAngle += Math.PI * 2 * (0.25 + Math.random() * 0.5);
        return {
            x: this._homeX + Math.cos(this._patrolAngle) * this._patrolRadius,
            y: this._homeY + Math.sin(this._patrolAngle) * this._patrolRadius * 0.6
        };
    }

    _moveToward(unit, dt, target) {
        const dx = target.x - unit.x, dy = target.y - unit.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.5) return;
        const speed = unit.def.moveSpeed * unit.moveSpeedFactor();
        const step = Math.min(dist, speed * dt);
        unit.x += (dx / dist) * step;
        unit.y += (dy / dist) * step;
        this._face(unit, target);
    }

    _distSq(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }
    _face(unit, t) { unit.facingX = Math.sign(t.x - unit.x) || unit.facingX || 1; }
}
