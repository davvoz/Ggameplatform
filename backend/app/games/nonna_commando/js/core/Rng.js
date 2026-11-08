/**
 * Seeded pseudo random generator (mulberry32).
 *
 * The simulation never touches Math.random: every random choice comes from an
 * Rng built from the weekly seed, so one seed always gives the same course.
 */

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function hashLabel(label) {
    let hash = FNV_OFFSET;
    for (let i = 0; i < label.length; i++) {
        hash = Math.imul(hash ^ label.charCodeAt(i), FNV_PRIME);
    }
    return hash >>> 0;
}

export class Rng {
    #seed;
    #state;

    /** @param {number} seed any integer */
    constructor(seed) {
        this.#seed = seed >>> 0;
        this.#state = this.#seed;
    }

    /** @returns {number} float in [0, 1) */
    next() {
        this.#state = (this.#state + 0x6d2b79f5) >>> 0;
        let t = this.#state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /** @returns {number} float in [min, max) */
    range(min, max) {
        return min + this.next() * (max - min);
    }

    /** @returns {number} integer in [min, max] */
    int(min, max) {
        return min + Math.floor(this.next() * (max - min + 1));
    }

    /** @returns {boolean} true with probability p */
    chance(p) {
        return this.next() < p;
    }

    /**
     * @template T
     * @param {T[]} items
     * @param {(item: T) => number} weightOf
     * @returns {T}
     */
    pickWeighted(items, weightOf) {
        let total = 0;
        for (const item of items) total += weightOf(item);
        let roll = this.next() * total;
        for (const item of items) {
            roll -= weightOf(item);
            if (roll < 0) return item;
        }
        return items[items.length - 1];
    }

    /**
     * An independent stream. It depends only on the seed and the label, so
     * adding draws to one stream never shifts another one.
     * @param {string} label
     * @returns {Rng}
     */
    fork(label) {
        return new Rng(Math.imul(this.#seed ^ hashLabel(label), FNV_PRIME));
    }
}
