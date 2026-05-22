import { EntityKind } from '../entities/Entity.js';
import { opposingTeam } from '../config/GameConfig.js';
import { SoundEvent } from '../audio/SoundEvent.js';

/**
 * Resolves spell-card effects at a given board point. Pure dispatch by type.
 */
export class SpellResolver {
    constructor(spatial, effectSystem, vfx, sound = null) {
        this._spatial = spatial;
        this._effects = effectSystem;
        this._vfx = vfx;
        this._sound = sound;
    }

    cast(card, x, y, team, world) {
        const sp = card.spell;
        if (!sp) throw new Error(`SpellResolver: card "${card.id}" has no spell payload`);
        if (this._vfx) this._vfx.add({ type: 'spell', x, y, radius: sp.radius ?? 30, color: sp.fxColor ?? '#fff', cardId: card.id });
        this._sound?.play(SoundEvent.SPELL_AOE);
        switch (sp.type) {
            case 'aoe_damage':       return this._aoeDamage(sp, x, y, team, world);
            case 'aoe_damage_slow':  return this._aoeDamageSlow(sp, x, y, team, world);
            case 'single_damage':    return this._singleDamage(sp, x, y, team, world);
            case 'aoe_heal':         return this._aoeHeal(sp, x, y, team);
            default:
                throw new Error(`SpellResolver: unknown spell type "${sp.type}"`);
        }
    }

    _filterTargets(targets, sp) {
        if (!sp.groundOnly) return targets;
        return targets.filter((t) => !t.def?.tags?.includes('flying'));
    }

    _aoeDamage(sp, x, y, team, world) {
        const enemies = this._filterTargets(
            this._spatial.queryByTeam(x, y, sp.radius, opposingTeam(team)), sp);
        for (const t of enemies) t.takeDamage(sp.damage, world, null);
    }

    _aoeDamageSlow(sp, x, y, team, world) {
        const enemies = this._filterTargets(
            this._spatial.queryByTeam(x, y, sp.radius, opposingTeam(team)), sp);
        for (const t of enemies) {
            t.takeDamage(sp.damage, world, null);
            if (!t.isDead()) {
                this._effects.applyOnHit(t, { type: 'slow', factor: sp.slowFactor, duration: sp.slowDuration });
            }
        }
    }

    _singleDamage(sp, x, y, team, world) {
        const candidates = this._spatial.queryByTeam(x, y, sp.radius ?? 30, opposingTeam(team));
        if (candidates.length === 0) return;
        let best = null, bestSq = Infinity;
        for (const c of candidates) {
            const dx = c.x - x, dy = c.y - y; const d = dx * dx + dy * dy;
            if (d < bestSq) { bestSq = d; best = c; }
        }
        best?.takeDamage(sp.damage, world, null);
    }

    _aoeHeal(sp, x, y, team) {
        const allies = this._spatial.queryByTeam(x, y, sp.radius, team);
        for (const t of allies) {
            if (t.kind === EntityKind.UNIT || t.kind === EntityKind.HERO || t.kind === EntityKind.TOWER) {
                t.heal(sp.amount);
            }
        }
    }
}
