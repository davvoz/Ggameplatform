import { SoundEvent } from '../../audio/SoundEvent.js';

/**
 * Strategy: how does a unit deliver damage when target is in range?
 *  - MeleeAttack: instant on tick
 *  - RangedAttack: spawns Projectile via combat system
 */
function effectiveDamage(owner) {
    const buff = owner._buffMult ?? 1;
    let dmg = owner.def.attackDamage * buff;
    if (owner.def.lowHpRageBelow && owner.hp / owner.maxHp <= owner.def.lowHpRageBelow) {
        dmg *= owner.def.lowHpRageMult ?? 1;
    }
    return dmg;
}

export class MeleeAttack {
    get soundKey() { return SoundEvent.UNIT_ATTACK_MELEE; }
    /** @param {object} owner unit/hero/tower @param {object} target @param {object} world */
    perform(owner, target, world) {
        target.takeDamage(effectiveDamage(owner), world, owner);
    }
}

/**
 * CleaveAttack — like MeleeAttack but also damages all enemies within
 * `splashRadius` around the attacker for `splashDamageMult` of full damage.
 * Makes expensive tanks genuinely counter swarms.
 */
export class CleaveAttack {
    get soundKey() { return SoundEvent.UNIT_ATTACK_MELEE; }
    perform(owner, target, world) {
        const primaryDmg = effectiveDamage(owner);
        target.takeDamage(primaryDmg, world, owner);
        if (!world?.spatial) return;
        const splashR = owner.def.splashRadius ?? 40;
        const splashMult = owner.def.splashDamageMult ?? 0.5;
        const splashDmg = primaryDmg * splashMult;
        const nearby = world.spatial.queryByTeam(owner.x, owner.y, splashR, target.team);
        for (const e of nearby) {
            if (e !== target && !e.isDead()) {
                e.takeDamage(splashDmg, world, owner);
            }
        }
    }
}

export class RangedAttack {
    get soundKey() { return SoundEvent.UNIT_ATTACK_RANGED; }
    perform(owner, target, world) {
        world.combat.fireProjectile({
            team: owner.team,
            fromX: owner.x, fromY: owner.y,
            target,
            damage: effectiveDamage(owner),
            speed: owner.def.projectileSpeed ?? 360,
            onHitEffect: owner.def.onHitEffect ?? null,
            color: owner.def.color ?? '#ffe9a3',
            siegeBonus: owner.def.tags?.includes('siege') ? (owner.def.siegeBonus ?? 1) : 1,
            sprite: owner.def.projectileSprite ?? null
        });
    }
}

/** Support/aura units that never attack. */
export class NullAttack {
    get soundKey() { return null; }
    perform() { return false; }
}

/**
 * Wraps an IAttack and enforces attackInterval cooldown + range check.
 */
export class AttackController {
    constructor(strategy) { this._strategy = strategy; this._cooldown = 0; }

    update(owner, dt, world) {
        if (this._cooldown > 0) this._cooldown -= dt;
        const target = owner._currentTarget;
        if (!target || target.isDead()) return;
        const dx = target.x - owner.x, dy = target.y - owner.y;
        const r = owner.def.attackRange + (target.radius ?? 0);
        if (dx * dx + dy * dy > r * r) return;
        if (this._cooldown > 0) return;
        this._strategy.perform(owner, target, world);
        if (this._strategy.soundKey) world?.sound?.play(this._strategy.soundKey);
        owner.playAnim?.('attack');
        this._cooldown = owner.def.attackInterval / (owner.attackSpeedFactor?.() ?? 1);
    }
}

export function buildAttackStrategy(def) {
    if (def.attackKind === 'melee') return new MeleeAttack();
    if (def.attackKind === 'cleave') return new CleaveAttack();
    if (def.attackKind === 'ranged') return new RangedAttack();
    if (def.attackKind === 'support') return new NullAttack();
    throw new Error(`buildAttackStrategy: unknown attackKind "${def.attackKind}"`);
}
