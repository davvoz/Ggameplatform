// ============================================================
//  PartReviveAbility — revives destroyed parts after a timer
//  Used by: quarkConfinement (B19)
// ============================================================
import BossAbility from './BossAbility.js';

class PartReviveAbility extends BossAbility {
    init(boss) {
        this._reviveTimer = 0;
        this._waiting = false;
    }

    update(dt, game, boss) {
        const targetParts = this._getTargetParts(boss);
        const deadPart = targetParts.find(p => !p.active);
        const anyAlive = targetParts.some(p => p.active);

        if (this._waiting) {
            this._reviveTimer -= dt;
            if (this._reviveTimer <= 0) {
                this._waiting = false;
                this._reviveOnePart(targetParts, game);
            }
        } else if (deadPart && anyAlive) {
            this._waiting = true;
            this._reviveTimer = this.config.reviveDelay;
        }
    }

    _getTargetParts(boss) {
        const role = this.config.targetRole || 'core';
        return boss.parts.filter(p => p.role === role);
    }

    _reviveOnePart(parts, game) {
        const dead = parts.find(p => !p.active);
        if (!dead) return;
        dead.active = true;
        dead.health = Math.ceil(dead.maxHealth * (this.config.reviveHpRatio || 0.3));
        game.particles.emit(
            dead.worldX + dead.width / 2,
            dead.worldY + dead.height / 2,
            'hit', 10
        );
    }
}

export default PartReviveAbility;
