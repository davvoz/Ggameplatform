import { BONUS_TARGETS } from '../data/labels.js';

/** Forge rules: what blocks a recipe, and which speed-up bonuses work on what. */

/** Why this recipe cannot be forged right now, or null. */
export function forgeBlocker(recipe, materials, freeSlots) {
    if (freeSlots <= 0) return 'All forge slots are busy';
    if (recipe.owned + recipe.yields > recipe.limit) return 'Limit reached';
    const short = Object.entries(recipe.cost).some(([m, amount]) => (materials[m] ?? 0) < amount);
    return short ? 'Not enough materials' : null;
}

/** The bonuses the player owns that work on `target` ('job' | 'hero' | 'energy'), best fit first. */
export function usableBonuses(target, owned) {
    return BONUS_TARGETS[target].filter((b) => (owned?.[b] ?? 0) > 0);
}
