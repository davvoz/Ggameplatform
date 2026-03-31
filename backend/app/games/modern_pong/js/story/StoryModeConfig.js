import {
    ARENA_LEFT, ARENA_RIGHT, ARENA_MID_Y,
} from '../config/Constants.js';

/**
 * Story Mode level definitions.
 * Each level specifies: opponent, AI difficulty, background theme,
 * obstacle layout, and optional modifiers.
 *
 * Obstacles are placed in absolute arena coordinates.
 * The player fights all 6 characters in escalating difficulty.
 */

/* ---- Background theme palettes ---- */
const THEMES = {
    dojo: {
        id: 'dojo',
        name: 'THE DOJO',
        bg: '#0c0c1e',
        floor: '#141430',
        accent: '#dd4422',
        grid: '#1a1a3a',
        line: '#2a1a1a',
        glow: 'rgba(220,60,30,0.25)',
    },
    tundra: {
        id: 'tundra',
        name: 'FROZEN TUNDRA',
        bg: '#0a1420',
        floor: '#0f1e30',
        accent: '#44ccff',
        grid: '#12253a',
        line: '#182838',
        glow: 'rgba(60,180,255,0.25)',
    },
    void: {
        id: 'void',
        name: 'THE VOID',
        bg: '#0a0010',
        floor: '#10001e',
        accent: '#aa44ff',
        grid: '#180028',
        line: '#1a0030',
        glow: 'rgba(160,60,255,0.3)',
    },
    fortress: {
        id: 'fortress',
        name: 'IRON FORTRESS',
        bg: '#0c100c',
        floor: '#141e14',
        accent: '#66cc44',
        grid: '#1a2a1a',
        line: '#223022',
        glow: 'rgba(80,200,60,0.25)',
    },
    storm: {
        id: 'storm',
        name: 'THUNDER DOME',
        bg: '#14120a',
        floor: '#201e10',
        accent: '#ffcc00',
        grid: '#2a2810',
        line: '#302a14',
        glow: 'rgba(255,200,0,0.3)',
    },
    swamp: {
        id: 'swamp',
        name: 'TOXIC SWAMP',
        bg: '#081008',
        floor: '#0e1a0e',
        accent: '#44ff33',
        grid: '#142814',
        line: '#1a301a',
        glow: 'rgba(60,255,40,0.3)',
    },
};

/* ---- Obstacle presets (arena coords) ---- */
const CX = (ARENA_LEFT + ARENA_RIGHT) / 2;      // 200
const AW = ARENA_RIGHT - ARENA_LEFT;             // 380

/** Helper to create obstacle definitions. */
function obs(x, y, w, h) {
    return { x, y, w, h };
}

/* ---- Level definitions (6 levels, one per character) ----  */
export const STORY_LEVELS = [
    {
        level: 1,
        opponentId: 'blaze',
        aiDifficulty: 'EASY',
        roundsToWin: 11,
        theme: THEMES.dojo,
        title: 'TRIAL BY FIRE',
        subtitle: 'Prove yourself against the Fire Warrior.',
        obstacles: [
            // Two small pillars flanking center
            obs(CX - 60, ARENA_MID_Y - 10, 16, 20),
            obs(CX + 44, ARENA_MID_Y - 10, 16, 20),
        ],
    },
    {
        level: 2,
        opponentId: 'frost',
        aiDifficulty: 'EASY',
        roundsToWin: 11,
        theme: THEMES.tundra,
        title: 'FROZEN PATH',
        subtitle: 'Navigate the icy curves of the Ice Mage.',
        obstacles: [
            // Ice blocks forming a partial wall at mid
            obs(ARENA_LEFT + 20, ARENA_MID_Y - 8, 50, 16),
            obs(ARENA_RIGHT - 70, ARENA_MID_Y - 8, 50, 16),
        ],
    },
    {
        level: 3,
        opponentId: 'shadow',
        aiDifficulty: 'MEDIUM',
        roundsToWin: 11,
        theme: THEMES.void,
        title: 'ENTER THE VOID',
        subtitle: 'The Ninja lurks in the darkness.',
        obstacles: [
            // Asymmetric obstacles to create tricky angles
            obs(CX - 80, ARENA_MID_Y - 40, 20, 20),
            obs(CX + 60, ARENA_MID_Y + 20, 20, 20),
            obs(CX, ARENA_MID_Y - 6, 12, 12),
        ],
    },
    {
        level: 4,
        opponentId: 'tank',
        aiDifficulty: 'MEDIUM',
        roundsToWin: 21,
        theme: THEMES.fortress,
        title: 'BREACH THE WALL',
        subtitle: 'The Heavy Guard blocks your every shot.',
        obstacles: [
            // Heavy defensive wall with gap
            obs(ARENA_LEFT + 30, ARENA_MID_Y - 8, 80, 16),
            obs(ARENA_RIGHT - 110, ARENA_MID_Y - 8, 80, 16),
            // Small blocks in each half
            obs(CX - 30, ARENA_MID_Y - 80, 14, 14),
            obs(CX + 16, ARENA_MID_Y + 66, 14, 14),
        ],
    },
    {
        level: 5,
        opponentId: 'spark',
        aiDifficulty: 'HARD',
        roundsToWin: 21,
        theme: THEMES.storm,
        title: 'LIGHTNING STRIKES',
        subtitle: 'Speed and power — can you keep up?',
        obstacles: [
            // Zigzag corridor through center
            obs(ARENA_LEFT + 40, ARENA_MID_Y - 30, 60, 14),
            obs(ARENA_RIGHT - 100, ARENA_MID_Y + 16, 60, 14),
            obs(CX - 8, ARENA_MID_Y - 8, 16, 16),
        ],
    },
    {
        level: 6,
        opponentId: 'venom',
        aiDifficulty: 'HARD',
        roundsToWin: 21,
        theme: THEMES.swamp,
        title: 'FINAL TOXIN',
        subtitle: 'Defeat the Toxic Trickster to become Champion.',
        obstacles: [
            // Dense obstacle field — most challenging layout
            obs(ARENA_LEFT + 50, ARENA_MID_Y - 50, 18, 18),
            obs(ARENA_RIGHT - 68, ARENA_MID_Y - 50, 18, 18),
            obs(ARENA_LEFT + 50, ARENA_MID_Y + 32, 18, 18),
            obs(ARENA_RIGHT - 68, ARENA_MID_Y + 32, 18, 18),
            obs(CX - 9, ARENA_MID_Y - 9, 18, 18),
        ],
    },
];

/**
 * Get a story level by 1-based level number.
 * @param {number} level
 * @returns {object|undefined}
 */
export function getStoryLevel(level) {
    return STORY_LEVELS.find(l => l.level === level);
}

export { THEMES as STORY_THEMES };

/**
 * Selectable stages for Versus modes.
 * The first entry (null theme) is the default arena.
 */
export const VS_STAGES = [
    { id: 'default', name: 'CLASSIC',         theme: null,            obstacles: [] },
    { id: 'dojo',    name: THEMES.dojo.name,   theme: THEMES.dojo,    obstacles: [
        obs(CX - 60, ARENA_MID_Y - 10, 16, 20),
        obs(CX + 44, ARENA_MID_Y - 10, 16, 20),
    ]},
    { id: 'tundra',  name: THEMES.tundra.name, theme: THEMES.tundra,  obstacles: [
        obs(ARENA_LEFT + 20, ARENA_MID_Y - 8, 50, 16),
        obs(ARENA_RIGHT - 70, ARENA_MID_Y - 8, 50, 16),
    ]},
    { id: 'void',    name: THEMES.void.name,   theme: THEMES.void,    obstacles: [
        obs(CX - 80, ARENA_MID_Y - 40, 20, 20),
        obs(CX + 60, ARENA_MID_Y + 20, 20, 20),
        obs(CX, ARENA_MID_Y - 6, 12, 12),
    ]},
    { id: 'fortress',name: THEMES.fortress.name, theme: THEMES.fortress, obstacles: [
        obs(ARENA_LEFT + 30, ARENA_MID_Y - 8, 80, 16),
        obs(ARENA_RIGHT - 110, ARENA_MID_Y - 8, 80, 16),
    ]},
    { id: 'storm',   name: THEMES.storm.name,  theme: THEMES.storm,   obstacles: [
        obs(ARENA_LEFT + 40, ARENA_MID_Y - 30, 60, 14),
        obs(ARENA_RIGHT - 100, ARENA_MID_Y + 16, 60, 14),
        obs(CX - 8, ARENA_MID_Y - 8, 16, 16),
    ]},
    { id: 'swamp',   name: THEMES.swamp.name,  theme: THEMES.swamp,   obstacles: [
        obs(ARENA_LEFT + 50, ARENA_MID_Y - 50, 18, 18),
        obs(ARENA_RIGHT - 68, ARENA_MID_Y - 50, 18, 18),
        obs(ARENA_LEFT + 50, ARENA_MID_Y + 32, 18, 18),
        obs(ARENA_RIGHT - 68, ARENA_MID_Y + 32, 18, 18),
        obs(CX - 9, ARENA_MID_Y - 9, 18, 18),
    ]},
];
