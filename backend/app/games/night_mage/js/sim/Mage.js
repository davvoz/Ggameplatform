import { ENERGY, MAGE } from '../config/Tuning.js';

const CAST_POSE = 0.34;
const HURT_POSE = 0.4;

/** The hero: stands in the middle of the clearing, casts, shields, gets hurt. */
export class Mage {
    x = MAGE.x;
    feetY = 0;
    hp = MAGE.hp;
    maxHp = MAGE.hp;
    facing = 1;
    shieldTime = 0;
    shieldCooldown = 0;
    grace = 0;
    pose = 'idle';
    poseTime = 0;
    /** This night's numbers: they start from the tuning and the boons raise them. */
    shieldDuration = MAGE.shieldTime;
    shieldRecharge = MAGE.shieldCooldown;
    energyMax = ENERGY.max;
    energyRegen = ENERGY.regen;
    energy = ENERGY.max;
    /** Seconds left of the red blink after a tap with no energy. */
    denied = 0;
    /** Seconds left on each spell found in the night. */
    buffs = { chain: 0, frost: 0, power: 0 };

    get alive() {
        return this.hp > 0;
    }

    get shielded() {
        return this.shieldTime > 0;
    }

    get shieldReady() {
        return this.alive && this.shieldCooldown <= 0 && !this.shielded;
    }

    /** Where hits land: the middle of the body. */
    get chest() {
        return { x: this.x, y: this.feetY - MAGE.bodyHeight * 0.55 };
    }

    get staff() {
        return { x: this.x + this.facing * MAGE.staffForward, y: this.feetY - MAGE.staffHeight };
    }

    placeOn(feetY) {
        this.feetY = feetY;
    }

    /** Is a world point on the body (with `halfWidth` / `height` around the feet)? */
    covers(x, y, halfWidth = MAGE.bodyHalfWidth, height = MAGE.bodyHeight) {
        return Math.abs(x - this.x) <= halfWidth && y <= this.feetY && y >= this.feetY - height;
    }

    /** Is a tap on the mage (a bigger box than the body, for fingers)? */
    tapped(x, y) {
        return this.covers(x, y, MAGE.tapHalfWidth, MAGE.tapHeight);
    }

    faceTowards(x) {
        if (x !== this.x) this.facing = x < this.x ? -1 : 1;
    }

    cast(towardsX) {
        this.faceTowards(towardsX);
        if (this.pose !== 'hurt') this.#setPose('cast');
    }

    raiseShield() {
        if (!this.shieldReady) return false;
        this.shieldTime = this.shieldDuration;
        this.shieldCooldown = this.shieldRecharge + this.shieldDuration;
        this.#setPose('shield');
        return true;
    }

    /**
     * A blow or a shot reaches the mage.
     * @returns {'blocked'|'ignored'|'hurt'|'dead'}
     */
    takeHit(damage) {
        if (!this.alive) return 'ignored';
        if (this.shielded) return 'blocked';
        if (this.grace > 0) return 'ignored';
        this.hp = Math.max(0, this.hp - damage);
        this.grace = MAGE.hurtGrace;
        this.#setPose(this.hp > 0 ? 'hurt' : 'dead');
        return this.hp > 0 ? 'hurt' : 'dead';
    }

    /** Takes a charge for a bolt. @returns {boolean} false when there is none (the charges blink) */
    spend() {
        if (this.energy < 1) {
            this.denied = ENERGY.deniedTime;
            return false;
        }
        this.energy -= 1;
        return true;
    }

    refund(charges) {
        this.energy = Math.min(this.energyMax, this.energy + charges);
    }

    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }

    hasBuff(name) {
        return this.buffs[name] > 0;
    }

    addBuff(name, seconds) {
        this.buffs[name] = Math.max(this.buffs[name], seconds);
    }

    update(dt) {
        this.poseTime += dt;
        this.shieldTime = Math.max(0, this.shieldTime - dt);
        this.shieldCooldown = Math.max(0, this.shieldCooldown - dt);
        this.grace = Math.max(0, this.grace - dt);
        this.denied = Math.max(0, this.denied - dt);
        if (this.alive) this.energy = Math.min(this.energyMax, this.energy + this.energyRegen * dt);
        for (const name of Object.keys(this.buffs)) this.buffs[name] = Math.max(0, this.buffs[name] - dt);
        this.#settlePose();
    }

    #settlePose() {
        const limits = { cast: CAST_POSE, hurt: HURT_POSE };
        const over = (this.pose in limits && this.poseTime >= limits[this.pose])
            || (this.pose === 'shield' && !this.shielded);
        if (over) this.#setPose('idle');
    }

    #setPose(pose) {
        if (this.pose === 'dead') return;
        this.pose = pose;
        this.poseTime = 0;
    }
}
