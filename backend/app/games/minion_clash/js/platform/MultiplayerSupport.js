/**
 * Whitelist of cards supported by the server-authoritative MP simulation.
 *
 * Must stay in sync with `simulation/mp_constants.py` on the backend.
 * Single source of truth lives on the server; this is a UX hint so the
 * deck builder doesn't show cards the server would reject.
 */
export const MP_SUPPORTED_CARD_IDS = new Set([
    // Summons (25)
    'skeleton_squad', 'goblin_pack', 'imp_trio', 'wolf_pair',
    'knight', 'stone_golem', 'troll_brute', 'iron_sentinel',
    'crossbowman', 'archer_trio', 'mage_apprentice', 'frost_sniper',
    'bat_swarm', 'wyvern', 'phoenix', 'drake',
    'healer', 'war_banner', 'time_witch', 'necromancer',
    'plague_doctor', 'shield_maiden', 'berserker', 'assassin', 'cannon',
    // Spells (5)
    'fireball', 'frost_nova', 'lightning_bolt', 'heal_wave', 'earthquake',
]);

export function isMpSupportedCard(cardId) {
    return MP_SUPPORTED_CARD_IDS.has(cardId);
}
