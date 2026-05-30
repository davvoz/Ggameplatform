/**
 * Engine constants only. All gameplay numbers live in /data/config.json.
 */
export const GameConfig = Object.freeze({
    VIEW_WIDTH: 480,
    VIEW_HEIGHT: 800,
    /** True when running on a mobile/tablet user-agent. Evaluated once at load time. */
    IS_MOBILE: /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent),

    LAYOUT: Object.freeze({
        // Top strip: jackpot ticker + neon title
        HEADER_Y: 0,
        HEADER_HEIGHT: 110,
        // Reel area (the cabinet window). 5 reels × 3 rows.
        REEL_AREA_X: 30,
        REEL_AREA_Y: 130,
        REEL_AREA_W: 420,
        REEL_AREA_H: 360,
        CELL_W: 80,       // 5 × 80 = 400, +2 gutters of 10 = 420
        CELL_H: 110,      // 3 × 110 = 330, +2 gutters of 15 = 360
        CELL_GAP_X: 5,
        CELL_GAP_Y: 15,
        // HUD strip between reels and buttons (balance, bet, hot streak, last wins)
        HUD_Y: 500,
        HUD_HEIGHT: 110,
        // Button row
        BUTTONS_Y: 620,
        BUTTONS_HEIGHT: 130,
        // Footer (autoplay, free spins counter, etc.)
        FOOTER_Y: 760,
        FOOTER_HEIGHT: 40
    }),

    COLOR: Object.freeze({
        BG_TOP:    '#1a0033',
        BG_BOTTOM: '#001a33',
        BG_DEEP:   '#0a0010',
        NEON_VIOLET: '#cc00ff',
        NEON_CYAN:   '#00ffff',
        NEON_GOLD:   '#ffd700',
        NEON_RED:    '#ff2244',
        NEON_LIME:   '#44ff00',
        NEON_ORANGE: '#ff8800',
        WHITE_MILK:  '#f8f8ff',
        BLACK_DEEP:  '#0a0010',
        CHROME:      '#aab4c4',
        CHROME_DARK: '#1f2638',
        REEL_BG_TOP: '#080018',
        REEL_BG_MID: '#1a0030',
        OVERLAY:     'rgba(5,0,15,0.75)',
        OVERLAY_DEEP:'rgba(5,0,15,0.92)'
    }),

    TIMINGS: Object.freeze({
        FRAME_DT_CLAMP: 0.05,
        WIN_LINE_DRAW_MS: 700,
        WIN_LINE_HOLD_MS: 600,
        WIN_TIER_HOLD_MS: { small: 800, medium: 1200, big: 1800, super: 2600, mega: 4000 },
        SCATTER_FANFARE_MS: 1400,
        SPIN_INTENT_DEBOUNCE_MS: 200
    }),

    SYMBOL: Object.freeze({
        // Inset inside its cell when drawn (gives breathing room for glow)
        PAD: 6
    }),

    AUDIO: Object.freeze({
        MASTER: 0.4
    })
});
