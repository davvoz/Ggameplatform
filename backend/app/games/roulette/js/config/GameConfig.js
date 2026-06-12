/**
 * Engine-only constants. NEVER put gameplay numbers here (payouts, spin
 * duration, ball physics) — those live in data/config.json.
 */
export const GameConfig = Object.freeze({
    VIEW_WIDTH:  480,
    VIEW_HEIGHT: 800,

    LAYOUT: Object.freeze({
        HUD_HEIGHT: 80,
        WHEEL_CX: 240,
        WHEEL_CY: 240,
        WHEEL_R_OUTER: 150,
        WHEEL_R_INNER: 78,
        WHEEL_TILT_Y: 0.55,   // vertical squash for pseudo-3D top-down
        TABLE_TOP: 410,
        TABLE_LEFT: 18,
        TABLE_RIGHT: 462,
        ZERO_W: 32,
        CELL_W: 32,           // (462-18-32-30) / 12 = ~32
        CELL_H: 36,
        COLUMN_W: 30,         // 2:1 column buttons on the right
        DOZEN_H: 36,
        OUTSIDE_H: 36,
        CHIP_BAR_Y: 670,
        CHIP_BAR_H: 60,
        BUTTON_BAR_Y: 738,
        BUTTON_BAR_H: 56,
    }),

    COLOR: Object.freeze({
        BG:           '#0a0a0f',
        FELT:         '#1a4a2e',
        FELT_DARK:    '#103821',
        FELT_LINE:    '#2d6a45',
        GOLD:         '#d4a017',
        GOLD_BRIGHT:  '#f0c040',
        IVORY:        '#f5f5f0',
        IVORY_DIM:    '#bfbfb4',
        RED:          '#c0392b',
        RED_BRIGHT:   '#e85a4a',
        BLACK:        '#1a1a1a',
        GREEN:        '#0e7d3f',
        TEXT:         '#f5f5f0',
        TEXT_DIM:     '#9a9a90',
        HOT:          '#ff6a2c',
        COLD:         '#4ab8ff',
        BALL:         '#f8f4e8',
        WHEEL_RIM:    '#7a5a18',
        WHEEL_RIM_LT: '#d4a017',
        SHADOW:       'rgba(0,0,0,0.55)',
        OVERLAY:      'rgba(8,6,12,0.82)',
        // Premium presentation accents (visual only).
        GOLD_DEEP:    '#9a7212',
        GOLD_PALE:    '#ffe9a8',
        FELT_GLOW:    '#2a6e44',
        PANEL_DARK:   'rgba(10,10,18,0.92)',
        PANEL_EDGE:   'rgba(240,192,64,0.35)',
        GLASS:        'rgba(255,255,255,0.06)',
        WIN_GLOW:     'rgba(240,192,64,0.55)',
        VIGNETTE:     'rgba(0,0,0,0.45)',
    }),

    FRAME_DT_CLAMP: 0.05,
});

/**
 * Presentation-only easing curves shared by renderers and states.
 * Pure functions — no gameplay influence.
 */
export const Ease = Object.freeze({
    outCubic:  (t) => 1 - Math.pow(1 - t, 3),
    outQuint:  (t) => 1 - Math.pow(1 - t, 5),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    outBack:   (t) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    outElastic: (t) => {
        if (t === 0 || t === 1) return t;
        const c4 = (2 * Math.PI) / 3;
        return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
});

// Static set of red numbers — referenced by data selectors.
export const RED_NUMBERS = Object.freeze(new Set([
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
]));
