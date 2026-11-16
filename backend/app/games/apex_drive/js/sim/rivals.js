/**
 * The rivals upgrade their cars along the career, as the player does: before
 * a track each one has spent a budget on parts, at the garage's prices, in
 * the order its taste says (`buys` in config/Drivers.js). The budget is a
 * share of the prizes a driver finishing in a given place would have won on
 * every track before this one (config/Tuning.js RIVAL_UPGRADES), so it grows
 * with the career and follows the economy when prizes change.
 *
 * Pure: the same track always meets the same rivals' cars.
 */

/**
 * Credits the rivals have spent by the time they race a track.
 * @param {string} trackId
 * @param {{id: string, tracks: string[], prizeScale: number}[]} worlds in career order
 * @param {number[]} prizes by finishing place
 * @param {{place: number, share: number}} rule
 */
export function rivalBudget(trackId, worlds, prizes, { place, share }) {
    let won = 0;
    for (const world of worlds) {
        for (const id of world.tracks) {
            if (id === trackId) return Math.round(won * share);
            won += prizes[place - 1] * world.prizeScale;
        }
    }
    throw new Error(`Track ${trackId} is in no world`);
}

/**
 * The parts a rival buys with a budget: one tier of each category of its
 * list in turn, round and round, skipping what it cannot afford, until
 * nothing more fits.
 * @param {string[]} buys part categories, in the rival's order of taste
 * @param {number} budget credits
 * @param {Record<string, {tiers: {price: number}[]}>} parts config/Parts.js
 * @returns {Record<string, number>} tier by category
 */
export function rivalParts(buys, budget, parts) {
    const owned = {};
    let left = budget;
    let bought = true;
    while (bought) {
        bought = false;
        for (const category of buys) {
            const next = parts[category].tiers[(owned[category] ?? 0) + 1];
            if (!next || next.price > left) continue;
            left -= next.price;
            owned[category] = (owned[category] ?? 0) + 1;
            bought = true;
        }
    }
    return owned;
}
