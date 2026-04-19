// ============================================================
//  DamageBalanceAbility — tracks damage across two halves,
//  heals one if the other takes disproportionate damage
//  Used by: antimatterMirror (B23)
// ============================================================
import BossAbility from './BossAbility.js';

class DamageBalanceAbility extends BossAbility {
    init(boss) {
        this._damageByHalf = {};
        for (const halfId of this.config.halves) {
            this._damageByHalf[halfId] = 0;
        }
    }

    update(dt, game, boss) {
        // Decay damage counters toward zero over time
        const decayRate = this.config.decayRate || 0.2;
        for (const halfId of this.config.halves) {
            this._damageByHalf[halfId] *= (1 - dt * decayRate);
        }

        // Check imbalance and heal
        const threshold = this.config.imbalanceThreshold || 40;
        const healRatio = this.config.healRatio || 0.2;
        const halves = this.config.halves;
        if (halves.length === 2) {
            const diff = this._damageByHalf[halves[0]] - this._damageByHalf[halves[1]];
            if (Math.abs(diff) > threshold) {
                const overHit = diff > 0 ? halves[0] : halves[1];
                this._healHalf(boss, overHit, healRatio);
                this._damageByHalf[halves[0]] = 0;
                this._damageByHalf[halves[1]] = 0;
            }
        }
    }

    onDamage(amount, partIndex, boss) {
        const part = boss.parts[partIndex];
        if (part?.half) {
            this._damageByHalf[part.half] = (this._damageByHalf[part.half] || 0) + amount;
        }
        return amount;
    }

    _healHalf(boss, halfId, ratio) {
        for (const p of boss.parts) {
            if (p.active && p.half === halfId) {
                p.health = Math.min(p.maxHealth, p.health + Math.ceil(p.maxHealth * ratio));
            }
        }
    }
}

export default DamageBalanceAbility;
