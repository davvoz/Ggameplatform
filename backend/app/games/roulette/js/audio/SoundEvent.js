/**
 * Stable string keys for sound events. Systems depend on this — never on SoundManager.
 */
export const SoundEvent = Object.freeze({
    UI_CLICK:    'ui_click',
    CHIP_DROP:   'chip_drop',
    CHIP_CLEAR:  'chip_clear',
    SPIN_START:  'spin_start',
    SPIN_LOOP:   'spin_loop',
    BALL_BOUNCE: 'ball_bounce',
    BALL_SETTLE: 'ball_settle',
    WIN_SMALL:   'win_small',
    WIN_BIG:     'win_big',
    LOSE:        'lose',
});
