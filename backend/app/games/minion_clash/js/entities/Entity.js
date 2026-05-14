import { SoundEvent } from '../audio/SoundEvent.js';

/**
 * Base entity. Position, hp, team, radius, kind. All entities live in
 * EntityManager and are scanned by SpatialIndex.
 *
 * Subclasses MUST implement update(dt, world) and may override onDeath(world).
 */
export const EntityKind = Object.freeze({
    UNIT: 'unit',
    HERO: 'hero',
    TOWER: 'tower',
    PROJECTILE: 'projectile'
});

export class Entity {
    constructor({ team, kind, x, y, hp, radius }) {
        this.team = team;
        this.kind = kind;
        this.x = x;
        this.y = y;
        this.hp = hp;
        this.maxHp = hp;
        this.radius = radius;
        this._dead = false;
        this._effects = [];        // active StatusEffect instances
        this.id = Entity._nextId++;
        this.sprite = null;        // optional SpriteAnimator (set via setSprite)
        this.facingX = 1;          // -1 = facing left (used for sprite flipping)
    }

    /** Attach a SpriteAnimator. Pass null to keep primitive rendering. */
    setSprite(animator) { this.sprite = animator; }

    /** Trigger an animation clip if one is attached (no-op otherwise). */
    playAnim(name) { this.sprite?.play(name); }

    isDead() { return this._dead; }
    markDead() { this._dead = true; }

    takeDamage(amount, world, source) {
        if (this._dead || amount <= 0) return;
        this.hp -= amount;
        this.sprite?.flashHurt();
        if (this.kind === EntityKind.TOWER) {
            world?.sound?.play(SoundEvent.TOWER_HIT);
        }
        if (this.hp <= 0) {
            this.hp = 0;
            this._dead = true;
            if (world?.sound) {
                if (this.kind === EntityKind.TOWER)      world.sound.play(SoundEvent.TOWER_DESTROY);
                else if (this.kind === EntityKind.UNIT)  world.sound.play(SoundEvent.UNIT_DEATH);
                else if (this.kind === EntityKind.HERO)  world.sound.play(SoundEvent.HERO_DEATH);
            }
            this.onDeath?.(world, source);
        }
    }

    heal(amount) {
        if (this._dead) return;
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }

    addEffect(effect) {
        this._effects.push(effect);
    }

    updateEffects(dt, world) {
        if (this._effects.length === 0) return;
        for (let i = this._effects.length - 1; i >= 0; i--) {
            const e = this._effects[i];
            e.update(dt, this, world);
            if (e.expired) this._effects.splice(i, 1);
        }
    }

    /** Combined slow factor from all active SlowEffects (min of factors). 1 = no slow. */
    moveSpeedFactor() {
        let factor = 1;
        for (const e of this._effects) {
            if (e.slowFactor !== undefined && e.slowFactor < factor) factor = e.slowFactor;
        }
        return factor;
    }
}

Entity._nextId = 1;
