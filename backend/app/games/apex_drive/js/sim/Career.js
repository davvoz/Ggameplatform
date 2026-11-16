import { MODS } from '../config/Mods.js';
import { BASE_STATS, PARTS } from '../config/Parts.js';
import { PODIUM, PRIZES, START_CREDITS } from '../config/Tuning.js';
import { WORLDS } from '../config/Worlds.js';
import { computeStats } from './Build.js';

/**
 * The player's career: credits, the parts installed, the mods owned and
 * fitted, and the best result on every track. It holds the shop's rules
 * (prices, slots, energy) and the unlocking of tracks and worlds. Plain
 * data in and out (toJSON / the constructor, replaceWith).
 *
 * The server (apex_drive_be) keeps every career and applies the same rules
 * (exported by tools/export-economy.js); here they answer at once, and the
 * server's career replaces this one when it answers (app/CareerSync.js).
 */

export const CATALOG = { base: BASE_STATS, parts: PARTS, mods: MODS };

/** @typedef {'ok'|'credits'|'max'|'owned'|'missing'|'slots'|'energy'} ShopAnswer */

export class Career {
    credits;
    /** @type {Record<string, number>} tier installed per part category */
    parts;
    /** @type {Set<string>} */
    owned;
    /** @type {string[]} */
    fitted;
    /** @type {Record<string, {best: number, bestLap: number|null}>} */
    results;
    races;
    #worlds;

    /** @param {object} [data] a saved career @param {{worlds?: object[]}} [options] the worlds raced (tests pass their own) */
    constructor(data = {}, { worlds = WORLDS } = {}) {
        this.#worlds = worlds;
        this.replaceWith(data);
    }

    /** Takes over a saved career (the server's): everything is replaced. @param {object} data */
    replaceWith(data) {
        this.credits = Number.isFinite(data.credits) ? data.credits : START_CREDITS;
        this.parts = Object.fromEntries(Object.keys(PARTS).map((key) => [key, validTier(key, data.parts?.[key])]));
        this.owned = new Set((data.owned ?? []).filter((id) => id in MODS));
        this.fitted = (data.fitted ?? []).filter((id) => this.owned.has(id));
        this.results = { ...data.results };
        this.races = data.races ?? 0;
        // a save from an older version could fit more than the bay holds now
        while (this.fitted.length > this.stats().slots || this.energyUsed() > this.stats().energy) this.fitted.pop();
    }

    toJSON() {
        return {
            credits: this.credits,
            parts: { ...this.parts },
            owned: [...this.owned],
            fitted: [...this.fitted],
            results: { ...this.results },
            races: this.races,
        };
    }

    /** @returns {import('./Build.js').BuildSpec} */
    build(extraMods = []) {
        return { parts: { ...this.parts }, mods: [...this.fitted, ...extraMods] };
    }

    stats() {
        return computeStats(this.build(), CATALOG);
    }

    // ---- parts

    /** The next tier of a category, or null at the top. */
    nextPart(category) {
        const tier = this.parts[category] + 1;
        const spec = PARTS[category].tiers[tier];
        return spec ? { tier, ...spec } : null;
    }

    /** Stats with the next tier of a category installed (the garage's preview). */
    statsWithNext(category) {
        const next = this.nextPart(category);
        if (!next) return this.stats();
        return computeStats({ parts: { ...this.parts, [category]: next.tier }, mods: this.fitted }, CATALOG);
    }

    /** Stats with these mods fitted instead (the garage's preview). */
    statsWithMods(mods) {
        return computeStats({ parts: { ...this.parts }, mods }, CATALOG);
    }

    /** @returns {ShopAnswer} */
    buyPart(category) {
        const next = this.nextPart(category);
        if (!next) return 'max';
        if (next.price > this.credits) return 'credits';
        this.credits -= next.price;
        this.parts[category] = next.tier;
        return 'ok';
    }

    // ---- mods

    energyUsed(fitted = this.fitted) {
        return fitted.reduce((sum, id) => sum + MODS[id].energy, 0);
    }

    /** @returns {ShopAnswer} */
    buyMod(id) {
        if (!(id in MODS)) return 'missing';
        if (this.owned.has(id)) return 'owned';
        if (MODS[id].price > this.credits) return 'credits';
        this.credits -= MODS[id].price;
        this.owned.add(id);
        return 'ok';
    }

    /** Whether a mod could be fitted now. @returns {ShopAnswer} */
    canFit(id) {
        if (!this.owned.has(id)) return 'missing';
        if (this.fitted.includes(id)) return 'owned';
        const stats = this.stats();
        if (this.fitted.length >= stats.slots) return 'slots';
        if (this.energyUsed() + MODS[id].energy > stats.energy) return 'energy';
        return 'ok';
    }

    /** @returns {ShopAnswer} */
    fit(id) {
        const answer = this.canFit(id);
        if (answer === 'ok') this.fitted.push(id);
        return answer;
    }

    unfit(id) {
        this.fitted = this.fitted.filter((fitted) => fitted !== id);
    }

    // ---- tracks and worlds

    /** Tracks of the career in order: [{trackId, world, worldIndex, index}]. */
    tracks() {
        return this.#worlds.flatMap((world, worldIndex) => world.tracks.map((trackId, index) => ({ trackId, world, worldIndex, index })));
    }

    podium(trackId) {
        const result = this.results[trackId];
        return Boolean(result) && result.best <= PODIUM;
    }

    isWorldOpen(worldIndex) {
        return worldIndex === 0 || this.#worlds[worldIndex - 1].tracks.every((id) => this.podium(id));
    }

    isTrackOpen(trackId) {
        const entry = this.tracks().find((t) => t.trackId === trackId);
        if (!entry || !this.isWorldOpen(entry.worldIndex)) return false;
        return entry.index === 0 || this.podium(entry.world.tracks[entry.index - 1]);
    }

    /** The open track after this one, in the career's order, or null. */
    nextTrack(trackId) {
        const list = this.tracks();
        const next = list[list.findIndex((t) => t.trackId === trackId) + 1];
        return next && this.isTrackOpen(next.trackId) ? next.trackId : null;
    }

    /**
     * Pays a race and records it.
     * @param {string} trackId
     * @param {{position: number, bestLap: number|null, cash: number}} result
     * @param {number} prizeScale the world's
     * @returns {{prize: number, cash: number, total: number, newBest: boolean, newLap: boolean, unlocked: string[]}}
     */
    finishRace(trackId, { position, bestLap, cash }, prizeScale = 1) {
        const openBefore = new Set(this.tracks().filter((t) => this.isTrackOpen(t.trackId)).map((t) => t.trackId));
        const prize = Math.round((PRIZES[position - 1] ?? 0) * prizeScale);
        const total = prize + cash;
        this.credits += total;
        this.races++;

        const old = this.results[trackId];
        const newBest = !old || position < old.best;
        const newLap = bestLap !== null && (!old?.bestLap || bestLap < old.bestLap);
        this.results[trackId] = {
            best: Math.min(position, old?.best ?? Infinity),
            bestLap: newLap ? bestLap : old?.bestLap ?? null,
        };
        const unlocked = this.tracks().map((t) => t.trackId).filter((id) => !openBefore.has(id) && this.isTrackOpen(id));
        return { prize, cash, total, newBest, newLap, unlocked };
    }
}

function validTier(category, tier) {
    const max = PARTS[category].tiers.length - 1;
    return Number.isInteger(tier) ? Math.max(0, Math.min(max, tier)) : 0;
}
