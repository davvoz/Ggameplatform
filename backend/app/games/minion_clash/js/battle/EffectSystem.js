import { EntityKind } from '../entities/Entity.js';
import { SlowEffect, DotEffect, AttackSlowEffect } from '../entities/effects/StatusEffects.js';
import { opposingTeam } from '../config/GameConfig.js';

/** Hearts emitted per second on each charmed victim (dt-based, framerate-independent). */
const CHARM_HEARTS_PER_SEC = 1.5;

/**
 * EffectSystem: each frame, applies passive auras emitted by units that have
 * an `auraEffect` definition. Examples: Healer (heal allies), Time Witch
 * (slow enemies), War Banner (damage buff), Plague Doctor (poison enemies).
 *
 * Damage buffs are applied by mutating a per-frame multiplier on the target,
 * which AttackController reads via owner.def.attackDamage. We apply by
 * temporarily swapping unit.def for a per-frame snapshot — too invasive.
 * Instead we mutate `target._buffMult` and the Unit itself reads that into a
 * dynamic damage when attacking.
 *
 * For simplicity here we apply BUFF as a transient SlowEffect-like flag stored
 * on the target (`target._damageMult`) reset every frame.
 */
export class EffectSystem {
    constructor(spatial) { this._spatial = spatial; }

    /**
     * @param {object}      entityManager
     * @param {number}      dt
     * @param {object|null} vfxManager - Optional VFXManager for charm-victim hearts.
     */
    update(entityManager, dt, vfxManager = null) {
        const list = entityManager.list();
        // Reset per-frame damage multipliers
        for (const e of list) {
            if (e.kind === EntityKind.UNIT || e.kind === EntityKind.HERO || e.kind === EntityKind.TOWER) {
                e._buffMult = 1;
            }
        }
        // Apply auras
        for (const src of list) {
            const aura = src.def?.auraEffect;
            if (!aura || src.isDead()) continue;
            const r = aura.radius;
            const targets = aura.team === 'ally'
                ? this._spatial.queryByTeam(src.x, src.y, r, src.team)
                : this._spatial.queryByTeam(src.x, src.y, r, opposingTeam(src.team));
            const isCharmSource = !!src.def?.charmAura;
            for (const t of targets) {
                this._applyAura(aura, t, dt);
                if (vfxManager && isCharmSource && Math.random() < CHARM_HEARTS_PER_SEC * dt) {
                    this._emitCharmHeart(vfxManager, t);
                }
            }
        }
    }

    /**
     * Emits a single floating heart above a charmed victim.
     * @private
     */
    _emitCharmHeart(vfxManager, target) {
        const r = target.radius ?? 8;
        vfxManager.add({
            type:    'heart_particle',
            x:       target.x + (Math.random() - 0.5) * r * 1.8,
            y:       target.y - r,
            vy:      -(46 + Math.random() * 30),
            vx:      (Math.random() - 0.5) * 24,
            maxLife: 0.62 + Math.random() * 0.38,
        });
    }

    _applyAura(aura, target, dt) {
        if (target.kind === EntityKind.PROJECTILE) return;
        switch (aura.type) {
            case 'heal':
                target.heal((aura.amountPerSecond ?? 0) * dt);
                break;
            case 'dot':
                target.takeDamage((aura.damagePerSecond ?? 0) * dt, null, null, true);
                break;
            case 'buff':
                target._buffMult = Math.max(target._buffMult ?? 1, aura.damageMult ?? 1);
                break;
            case 'slow':
                // Re-apply a short slow each frame so leaving the aura reverts after ~0.4s.
                target.addEffect(new SlowEffect({ factor: aura.factor, duration: 0.4 }));
                break;
            case 'attackSlow':
                // Re-apply a short attack-speed slow each frame; reverts ~0.4s after leaving aura.
                target.addEffect(new AttackSlowEffect({ factor: aura.factor, duration: 0.4 }));
                break;
            default:
                throw new Error(`EffectSystem: unknown aura type "${aura.type}"`);
        }
    }

    /** Called by Projectile on impact for onHitEffect. */
    applyOnHit(target, effect) {
        switch (effect.type) {
            case 'slow':
                target.addEffect(new SlowEffect({ factor: effect.factor, duration: effect.duration }));
                break;
            case 'dot':
                target.addEffect(new DotEffect({ damagePerSecond: effect.damagePerSecond, duration: effect.duration }));
                break;
            default:
                throw new Error(`EffectSystem.applyOnHit: unknown effect type "${effect.type}"`);
        }
    }
}
