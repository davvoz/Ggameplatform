/**
 * Configuration constants for background rendering
 * Eliminates magic numbers and improves maintainability
 */

export const AMBIENT_PARTICLE_CONFIG = {
    STARS: {
        COUNT: 8,
        SIZE: 1.5,
        TWINKLE_SPEED: 3,
        BRIGHTNESS: 0.4,
        COLOR: [1.0, 1.0, 0.9]
    },
    ENERGY: {
        COUNT: 3,
        MIN_SIZE: 2,
        MAX_SIZE: 5,
        SPEED: 40,
        MIN_LIFE: 2,
        MAX_LIFE: 5
    }
};

export const GRADIENT_CONFIG = {
    BANDS: 20,
    SKY_TOP_COLOR: [0.5, 0.2, 0.15, 1.0],
    DEFAULT_BG_COLOR: [0.4, 0.7, 1.0, 1.0]
};

export const GROUND_CONFIG = {
    NUM_ROCKS: 15,
    ROCK_MIN_SIZE: 5,
    ROCK_MAX_SIZE: 13,
    ROCK_Y_OFFSET: 10,
    ROCK_Y_VARIANCE: 20,
    ROCK_COLOR_VARIANCE_MIN: 0.7,
    ROCK_COLOR_VARIANCE_MAX: 0.3,
    ROCK_ALPHA: 0.6
};

export const WAVE_CONFIG = {
    WIDTH: 10000,
    HEIGHT: 50
};

export const PLANET_CONFIG = {
    RING_THRESHOLD_RADIUS: 35,
    RING_SCALE: 1.5,
    RING_WIDTH_SCALE: 3,
    RING_HEIGHT: 3,
    RING_ALPHA_MULTIPLIER: 0.5
};

export const MOON_CONFIG = {
    CRATER_POSITIONS: [
        { offsetX: -10, offsetY: -8, radius: 8 },
        { offsetX: 12, offsetY: 5, radius: 6 }
    ],
    CRATER_COLOR: [0.85, 0.85, 0.75, 0.9]
};

export const TREE_CONFIG = {
    TRUNK_WIDTH_RATIO: 0.2,
    TRUNK_HEIGHT_RATIO: 0.5,
    TRUNK_X_OFFSET: 0.4,
    TRUNK_Y_OFFSET: 0.5,
    CROWN_Y_OFFSET: 0.3,
    CROWN_RADIUS_RATIO: 0.6,
    TRUNK_COLOR: [0.3, 0.2, 0.1]
};

export const MUSHROOM_CONFIG = {
    STEM_WIDTH_RATIO: 0.3,
    STEM_HEIGHT_RATIO: 0.5,
    STEM_X_OFFSET: 0.3,
    CAP_RADIUS_RATIO: 0.6,
    STEM_COLOR: [0.9, 0.9, 0.85, 0.7]
};

export const GIANT_MUSHROOM_CONFIG = {
    STEM_WIDTH_RATIO: 0.3,
    STEM_X_OFFSET: 0.15,
    STEM_COLOR: [0.85, 0.8, 0.75, 0.8]
};

export const NEBULA_CONFIG = {
    SECONDARY_OFFSET_X: 30,
    SECONDARY_OFFSET_Y: -20,
    SECONDARY_SIZE_RATIO: 0.33
};

export const AURORA_WAVE_CONFIG = {
    NUM_POINTS: 30,
    SPEED_DIVISOR: 10,
    WAVE_THICKNESS: 4,
    WAVE_HALF_THICKNESS: 2
};

export const SEAWEED_CONFIG = {
    SWAY_AMPLITUDE: 5
};

export const CLOUD_CONFIG = {
    SHADOW_OFFSET: 2,
    SHADOW_COLOR: [0.6, 0.6, 0.7, 0.2],
    HIGHLIGHT_COUNT: 2,
    HIGHLIGHT_OFFSET_RATIO: 0.3,
    HIGHLIGHT_SIZE_RATIO: 0.3,
    HIGHLIGHT_COLOR: [0.95, 0.95, 0.98, 0.3]
};

export const BIRD_CONFIG = {
    WING_FLAP_PERIOD: 0.15,
    WING_FLAP_AMPLITUDE: 2
};

export const FISH_CONFIG = {
    SWIM_PERIOD: 0.3,
    SWIM_AMPLITUDE: 2,
    TAIL_WIDTH_RATIO: 0.6,
    TAIL_HEIGHT: 2
};

export const SHOOTING_STAR_CONFIG = {
    TRAIL_LENGTH_RATIO: 0.5,
    TRAIL_ALPHA_MULTIPLIER: 0.3
};

export const STAR_PARTICLE_CONFIG = {
    ALPHA_MIN: 0.2,
    ALPHA_MAX: 0.8
};

export const FIREFLY_CONFIG = {
    GLOW_PERIOD: 0.4,
    ALPHA_MIN: 0.3,
    ALPHA_MAX: 0.7
};

export const PARTICLE_TYPES = {
    CLOUD: 'cloud',
    BUBBLE: 'bubble',
    STAR: 'star',
    FIREFLY: 'firefly',
    SNOWFLAKE: 'snowflake',
    BIRD: 'bird',
    FISH: 'fish',
    LEAF: 'leaf',
    SAND: 'sand',
    EMBER: 'ember',
    LAVA_GLOW: 'lava_glow',
    SMOKE: 'smoke',
    SHOOTING_STAR: 'shootingStar',
    GLOWDUST: 'glowdust',
    SPORE: 'spore',
    AURORA_PARTICLE: 'aurora_particle',
    HEATWAVE: 'heatwave',
    ENERGY: 'energy',
    SIMPLE_PARTICLE: 'simple_particle',
    ANIMATED_PARTICLE: 'animated_particle',
    CREATURE: 'creature'
};

export const LAYER_TYPES = {
    SKY_GRADIENT: 'sky_gradient',
    GROUND: 'ground',
    WAVE: 'wave',
    PYRAMID: 'pyramid',
    VOLCANO: 'volcano',
    LAVA_FLOW: 'lava_flow',
    PLANET: 'planet',
    TREE: 'tree',
    CRYSTAL: 'crystal',
    MOON: 'moon',
    SUNRAY: 'sunray',
    SEAWEED: 'seaweed',
    HEATWAVE: 'heatwave',
    DUNE: 'dune',
    NEBULA: 'nebula',
    MUSHROOM: 'mushroom',
    SUN: 'sun',
    CRYSTAL_HANGING: 'crystal_hanging',
    CRYSTAL_FLOOR: 'crystal_floor',
    GIANT_MUSHROOM: 'giant_mushroom',
    AURORA_WAVE: 'aurora_wave',
    CELESTIAL: 'celestial',
    SIMPLE_SHAPE: 'simple_shape'
};
