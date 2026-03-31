/**
 * Game constants and configuration.
 * Single source of truth for all magic numbers.
 */
export const DESIGN_WIDTH = 400;
export const DESIGN_HEIGHT = 700;

export const ARENA_PADDING = 10;
export const ARENA_LEFT = ARENA_PADDING;
export const ARENA_RIGHT = DESIGN_WIDTH - ARENA_PADDING;
export const ARENA_TOP = 60;
export const ARENA_BOTTOM = DESIGN_HEIGHT - 60;
export const ARENA_MID_Y = (ARENA_TOP + ARENA_BOTTOM) / 2;

export const CHARACTER_SIZE = 64;
export const CHARACTER_HALF = CHARACTER_SIZE / 2;
export const BALL_RADIUS = 9;
export const BALL_BASE_SPEED = 200;
export const BALL_MAX_SPEED = 500;
export const BALL_ACCELERATION = 1.03;

export const POWERUP_SIZE = 24;
export const POWERUP_SPAWN_INTERVAL = 3500;
export const POWERUP_DURATION = 5000;
export const MAX_ACTIVE_POWERUPS = 4;

export const GOAL_ZONE_HEIGHT = 10;

export const ROUNDS_TO_WIN_OPTIONS = [1, 2, 3, 5, 7, 11, 21];
export const DEFAULT_ROUNDS_TO_WIN = 3;

export const COUNTDOWN_SECONDS = 3;
export const ROUND_END_DELAY = 2000;
export const MATCH_END_DELAY = 3500;

export const AI_REACTION_DELAY = 100;
export const AI_DIFFICULTY = { EASY: 0.4, MEDIUM: 0.7, HARD: 0.95 };

export const COLORS = {
    BG_PRIMARY: '#050510',
    BG_SECONDARY: '#0a0a20',
    ARENA_BG: '#08081a',
    ARENA_BORDER: '#1a1a40',
    ARENA_LINE: '#151535',
    NEON_CYAN: '#00e5ff',
    NEON_PINK: '#ff2d78',
    NEON_GREEN: '#39ff14',
    NEON_YELLOW: '#ffe600',
    NEON_ORANGE: '#ff6b35',
    NEON_RED: '#ff1744',
    NEON_PURPLE: '#bf5af2',
    GOLD: '#ffd700',
    WHITE: '#ffffff',
    TEXT_DIM: '#4a4a70',
    HUD_BG: 'rgba(5,5,16,0.90)',
};

export const FONT_FAMILY = '"Orbitron", "Rajdhani", sans-serif';
export const TITLE_FONT = '"Orbitron", "Bungee", sans-serif';
export const UI_FONT = '"Rajdhani", "Orbitron", sans-serif';

export const STAT = { STRENGTH: 'strength', SPEED: 'speed', SPIN: 'spin' };

export const SUPER_CHARGE_MAX = 100;
export const SUPER_CHARGE_HIT = 20;
export const SUPER_CHARGE_POWERUP = 15;
