/**
 * CardArt — small helper that maps domain entities (cards, heroes) to the
 * sprite sheet id used by AssetManager, plus shared rarity styling.
 *
 * Pure functions / frozen object: zero state, easy to test.
 */
export const CARD_RARITY = Object.freeze({
    common:    { stroke: '#b8c5d6', glow: 'rgba(184,197,214,0.35)' },
    rare:      { stroke: '#5fa8ff', glow: 'rgba(95,168,255,0.45)'  },
    epic:      { stroke: '#c97aff', glow: 'rgba(201,122,255,0.50)' },
    legendary: { stroke: '#ffd166', glow: 'rgba(255,209,102,0.55)' }
});

const _DEFAULT_RARITY = CARD_RARITY.common;

export const CardArt = Object.freeze({
    /** Returns 'unit_<id>' for summons, 'spell_<id>' for spells. */
    cardSheetId(card) {
        if (!card) return null;
        if (card.kind === 'summon' && card.unitId) return `unit_${card.unitId}`;
        if (card.kind === 'spell' && card.id) return `spell_${card.id}`;
        return null;
    },

    heroSheetId(hero) {
        if (!hero?.id) return null;
        return `hero_${hero.id}`;
    },

    rarityStyle(rarity) {
        return CARD_RARITY[rarity] ?? _DEFAULT_RARITY;
    }
});
