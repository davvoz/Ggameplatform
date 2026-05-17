/**
 * Engine constants only. Gameplay numbers live in /data/*.json.
 */
export const GameConfig = Object.freeze({
    VIEW_WIDTH: 480,
    VIEW_HEIGHT: 800,

    // Arena geometry (top-down, portrait). Y grows downward.
    // Top half = enemy territory, Bottom half = player territory.
    ARENA: Object.freeze({
        TOP: 80,                 // top HUD reserved
        BOTTOM: 720,             // above player UI
        BRIDGE_Y_CENTER: 400,    // midline (between halves)
        BRIDGE_HEIGHT: 56,
        BRIDGE_LEFT_X: 130,
        BRIDGE_RIGHT_X: 350,
        ENEMY_TOWER_X: 240,
        ENEMY_TOWER_Y: 130,
        PLAYER_TOWER_X: 240,
        PLAYER_TOWER_Y: 670,
        PLAYER_HERO_SPAWN_X: 240,
        PLAYER_HERO_SPAWN_Y: 600,
        ENEMY_HERO_SPAWN_X: 240,
        ENEMY_HERO_SPAWN_Y: 200,
        SUMMON_ZONE_TOP: 410,    // bottom edge of bridge
        SUMMON_ZONE_BOTTOM: 700,
        SUMMON_ZONE_LEFT: 20,
        SUMMON_ZONE_RIGHT: 460,
        MANA_RUSH_THRESHOLD: 120   // seconds remaining when mana regen accelerates
    }),

    UI: Object.freeze({
        HUD_TOP_HEIGHT: 70,
        HAND_PANEL_Y: 730,
        HAND_PANEL_HEIGHT: 70,
        HAND_SLOTS: 4,
        CARD_WIDTH: 90,
        CARD_HEIGHT: 60,
        CARD_GAP: 8,
        CARD_PANEL_LEFT: 75,
        MANA_BAR_Y: 720,
        MANA_BAR_HEIGHT: 8
    }),

    BATTLE: Object.freeze({
        ROSTER_SIZE: 10,
        MAX_MANA: 10,
        START_MANA: 4,
        MANA_REGEN_PER_SEC: 1,
        FRAME_DT_CLAMP: 0.05,
        MATCH_TIME_LIMIT: 240,    // seconds
        SPATIAL_CELL: 64,
        SEPARATION_FORCE: 30,     // gentle push so units don't overlap perfectly
        TARGET_SCAN_INTERVAL: 0.2 // seconds — entities re-scan target periodically
    }),

    PROJECTILE: Object.freeze({
        RADIUS: 4,
        MAX_LIFETIME: 4
    }),

    INPUT: Object.freeze({
        DRAG_PICK_RADIUS: 60
    }),

    // Engine-side palette (UI shells); gameplay colors come from data.
    COLOR: Object.freeze({
        BG: '#07060f',
        PLAYER_TINT: '#5fc8ff',
        ENEMY_TINT: '#ff6a6a',
        BRIDGE: '#3a3550',
        BRIDGE_EDGE: '#5a4f7a',
        TEXT: '#e8e6ff',
        TEXT_DIM: '#9c9ab8',
        GOLD: '#ffd166',
        MANA: '#5fa9ff',
        HP_GOOD: '#7be37b',
        HP_BAD: '#ff6a6a',
        MANA_RUSH: '#ff9a3c',
        MANA_RUSH_RED: '#ec0303',
        OVERLAY: 'rgba(7,6,15,0.78)',
        TITLE_OUTLINE : 'rgba(243, 62, 62, 0.95)'
    }),

    AUDIO: Object.freeze({
        MASTER: 0.3
    }),

    ANIMATION: Object.freeze({
        DEFAULT_FPS: 6,
        ATTACK_FPS: 12,
        HURT_FLASH_DURATION: 0.18,    // seconds — white tint after takeDamage
        PROJECTILE_FPS: 14
    })
});

export const Team = Object.freeze({ PLAYER: 'player', ENEMY: 'enemy' });

export function opposingTeam(team) {
    if (team === Team.PLAYER) return Team.ENEMY;
    if (team === Team.ENEMY) return Team.PLAYER;
    throw new Error(`Unknown team: ${team}`);
}
