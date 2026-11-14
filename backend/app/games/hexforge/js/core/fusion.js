/** Fusion rules: what may be the base of a fusion, what may join it, and picking the two donors. */

const FIGHTERS = ['guardian', 'neon_blade', 'technomancer'];

export function gradeOf(element) {
    return element?.fusion?.grade ?? 0;
}

function buildingMaxed(b, state) {
    return Boolean(b.fusion) || (state.upgrades?.levels[b.type]?.level ?? 1) >= (state.upgrades?.max_level ?? 5);
}

function heroMaxed(h) {
    return Boolean(h.fusion) || (h.tier ?? 1) >= 3;
}

/** Can this building (or hero) be the base of a fusion now? */
export function canFuse(kind, element, state) {
    if (!state.fusion || !element) return false;
    if (kind === 'building') {
        return state.fusion.base_types.includes(element.type) && buildingMaxed(element, state) && !element.fusing;
    }
    return FIGHTERS.includes(element.cls) && heroMaxed(element) && !element.evolving && !element.mission;
}

/** Everything that may join `base` in a fusion: maxed, same grade, free. */
export function fusionCandidates(kind, base, state) {
    const grade = gradeOf(base);
    if (kind === 'building') {
        return state.city.buildings.filter((b) => b.id !== base.id && state.fusion.donor_types.includes(b.type)
            && buildingMaxed(b, state) && !b.fusing && gradeOf(b) === grade);
    }
    return state.heroes.filter((h) => h.id !== base.id && FIGHTERS.includes(h.cls) && heroMaxed(h)
        && !h.evolving && !h.mission && gradeOf(h) === grade);
}

/** A tap on a tile: add one more of it while there is room, else put one of it back. */
export function togglePick(picked, ids) {
    const free = ids.find((id) => !picked.includes(id));
    if (picked.length < 2 && free !== undefined) return [...picked, free];
    const mine = [...picked].reverse().find((id) => ids.includes(id));
    return mine === undefined ? picked : picked.filter((id) => id !== mine);
}
