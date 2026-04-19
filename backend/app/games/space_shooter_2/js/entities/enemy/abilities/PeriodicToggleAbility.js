// ============================================================
//  PeriodicToggleAbility — cooldown → active for duration → cooldown
//  Used by: shieldCore (B13), reflectBullets (B15),
//           absorbDamage (B17), pullPlayer (B22)
// ============================================================
import BossAbility from './BossAbility.js';
import { mono } from '../../../FontConfig.js';

class PeriodicToggleAbility extends BossAbility {
    init(boss) {
        this._cooldownTimer = this.config.initialCooldown ?? this.config.cooldown * 0.6;
        this._activeTimer = 0;
        this._isActive = false;
    }

    update(dt, game, boss) {
        if (this._isActive) {
            this._updateActivePhase(dt, game, boss);
        } else {
            this._updateCooldownPhase(dt, game, boss);
        }
    }

    render(ctx, boss, barY) {
        if (!this._isActive) return;
        const ind = this.config.indicator;
        if (!ind) return;

        ctx.save();
        ctx.globalAlpha = 0.25 + 0.15 * Math.sin(Date.now() * 0.01);

        if (ind.filled) {
            ctx.fillStyle = ind.color;
            ctx.beginPath();
            ctx.arc(boss.centerX, boss.centerY, boss.width * 0.4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.strokeStyle = ind.color;
            ctx.lineWidth = ind.lineWidth || 3;
            ctx.setLineDash(ind.dashed ? [8, 4] : []);
            ctx.beginPath();
            ctx.arc(boss.centerX, boss.centerY, ind.radius || boss.width * 0.45, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.globalAlpha = 0.8;
        ctx.font = mono(8);
        ctx.fillStyle = ind.color;
        ctx.textAlign = 'center';
        ctx.fillText(ind.text, boss.centerX, barY - (boss.enraged ? 24 : 14));
        ctx.restore();
    }

    _updateCooldownPhase(dt, game, boss) {
        this._cooldownTimer -= dt;
        if (this._cooldownTimer <= 0) {
            this._isActive = true;
            this._activeTimer = this.config.duration;
            this._onActivate(boss, game);
        }
    }

    _updateActivePhase(dt, game, boss) {
        this._activeTimer -= dt;
        this._onTick(dt, boss, game);
        if (this._activeTimer <= 0) {
            this._isActive = false;
            this._cooldownTimer = this.config.cooldown;
            this._onDeactivate(boss, game);
        }
    }

    _onActivate(boss, game) {
        const fn = ACTIVATE_FNS[this.config.effect];
        if (fn) fn(boss, game);
    }

    _onTick(dt, boss, game) {
        const fn = TICK_FNS[this.config.effect];
        if (fn) fn(dt, boss, game);
    }

    _onDeactivate(boss, game) {
        const fn = DEACTIVATE_FNS[this.config.effect];
        if (fn) fn(boss, game);
    }

    onDamage(amount, partIndex, boss, game) {
        if (!this._isActive) return amount;
        const fn = DAMAGE_FNS[this.config.effect];
        return fn ? fn(amount, partIndex, boss, game) : amount;
    }
}

// ── Effect implementations ──

const ACTIVATE_FNS = {
    shieldCore(boss) {
        const core = boss.parts.find(p => p.role === 'core' && p.active);
        if (core) core._shielded = true;
    },
    absorbDamage(boss) {
        const core = boss.parts.find(p => p.role === 'core' && p.active);
        if (core) core._absorbing = true;
    },
    pullPlayer() { /* tick-based */ },
    reflectBullets() { /* tick-based */ }
};

const DEACTIVATE_FNS = {
    shieldCore(boss) {
        const core = boss.parts.find(p => p.role === 'core' && p.active);
        if (core) core._shielded = false;
    },
    absorbDamage(boss) {
        const core = boss.parts.find(p => p.role === 'core' && p.active);
        if (core) core._absorbing = false;
    },
    pullPlayer() {},
    reflectBullets() {}
};

const TICK_FNS = {
    shieldCore() {},
    absorbDamage() {},
    pullPlayer(dt, boss, game) {
        if (!game.player?.active) return;
        const px = game.player.position.x + game.player.width / 2;
        const py = game.player.position.y + game.player.height / 2;
        const dx = boss.centerX - px;
        const dy = boss.centerY - py;
        const dist = Math.hypot(dx, dy) || 1;
        const pullForce = 60;
        game.player.position.x += (dx / dist) * pullForce * dt;
        game.player.position.y += (dy / dist) * pullForce * dt;
    },
    reflectBullets(dt, boss, game) {
        if (!game.entityManager) return;
        for (const b of game.entityManager.bullets) {
            if (!b.active || b.tag !== 'player') continue;
            const dx = (b.position.x + b.width / 2) - boss.centerX;
            const dy = (b.position.y + b.height / 2) - boss.centerY;
            if (dx * dx + dy * dy < 8100) {
                b.velocity.y = Math.abs(b.velocity.y);
                b.tag = 'enemy';
            }
        }
    }
};

const DAMAGE_FNS = {
    shieldCore(amount, partIndex, boss) {
        const part = boss.parts[partIndex];
        return (part?.isCore && part._shielded) ? 0 : amount;
    },
    absorbDamage(amount, partIndex, boss) {
        const part = boss.parts[partIndex];
        if (part?.isCore && part._absorbing) {
            part.health = Math.min(part.maxHealth, part.health + amount);
            return 0;
        }
        return amount;
    }
};

export default PeriodicToggleAbility;
