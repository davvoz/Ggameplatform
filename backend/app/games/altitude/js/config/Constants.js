/**
 * Altitude - Game Constants
 * Single source of truth for all game configuration values.
 * Follows Single Responsibility Principle.
 */

// ═══════════════════════════════════════════════════════════════
// DEVICE & PERFORMANCE
// ═══════════════════════════════════════════════════════════════

export const IS_MOBILE = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

export const QUALITY = {
    SHADOWS:        !IS_MOBILE,
    MAX_PARTICLES:  IS_MOBILE ? 50  : 500,
    STAR_COUNT:     IS_MOBILE ? 15  : 30,
    BULLET_GLOW:    !IS_MOBILE,
    FANCY_OVERLAYS: !IS_MOBILE,
    FANCY_TIMER:    !IS_MOBILE,
};

// ═══════════════════════════════════════════════════════════════
// DISPLAY & RENDERING
// ═══════════════════════════════════════════════════════════════

export const DESIGN_WIDTH = 400;
export const DESIGN_HEIGHT = 700;

export const COLORS = {
// Background — void sintetico, pioggia acida, neon riflessi
BG_PRIMARY:        '#00010f',        // nero‑abisso con riflessi ultravioletti
BG_SECONDARY:      '#03051d',        // blu‑void più profondo e lucido
BG_GRADIENT_TOP:   '#2a00ff',        // violetto laser iper‑ionizzato
BG_GRADIENT_BOTTOM:'#000014',        // ombra quantica più densa

// Neon palette — saturazione al limite, fosforescenze tossiche
NEON_CYAN:   '#ffb7ff',              // ciano‑plasma con glow rosa
NEON_GREEN:  '#00ff83',              // verde mutageno fluorescente
NEON_PINK:   '#ff00ff',              // magenta synth al 100% saturazione
NEON_PURPLE: '#f000ff',              // violetto ionizzato + gamma boost
NEON_ORANGE: '#ffb300',              // tungsteno fuso più caldo e radioattivo
NEON_YELLOW: '#faff2b',              // hazard giallo fosforescente
NEON_RED:    '#ff004f',              // rosso sirena più tagliente
NEON_BLUE:   '#0077ff',              // blu laser potenziato

// UI — HUD olografico, vetro liquido, interfacce aumentate
UI_TEXT:        '#e8fcff',           // testo olografico più brillante
UI_TEXT_DIM:    '#7c8fa8',           // HUD attenuato ma più leggibile
UI_PANEL:       'rgba(5, 10, 30, 0.88)',   // vetro liquido più luminoso
UI_BORDER:      'rgba(0, 255, 255, 0.65)', // bordo glitch ciano‑ionico potenziato
UI_BORDER_DIM:  'rgba(0, 255, 255, 0.28)', // separatori più visibili
PANEL_BG:       'rgba(5, 10, 30, 0.97)',   // overlay più denso

// Platform colors — materiali sintetici, hazard, neon tossici
PLATFORM_NORMAL:  '#00ffe6',         // turchese sintetico più brillante
PLATFORM_FRAGILE: '#ff7a00',         // arancio hazard ipersaturo + glow
PLATFORM_MOVING:  '#00a4ff',         // rail magnetico neon più freddo
PLATFORM_BOUNCY:  '#ff00ff',         // gomma shock neon totale
PLATFORM_DEADLY:  '#ff004f',         // laser rosso da zona proibita
PLATFORM_CLOUD:   '#b5d9ff',         // vapore luminescente più chiaro

// Entity colors — avatar, nemici, loot futuristico
PLAYER_PRIMARY:    '#00fff2',        // tuta cyber‑aqua ionizzata + glow
PLAYER_SECONDARY:  '#00e0cc',        // accenti sintetici più vividi
ENEMY_PRIMARY:     '#ff2a66',        // predatore neon ipersaturo + sangue digitale
ENEMY_SECONDARY:   '#a0003d',        // ombra sanguigna più profonda
COIN_GOLD:         '#ffe85c',        // crediti digitali più luminosi
GEM_CYAN:          '#00ffff',        // shard energetico al plasma totale
GEM_PURPLE:        '#f000ff',        // cristallo glitch quantico potenziato



};

export const FONTS = {
    TITLE: '"Segoe UI", system-ui, sans-serif',
    UI: '"Segoe UI", system-ui, sans-serif',
    HUD: 'monospace',
};

// ═══════════════════════════════════════════════════════════════
// PHYSICS
// ═══════════════════════════════════════════════════════════════

export const PHYSICS = {
    GRAVITY: 1800,
    MAX_FALL_SPEED: 800,
    
    // Player
    PLAYER_JUMP_FORCE: 650,
    PLAYER_MOVE_SPEED: 280,
    PLAYER_AIR_CONTROL: 1.0,
    PLAYER_FRICTION: 0.88,
    
    // Bounce multipliers
    BOUNCE_NORMAL: 1.0,
    BOUNCE_SUPER: 1.5,
    BOUNCE_WEAK: 0.6,
};

// ═══════════════════════════════════════════════════════════════
// PLATFORMS
// ═══════════════════════════════════════════════════════════════

export const PLATFORM = {
    WIDTH: 70,
    HEIGHT: 14,
    MIN_GAP: 80,
    MAX_GAP: 140,
    
    // Types
    TYPES: {
        NORMAL: 'normal',
        FRAGILE: 'fragile',
        MOVING: 'moving',
        BOUNCY: 'bouncy',
        CLOUD: 'cloud',
        DEADLY: 'deadly',
    },
    
    // Spawn weights per altitude zone (0-1000, 1000-3000, 3000+)
    SPAWN_WEIGHTS: {
        LOW: { normal: 0.7, fragile: 0.1, moving: 0.1, bouncy: 0.1, cloud: 0, deadly: 0 },
        MID: { normal: 0.4, fragile: 0.2, moving: 0.2, bouncy: 0.1, cloud: 0.05, deadly: 0.05 },
        HIGH: { normal: 0.2, fragile: 0.25, moving: 0.25, bouncy: 0.1, cloud: 0.1, deadly: 0.1 },
    },
};

// ═══════════════════════════════════════════════════════════════
// ENEMIES
// ═══════════════════════════════════════════════════════════════

export const ENEMY_TYPES = {
    FLOATER: {
        id: 'floater',
        name: 'Floater',
        width: 32,
        height: 32,
        speed: 60,
        behavior: 'hover',
        canBeStomped: true,
        damage: 1,
        scoreValue: 50,
    },
    CHASER: {
        id: 'chaser',
        name: 'Chaser',
        width: 28,
        height: 28,
        speed: 120,
        behavior: 'chase',
        canBeStomped: true,
        damage: 1,
        scoreValue: 100,
    },
    SHOOTER: {
        id: 'shooter',
        name: 'Shooter',
        width: 36,
        height: 36,
        speed: 40,
        behavior: 'shoot',
        canBeStomped: true,
        damage: 1,
        scoreValue: 150,
        shootInterval: 2.5,
        bulletSpeed: 200,
    },
    BAT: {
        id: 'bat',
        name: 'Bat',
        width: 30,
        height: 24,
        speed: 150,
        behavior: 'swoop',
        canBeStomped: true,
        damage: 1,
        scoreValue: 75,
    },
    GHOST: {
        id: 'ghost',
        name: 'Ghost',
        width: 34,
        height: 38,
        speed: 80,
        behavior: 'phase',
        canBeStomped: false, // Immune when phased
        damage: 1,
        scoreValue: 200,
    },
};

// ═══════════════════════════════════════════════════════════════
// COLLECTIBLES
// ═══════════════════════════════════════════════════════════════

export const COLLECTIBLES = {
    COIN: {
        id: 'coin',
        value: 1,
        scoreValue: 10,
        size: 20,
    },
    GEM: {
        id: 'gem',
        value: 5,
        scoreValue: 50,
        size: 22,
    },
    DIAMOND: {
        id: 'diamond',
        value: 25,
        scoreValue: 250,
        size: 24,
    },
    STAR: {
        id: 'star',
        value: 10,
        scoreValue: 100,
        size: 26,
    },
};

// ═══════════════════════════════════════════════════════════════
// POWER-UPS
// ═══════════════════════════════════════════════════════════════

export const POWERUP_TYPES = {
    JETPACK: {
        id: 'jetpack',
        name: 'Jetpack',
        icon: '🚀',
        duration: 4,
        description: 'Fly upward for a short time',
        color: COLORS.NEON_ORANGE,
    },
    SHIELD: {
        id: 'shield',
        name: 'Shield',
        icon: '🛡️',
        duration: 8,
        description: 'Protects from one hit',
        color: COLORS.NEON_CYAN,
    },
    MAGNET: {
        id: 'magnet',
        name: 'Magnet',
        icon: '🧲',
        duration: 10,
        description: 'Attracts nearby coins',
        color: COLORS.NEON_PURPLE,
    },
    SPRING_BOOTS: {
        id: 'spring_boots',
        name: 'Spring Boots',
        icon: '🥾',
        duration: 15,
        description: 'Jump 50% higher',
        color: COLORS.NEON_GREEN,
    },
    SLOW_TIME: {
        id: 'slow_time',
        name: 'Slow Time',
        icon: '⏱️',
        duration: 5,
        description: 'Slows everything except you',
        color: COLORS.NEON_BLUE,
    },
    DOUBLE_COINS: {
        id: 'double_coins',
        name: 'Double Coins',
        icon: '💰',
        duration: 12,
        description: 'Coins worth double',
        color: COLORS.NEON_YELLOW,
    },
    EXTRA_LIFE: {
        id: 'extra_life',
        name: 'Extra Life',
        icon: '❤️',
        duration: 0,          // instant — no timer
        description: 'Recover one life instantly',
        color: '#ff4466',
    },
    SPIKE_HASTE: {
        id: 'spike_haste',
        name: 'Spike Haste',
        icon: '⚡',
        duration: 8,
        description: 'Spike regeneration 2.5× faster',
        color: '#ff6600',
    },
};

// ═══════════════════════════════════════════════════════════════
// UPGRADES (SHOP)
// ═══════════════════════════════════════════════════════════════

export const UPGRADE_CATALOG = {
    // JUMP CATEGORY
    jump_power: {
        id: 'jump_power',
        name: 'Jump Power',
        icon: '⬆️',
        category: 'mobility',
        description: 'Increase base jump height',
        baseCost: 50,
        costScale: 1.8,
        maxLevel: 10,
        effectPerLevel: 0.08, // +8% jump per level
    },
    ghost_repel: {
        id: 'ghost_repel',
        name: 'Ghost Repel',
        icon: '🔮',
        category: 'mobility',
        description: 'Auto-repels one ghost on contact.',
        baseCost: 40,
        costScale: 1.6,
        maxLevel: 5,
        effectPerLevel: 1, // each level = 1 step down in cooldown (60/50/40/30/20/10s)
    },
    double_jump: {
        id: 'double_jump',
        name: 'Double Jump',
        icon: '🔄',
        category: 'mobility',
        description: 'Unlocks mid-air jump',
        baseCost: 500,
        costScale: 1,
        maxLevel: 1,
        effectPerLevel: 1, // Boolean unlock
    },
    glide: {
        id: 'glide',
        name: 'Glide',
        icon: '🪂',
        category: 'mobility',
        description: 'Hold to slow your fall',
        baseCost: 300,
        costScale: 1,
        maxLevel: 1,
        effectPerLevel: 1,
    },
    dash: {
        id: 'dash',
        name: 'Air Dash',
        icon: '💨',
        category: 'mobility',
        description: 'Dash through enemies! Double-tap ←/→. +1/lvl',
        baseCost: 400,
        costScale: 2,
        maxLevel: 3, // Number of dashes per jump
        effectPerLevel: 1,
    },
    
    // COMBAT CATEGORY
    stomp_power: {
        id: 'stomp_power',
        name: 'Stomp Power',
        icon: '👟',
        category: 'combat',
        description: 'Bounce higher after stomping enemies',
        baseCost: 60,
        costScale: 1.7,
        maxLevel: 5,
        effectPerLevel: 0.15,
    },
    shockwave: {
        id: 'shockwave',
        name: 'Shockwave',
        icon: '💥',
        category: 'combat',
        description: 'Stomp creates damaging shockwave',
        baseCost: 350,
        costScale: 1,
        maxLevel: 1,
        effectPerLevel: 1,
    },
    spike_head: {
        id: 'spike_head',
        name: 'Spike Head',
        icon: '🔺',
        category: 'combat',
        description: 'Grow head spikes that damage enemies',
        baseCost: 280,
        costScale: 1.9,
        maxLevel: 5,
        effectPerLevel: 1,  // +1 spike per level
    },
    thick_skin: {
        id: 'thick_skin',
        name: 'Thick Skin',
        icon: '🛡️',
        category: 'combat',
        description: 'Reduced knockback from hits',
        baseCost: 80,
        costScale: 1.6,
        maxLevel: 5,
        effectPerLevel: 0.15,
    },
    extra_life: {
        id: 'extra_life',
        name: 'Extra Life',
        icon: '❤️',
        category: 'combat',
        description: 'Start with additional lives',
        baseCost: 200,
        costScale: 2.5,
        maxLevel: 5,
        effectPerLevel: 1,
    },
    
    // COLLECTION CATEGORY
    coin_magnet_range: {
        id: 'coin_magnet_range',
        name: 'Magnet Range',
        icon: '🧲',
        category: 'collection',
        description: 'Passively attract nearby coins',
        baseCost: 100,
        costScale: 1.5,
        maxLevel: 5,
        effectPerLevel: 15, // Pixels of range
    },
    coin_value: {
        id: 'coin_value',
        name: 'Coin Value',
        icon: '💎',
        category: 'collection',
        description: 'Coins worth more',
        baseCost: 150,
        costScale: 2,
        maxLevel: 5,
        effectPerLevel: 0.1, // +10% value
    },
    powerup_duration: {
        id: 'powerup_duration',
        name: 'Power Duration',
        icon: '⏰',
        category: 'collection',
        description: 'Power-ups last longer',
        baseCost: 120,
        costScale: 1.8,
        maxLevel: 5,
        effectPerLevel: 0.15,
    },
    lucky_spawn: {
        id: 'lucky_spawn',
        name: 'Lucky Spawn',
        icon: '🍀',
        category: 'collection',
        description: 'Increased rare item spawn rate',
        baseCost: 200,
        costScale: 2,
        maxLevel: 3,
        effectPerLevel: 0.1,
    },
    
    // SCORE CATEGORY
    score_multiplier: {
        id: 'score_multiplier',
        name: 'Score x',
        icon: '⭐',
        category: 'score',
        description: 'Increase base score multiplier',
        baseCost: 100,
        costScale: 2,
        maxLevel: 5,
        effectPerLevel: 0.1,
    },
    combo_keeper: {
        id: 'combo_keeper',
        name: 'Combo Keeper',
        icon: '🔥',
        category: 'score',
        description: 'Combo timer lasts longer',
        baseCost: 80,
        costScale: 1.6,
        maxLevel: 5,
        effectPerLevel: 0.2,
    },
};

// ═══════════════════════════════════════════════════════════════
// PRESTIGE SYSTEM
// ═══════════════════════════════════════════════════════════════

/** The three permanent bonuses the player can pick when they prestige. */
export const PRESTIGE_BONUSES = [
    {
        id: 'lives',
        icon: '❤️',
        label: '+2 Extra Lives',
        desc: 'Start every run with 2 more lives',
        perStack: '+2 lives per prestige',
    },
    {
        id: 'coins',
        icon: '💰',
        label: '+0.5× Coin Value',
        desc: 'All collected coins are worth 50% more',
        perStack: '+50% coin value per prestige',
    },
    {
        id: 'altitude',
        icon: '📡',
        label: '+0.5× Altitude Score',
        desc: 'Altitude counts 50% higher towards your score',
        perStack: '+50% altitude score per prestige',
    },
];

// ═══════════════════════════════════════════════════════════════
// ALTITUDE ZONES (Difficulty scaling)
// ═══════════════════════════════════════════════════════════════

export const ZONES = [
    { name: 'Ground Level', minAltitude: 0, maxAltitude: 500, bgColor: '#0d1a2a', enemyRate: 0.05 },
    { name: 'Low Clouds', minAltitude: 500, maxAltitude: 1500, bgColor: '#1a2a3a', enemyRate: 0.1 },
    { name: 'Sky Layer', minAltitude: 1500, maxAltitude: 3000, bgColor: '#2a3a4a', enemyRate: 0.15 },
    { name: 'Storm Zone', minAltitude: 3000, maxAltitude: 5000, bgColor: '#3a2a4a', enemyRate: 0.2 },
    { name: 'Stratosphere', minAltitude: 5000, maxAltitude: 8000, bgColor: '#2a1a3a', enemyRate: 0.25 },
    { name: 'Space Edge', minAltitude: 8000, maxAltitude: Infinity, bgColor: '#0a0a1a', enemyRate: 0.3 },
];

// ═══════════════════════════════════════════════════════════════
// GAME SETTINGS
// ═══════════════════════════════════════════════════════════════

export const GAME_SETTINGS = {
    STARTING_LIVES: 1,
    INVINCIBILITY_TIME: 2,
    COMBO_TIMEOUT: 3,
    CAMERA_LERP: 0.14,
    CAMERA_DEAD_ZONE: 150, // kept for reference, no longer used by main camera
    SCROLL_SPEED_BASE: 50, // Auto-scroll pixels per second (increases with altitude)
    DEATH_FALL_THRESHOLD: 300, // Fall this much below camera = death
};

// ═══════════════════════════════════════════════════════════════
// TIME BONUS — Speed-run reward system
// Par times are multiplied by the number of level screens.
// ═══════════════════════════════════════════════════════════════

export const TIME_BONUS = {
    // Par seconds per screen — tight targets for skilled play
    // Level 1 (1 screen) gold = 12s; Level 2+ (2 screens) gold = 24s etc.
    GOLD_PER_SCREEN:   3,
    SILVER_PER_SCREEN: 6,
    BRONZE_PER_SCREEN: 10,

    // Score per screen — scales automatically with level length
    // Level 1 gold = 800pts; 2-screen level gold = 1600pts etc.
    GOLD_SCORE_PER_SCREEN:   800,
    SILVER_SCORE_PER_SCREEN: 350,
    BRONZE_SCORE_PER_SCREEN: 120,

    // Coins per screen
    GOLD_COINS_PER_SCREEN:   8,
    SILVER_COINS_PER_SCREEN: 4,
    BRONZE_COINS_PER_SCREEN: 1,

    // Medal colors for UI
    GOLD_COLOR:   '#FFD700',
    SILVER_COLOR: '#C0C0C0',
    BRONZE_COLOR: '#CD7F32',
    NONE_COLOR:   '#FF4466',
};
