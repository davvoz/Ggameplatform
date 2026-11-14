import { BOONS, BOON_CHOICES } from '../config/Boons.js';

/**
 * The powers taken this night, by level. Some change the mage or the storm
 * once, when taken (`applyBoon`); the others are read by the simulation
 * where they act (`level`).
 */
export class Boons {
    levels = {};

    level(id) {
        return this.levels[id] ?? 0;
    }

    /** Powers that can still be taken. */
    available() {
        return Object.keys(BOONS).filter((id) => this.level(id) < BOONS[id].max);
    }

    /**
     * Three different powers to choose from (fewer when few are left).
     * @param {import('../core/Rng.js').Rng} rng
     */
    offer(rng) {
        const pool = this.available();
        for (let i = pool.length - 1; i > 0; i--) {
            const j = rng.int(0, i);
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return pool.slice(0, BOON_CHOICES);
    }

    take(id) {
        this.levels[id] = this.level(id) + 1;
    }
}

/** What taking a power changes at once (the others act later, see `Boons.level`). */
const ON_TAKE = {
    hearts({ mage }) {
        mage.maxHp += BOONS.hearts.hearts;
        mage.heal(BOONS.hearts.hearts);
    },
    longShield({ mage }) {
        mage.shieldDuration += BOONS.longShield.seconds;
    },
    quickShield({ mage }) {
        mage.shieldRecharge *= BOONS.quickShield.factor;
        mage.shieldCooldown = Math.min(mage.shieldCooldown, mage.shieldRecharge);
    },
    stormCaller({ storm }) {
        storm.needed = Math.max(1, Math.round(storm.needed * BOONS.stormCaller.factor));
    },
    crystal({ mage }) {
        mage.energyMax += 1;
        mage.refund(1);
    },
    quickCrystals({ mage }) {
        mage.energyRegen *= BOONS.quickCrystals.factor;
    },
};

/** @param {{mage: object, storm: object}} night */
export function applyBoon(id, night) {
    ON_TAKE[id]?.(night);
}
