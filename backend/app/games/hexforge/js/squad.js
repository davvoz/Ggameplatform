/** Squad picking rules for the attack screen (pure, tested). */

export const SQUAD_SIZE = 4;

export function isAvailable(hero, serverNow) {
    if (hero.evolving) return false;             // at the forge
    return !hero.injured_until || hero.injured_until <= serverNow;
}

/** Toggle a hero in the picked list; a full squad ignores new picks. */
export function toggleHero(picked, heroId) {
    if (picked.includes(heroId)) return picked.filter((id) => id !== heroId);
    if (picked.length >= SQUAD_SIZE) return picked;
    return [...picked, heroId];
}

/** Keep only picks that still exist and are fit; fill up with the first fit heroes. */
export function settleSquad(picked, heroes, serverNow) {
    const fit = heroes.filter((h) => isAvailable(h, serverNow)).map((h) => h.id);
    const kept = picked.filter((id) => fit.includes(id));
    for (const id of fit) {
        if (kept.length >= SQUAD_SIZE) break;
        if (!kept.includes(id)) kept.push(id);
    }
    return kept;
}

/** Why the attack cannot start, or null. `blocked` is what the target itself says (locked, shielded…). */
export function launchBlocker({ blocked, picked, energy }) {
    if (blocked) return blocked;
    if (picked.length < SQUAD_SIZE) return `Pick ${SQUAD_SIZE - picked.length} more hero${SQUAD_SIZE - picked.length > 1 ? 'es' : ''}`;
    if (energy.charges < 1) return 'No energy left';
    return null;
}
