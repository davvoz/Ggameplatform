/**
 * All in-game sound event keys.
 * Values are stable strings — used as keys in sounds.json and SoundManager.
 * Entities and systems depend only on this module, never on SoundManager directly.
 */
export const SoundEvent = Object.freeze({
    UI_CLICK:             'ui_click',
    CARD_PLAY_SUMMON:     'card_play_summon',
    CARD_PLAY_SPELL:      'card_play_spell',
    UNIT_ATTACK_MELEE:    'unit_attack_melee',
    UNIT_ATTACK_RANGED:   'unit_attack_ranged',
    UNIT_DEATH:           'unit_death',
    TOWER_HIT:            'tower_hit',
    TOWER_DESTROY:        'tower_destroy',
    HERO_DEATH:           'hero_death',
    PROJECTILE_IMPACT:    'projectile_impact',
    SPELL_AOE:            'spell_aoe',
    BATTLE_START:         'battle_start',
    BATTLE_WIN:           'battle_win',
    BATTLE_LOSE:          'battle_lose',
});
