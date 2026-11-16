/**
 * Seeded pseudo random numbers (mulberry32). The simulation takes every
 * random choice from here, so the same seed always plays the same night.
 */
export class Rng {
    #state;

    constructor(seed) {
        this.#state = (seed >>> 0) || 1;
    }

    /** A float in [0, 1). */
    next() {
        this.#state = (this.#state + 0x6d2b79f5) >>> 0;
        let t = this.#state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /** A float in [min, max). */
    range(min, max) {
        return min + (max - min) * this.next();
    }

    /** An integer in [min, max]. */
    int(min, max) {
        return min + Math.floor(this.next() * (max - min + 1));
    }

    chance(probability) {
        return this.next() < probability;
    }

    pick(list) {
        return list[Math.floor(this.next() * list.length)];
    }

    /** Picks a key of `weights` ({key: weight}) in proportion to its weight. */
    weighted(weights) {
        const entries = Object.entries(weights).filter(([, w]) => w > 0);
        const total = entries.reduce((sum, [, w]) => sum + w, 0);
        let roll = this.next() * total;
        for (const [key, weight] of entries) {
            roll -= weight;
            if (roll < 0) return key;
        }
        return entries.at(-1)[0];
    }

    /** A new generator for one purpose, independent from this one's future draws. */
    static fork(seed, salt) {
        return new Rng(hashSeed(seed, salt));
    }
}

/** Mixes a seed with a label or a number into a new 32-bit seed (FNV-1a). */
export function hashSeed(seed, salt) {
    let hash = 0x811c9dc5 ^ (seed >>> 0);
    const text = String(salt);
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
    return ((hash ^ (hash >>> 13)) >>> 0) || 1;
}
